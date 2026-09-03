// PagaMenos · services — decide-and-persist orchestration tests (DB-free; §14/§15/§21).
//
// Uses an in-memory DecisionPersistenceStore double, so this runs in the standard offline suite. The
// REAL idempotency / business-uniqueness / immutability semantics are proven against actual
// PostgreSQL in the integration suite. Here we prove ORCHESTRATION: adversarial input is rejected up
// front, input is parsed once, providers are constructed lazily, trusted provenance is used, and the
// PUBLIC API cannot inject dependencies (P35A-05).
import { describe, expect, it } from 'vitest';

import { canonicalHash } from '@/persistence/hash';
import {
  corpusV1ProvenanceProvider,
  fixedCorpusProvenanceProvider,
} from '@/persistence/provenance';
import type {
  AttachAliasArgs,
  CreateDecisionArgs,
  DecisionPersistenceStore,
  DecisionReceiptRecord,
  DecisionSnapshotDraft,
} from '@/persistence/snapshot';
import type { DecisionSnapshotDto } from '@/persistence/schema';

import {
  chinawokInput,
  CORPUS_VERSION,
  testBuildProvider,
} from '../persistence/__fixtures__/decision-fixture';
import {
  decideAndPersist,
  decideAndPersistWithDeps,
  loadDecisionSnapshotWithDeps,
} from './decide-and-persist';

class InMemoryStore implements DecisionPersistenceStore {
  readonly created: DecisionSnapshotDraft[] = [];
  private readonly snapshotsById = new Map<string, DecisionSnapshotDto>();
  private readonly snapshotsByBiz = new Map<string, DecisionSnapshotDto>();
  private readonly receipts = new Map<string, DecisionReceiptRecord>();
  private seq = 0;

  private key(scope: string, k: string): string {
    return `${scope} ${k}`;
  }

  async findReceipt(operationScope: string, idempotencyKey: string) {
    return this.receipts.get(this.key(operationScope, idempotencyKey)) ?? null;
  }
  async findSnapshotById(id: string) {
    return this.snapshotsById.get(id) ?? null;
  }
  async findSnapshotByBusinessKey(businessDecisionKey: string) {
    return this.snapshotsByBiz.get(businessDecisionKey) ?? null;
  }
  async readHistoricalObservation(args: {
    operationScope: string;
    idempotencyKey: string;
    businessDecisionKey: string;
  }) {
    // Single-threaded double: plain reads already observe one consistent state.
    const receipt = this.receipts.get(this.key(args.operationScope, args.idempotencyKey)) ?? null;
    const snapshotByBusinessKey = this.snapshotsByBiz.get(args.businessDecisionKey) ?? null;
    const snapshotByReceipt = receipt
      ? (this.snapshotsById.get(receipt.decisionSnapshotId) ?? null)
      : null;
    return { receipt, snapshotByReceipt, snapshotByBusinessKey };
  }

  async createDecision(args: CreateDecisionArgs): Promise<DecisionSnapshotDto> {
    const { draft, operationScope, idempotencyKey, requestHash } = args;
    this.created.push(draft);
    const id = `id-${++this.seq}`;
    const dto = {
      ...draft,
      id,
      createdAt: '2026-09-01T17:00:00.000Z',
    } as unknown as DecisionSnapshotDto;
    this.snapshotsById.set(id, dto);
    this.snapshotsByBiz.set(draft.businessDecisionKey, dto);
    this.receipts.set(this.key(operationScope, idempotencyKey), {
      operationScope,
      idempotencyKey,
      requestHash,
      decisionSnapshotId: id,
    });
    return dto;
  }

  async attachAliasReceipt(args: AttachAliasArgs): Promise<DecisionSnapshotDto> {
    const { operationScope, idempotencyKey, requestHash, snapshot } = args;
    this.receipts.set(this.key(operationScope, idempotencyKey), {
      operationScope,
      idempotencyKey,
      requestHash,
      decisionSnapshotId: snapshot.id,
    });
    return snapshot;
  }
}

function deps(store: InMemoryStore) {
  return {
    repository: store,
    corpusProvenanceFactory: () => fixedCorpusProvenanceProvider(CORPUS_VERSION),
    buildProviderFactory: () => testBuildProvider(),
  };
}

