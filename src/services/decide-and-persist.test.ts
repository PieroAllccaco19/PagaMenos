// PagaMenos · services — decide-and-persist orchestration tests (DB-free; §14/§15).
//
// Uses an in-memory DecisionSnapshotStore double, so this runs in the standard offline suite. The
// REAL idempotency / business-uniqueness / immutability semantics are proven against actual
// PostgreSQL in the integration suite (§25/§26/§32); here we prove the ORCHESTRATION: input is
// validated, the engine runs once, and the persisted draft carries the correct metadata & hashes.
import { describe, expect, it } from 'vitest';

import { canonicalHash } from '@/persistence';
import type {
  DecisionSnapshotDraft,
  DecisionSnapshotDto,
  DecisionSnapshotStore,
} from '@/persistence';

import { chinawokInput, CORPUS_VERSION } from '../persistence/__fixtures__/decision-fixture';
import { decideAndPersist, loadDecisionSnapshot } from './decide-and-persist';

class InMemoryStore implements DecisionSnapshotStore {
  readonly drafts: DecisionSnapshotDraft[] = [];
  private readonly byId = new Map<string, DecisionSnapshotDto>();
  private seq = 0;

  async persist(draft: DecisionSnapshotDraft): Promise<DecisionSnapshotDto> {
    this.drafts.push(draft);
    const id = `id-${++this.seq}`;
    const dto: DecisionSnapshotDto = {
      ...draft,
      id,
      createdAt: '2026-09-01T17:00:00.000Z',
    } as unknown as DecisionSnapshotDto;
    this.byId.set(id, dto);
    return dto;
  }

  async findById(id: string): Promise<DecisionSnapshotDto | null> {
    return this.byId.get(id) ?? null;
  }
}

const BUILD_SOURCE = { GIT_SHA: 'servicetestsha', BUILD_ID: 'svc-build' };

describe('decideAndPersist — orchestration', () => {
  it('validates input, runs the engine once, and persists a coherent immutable draft', async () => {
    const store = new InMemoryStore();
    const dto = await decideAndPersist(
      {
        input: chinawokInput(),
        businessDecisionKey: 'bdk-svc-1',
        idempotencyKey: 'idem-svc-1',
      },
      { repository: store, buildSource: BUILD_SOURCE },
    );

    expect(store.drafts).toHaveLength(1);
    const draft = store.drafts[0]!;
    // Output-derived metadata (§17/§21).
    expect(draft.merchantId).toBe('m_chinawok');
    expect(draft.decisionStatus).toBe('BEST_CONFIRMED');
    // Corpus label defaults to the loaded corpus (§6).
    expect(draft.corpusVersion).toBe(CORPUS_VERSION);
    // Build metadata resolved from the injected source (§9).
    expect(draft.gitSha).toBe('servicetestsha');
    expect(draft.buildId).toBe('svc-build');
    // Hash coherence (§8): stored hashes are the canonical hash of the stored payloads.
    expect(draft.inputHash).toBe(canonicalHash(draft.engineInputJson));
    expect(draft.outputHash).toBe(canonicalHash(draft.engineOutputJson));
    // The returned DTO round-trips through the integrity-checked loader.
    await expect(loadDecisionSnapshot(dto.id, { repository: store })).resolves.not.toBeNull();
  });

  it('honors an explicit corpusVersion override', async () => {
    const store = new InMemoryStore();
    await decideAndPersist(
      {
        input: chinawokInput(),
        businessDecisionKey: 'bdk-svc-2',
        idempotencyKey: 'idem-svc-2',
        corpusVersion: 'CUSTOM_CORPUS',
      },
      { repository: store, buildSource: BUILD_SOURCE },
    );
    expect(store.drafts[0]!.corpusVersion).toBe('CUSTOM_CORPUS');
  });

  it('rejects a secret-like key smuggled into the input before deciding (§19)', async () => {
    const store = new InMemoryStore();
    const tainted = chinawokInput();
    (tainted.context as unknown as Record<string, unknown>).cardNumber = '4111111111111111';
    await expect(
      decideAndPersist(
        { input: tainted, businessDecisionKey: 'bdk-x', idempotencyKey: 'idem-x' },
        { repository: store, buildSource: BUILD_SOURCE },
      ),
    ).rejects.toThrow();
    expect(store.drafts).toHaveLength(0);
  });

  it('fails closed when no gitSha is resolvable (§9)', async () => {
    const store = new InMemoryStore();
    await expect(
      decideAndPersist(
        { input: chinawokInput(), businessDecisionKey: 'bdk-y', idempotencyKey: 'idem-y' },
        { repository: store, buildSource: {} },
      ),
    ).rejects.toThrow();
    expect(store.drafts).toHaveLength(0);
  });
});