describe('decideAndPersistWithDeps — orchestration', () => {
  it('validates input, runs the engine once, and persists a coherent immutable draft', async () => {
    const store = new InMemoryStore();
    const dto = await decideAndPersistWithDeps(
      { input: chinawokInput(), businessDecisionKey: 'bdk-svc-1', idempotencyKey: 'idem-svc-1' },
      deps(store),
    );

    expect(store.created).toHaveLength(1);
    const draft = store.created[0]!;
    expect(draft.merchantId).toBe('m_chinawok');
    expect(draft.decisionStatus).toBe('BEST_CONFIRMED');
    expect(draft.corpusVersion).toBe(CORPUS_VERSION);
    expect(draft.gitSha).toBe('0123456789abcdef0123456789abcdef01234567');
    expect(draft.buildId).toBe('itest');
    expect(draft.inputHash).toBe(canonicalHash(draft.engineInputJson));
    expect(draft.outputHash).toBe(canonicalHash(draft.engineOutputJson));
    await expect(
      loadDecisionSnapshotWithDeps(dto.id, { repository: store }),
    ).resolves.not.toBeNull();
  });

  it('uses the DEFAULT corpus provenance factory to verify real Corpus-v1 rules', async () => {
    const store = new InMemoryStore();
    const dto = await decideAndPersistWithDeps(
      {
        input: chinawokInput(),
        businessDecisionKey: 'bdk-svc-real',
        idempotencyKey: 'idem-svc-real',
      },
      { repository: store, buildProviderFactory: () => testBuildProvider() },
    );
    expect(dto.corpusVersion).toBe(CORPUS_VERSION);
  });

  it('rejects an incomplete Corpus-v1 candidate set (SIP-only) before persisting (§27/§33)', async () => {
    const store = new InMemoryStore();
    const input = chinawokInput();
    input.rules = input.rules.filter((r) => r.ruleId !== 'CW-PLIN-01');
    input.operationalStates = input.operationalStates.filter((o) => o.ruleId !== 'CW-PLIN-01');
    await expect(
      decideAndPersistWithDeps(
        { input, businessDecisionKey: 'bdk-inc', idempotencyKey: 'idem-inc' },
        {
          repository: store,
          corpusProvenanceFactory: () => corpusV1ProvenanceProvider(),
          buildProviderFactory: () => testBuildProvider(),
        },
      ),
    ).rejects.toThrow();
    expect(store.created).toHaveLength(0);
  });

  it('exact retry does NOT construct the corpus/build providers (§11)', async () => {
    const store = new InMemoryStore();
    let corpusFactoryCalls = 0;
    let buildFactoryCalls = 0;
    const d = {
      repository: store,
      corpusProvenanceFactory: () => {
        corpusFactoryCalls += 1;
        return fixedCorpusProvenanceProvider(CORPUS_VERSION);
      },
      buildProviderFactory: () => {
        buildFactoryCalls += 1;
        return testBuildProvider();
      },
    };
    const req = {
      input: chinawokInput(),
      businessDecisionKey: 'bdk-lazy',
      idempotencyKey: 'idem-lazy',
    };
    await decideAndPersistWithDeps(req, d);
    expect(corpusFactoryCalls).toBe(1);
    expect(buildFactoryCalls).toBe(1);
    await decideAndPersistWithDeps(req, d);
    expect(corpusFactoryCalls).toBe(1);
    expect(buildFactoryCalls).toBe(1);
  });

  it('rejects a secret-like key smuggled into the input before deciding (§19)', async () => {
    const store = new InMemoryStore();
    const tainted = chinawokInput();
    (tainted.context as unknown as Record<string, unknown>).cardNumber = '4111111111111111';
    await expect(
      decideAndPersistWithDeps(
        { input: tainted, businessDecisionKey: 'bdk-x', idempotencyKey: 'idem-x' },
        deps(store),
      ),
    ).rejects.toThrow();
    expect(store.created).toHaveLength(0);
  });

  it('rejects a non-plain (prototype toJSON) input before any persistence (§26)', async () => {
    const store = new InMemoryStore();
    const evil = Object.create({
      toJSON() {
        return { hacked: true };
      },
    }) as Record<string, unknown>;
    Object.assign(evil, chinawokInput());
    await expect(
      decideAndPersistWithDeps(
        { input: evil as never, businessDecisionKey: 'bdk-evil', idempotencyKey: 'idem-evil' },
        deps(store),
      ),
    ).rejects.toThrow();
    expect(store.created).toHaveLength(0);
  });

  it('fails closed when trusted build provenance cannot be resolved (§34)', async () => {
    const store = new InMemoryStore();
    const { envBuildMetadataProvider } = await import('@/persistence/provenance');
    await expect(
      decideAndPersistWithDeps(
        { input: chinawokInput(), businessDecisionKey: 'bdk-y', idempotencyKey: 'idem-y' },
        {
          repository: store,
          corpusProvenanceFactory: () => fixedCorpusProvenanceProvider(CORPUS_VERSION),
          buildProviderFactory: () => envBuildMetadataProvider({}),
        },
      ),
    ).rejects.toThrow();
    expect(store.created).toHaveLength(0);
  });
});

describe('public decideAndPersist — no dependency injection possible (P35A-05 §21/§24)', () => {
  it('takes exactly one argument (a provider/deps arg is a type error)', () => {
    const req = {
      input: chinawokInput(),
      businessDecisionKey: 'bdk-pub',
      idempotencyKey: 'idem-pub',
    };
    const fake = { verify: () => 'FORGED' };
    // The closure is never invoked (no DB in this suite); the point is the COMPILE error below.
    const guarded = (): unknown =>
      // @ts-expect-error the public API takes exactly one argument — dependencies cannot be injected.
      decideAndPersist(req, { corpusProvenanceFactory: () => fake });
    expect(typeof guarded).toBe('function');
  });

  it('the request type carries no provenance / provider / repository fields', () => {
    const req: Parameters<typeof decideAndPersist>[0] = {
      input: chinawokInput(),
      businessDecisionKey: 'bdk-t',
      idempotencyKey: 'idem-t',
    };
    // @ts-expect-error corpusVersion is trusted provenance, never a request field.
    req.corpusVersion = 'FORGED';
    // @ts-expect-error gitSha is trusted provenance, never a request field.
    req.gitSha = 'deadbeef';
    // @ts-expect-error a provider factory is never a request field.
    req.corpusProvenanceFactory = () => ({ verify: () => 'FORGED' });
    expect(req.businessDecisionKey).toBe('bdk-t');
  });
});
