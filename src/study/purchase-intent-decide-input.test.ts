import { describe, expect, it } from 'vitest';

import { loadCorpus } from '@/corpus';

import { normalizeEligibilityPortfolioV1 } from './eligibility-portfolio';
import {
  buildDecideInputFromFinalizedAuthorities,
  computeDecideInputHash,
  flattenToPurchaseContext,
  normalizeA2PurchaseSignatureV1,
  type A2PurchaseSignature,
} from './purchase-intent-decide-input';
import { PurchaseIntentContextSignatureError } from './purchase-intent-errors';
import {
  appendContextRequestHash,
  createPurchaseIntentRequestHash,
} from './purchase-intent-request-hash';
import { A2_HOLIDAY_CALENDAR_FIXTURE_V1 } from './holiday-fixture';

const merchant = 'm_fridays';
const billRaw = {
  kind: 'BILL',
  merchantId: merchant,
  channel: 'SALON',
  wholeBillCentimos: 10000,
  foodCentimos: 8000,
  nonAlcoholicBeverageCentimos: 1500,
  purchaseDomain: 'RESTAURANT_BILL',
};

describe('A2 complete-signature normalization (§3)', () => {
  it('normalizes a complete BILL signature', () => {
    const sig = normalizeA2PurchaseSignatureV1(billRaw);
    expect(sig.kind).toBe('BILL');
    expect(sig.merchantId).toBe(merchant);
  });
  it('rejects mixed signatures (BILL + ticket fields)', () => {
    expect(() => normalizeA2PurchaseSignatureV1({ ...billRaw, ticketCount: 2 })).toThrow(
      PurchaseIntentContextSignatureError,
    );
  });
  it('rejects EXACT_ITEMS carrying wholeBill (one complete-signature authority)', () => {
    expect(() =>
      normalizeA2PurchaseSignatureV1({
        kind: 'EXACT_ITEMS',
        merchantId: merchant,
        exactItems: [{ itemKey: 'x', qty: 1 }],
        wholeBillCentimos: 1,
      }),
    ).toThrow(PurchaseIntentContextSignatureError);
  });
  it('rejects incomplete BILL (missing purchaseDomain)', () => {
    const noDomain: Record<string, unknown> = { ...billRaw };
    delete noDomain['purchaseDomain'];
    expect(() => normalizeA2PurchaseSignatureV1(noDomain)).toThrow(
      PurchaseIntentContextSignatureError,
    );
  });
  it('rejects unknown merchant / domain / channel', () => {
    expect(() => normalizeA2PurchaseSignatureV1({ ...billRaw, merchantId: 'm_nope' })).toThrow();
    expect(() => normalizeA2PurchaseSignatureV1({ ...billRaw, purchaseDomain: 'NOPE' })).toThrow();
    expect(() => normalizeA2PurchaseSignatureV1({ ...billRaw, channel: 'NOPE' })).toThrow();
  });
  it('EXACT_ITEMS dedup/sort is deterministic and rejects duplicate itemKey', () => {
    const sig = normalizeA2PurchaseSignatureV1({
      kind: 'EXACT_ITEMS',
      merchantId: merchant,
      exactItems: [
        { itemKey: 'b', qty: 1 },
        { itemKey: 'a', qty: 2 },
      ],
    }) as Extract<A2PurchaseSignature, { kind: 'EXACT_ITEMS' }>;
    expect(sig.exactItems.map((i) => i.itemKey)).toEqual(['a', 'b']);
    expect(() =>
      normalizeA2PurchaseSignatureV1({
        kind: 'EXACT_ITEMS',
        merchantId: merchant,
        exactItems: [
          { itemKey: 'a', qty: 1 },
          { itemKey: 'a', qty: 2 },
        ],
      }),
    ).toThrow(PurchaseIntentContextSignatureError);
  });
});

describe('A2 DecideInput freeze determinism (§11/§12)', () => {
  const build = () =>
    buildDecideInputFromFinalizedAuthorities({
      signature: normalizeA2PurchaseSignatureV1(billRaw),
      intendedTransactionAt: '2026-07-28T12:00:00-05:00',
      portfolio: normalizeEligibilityPortfolioV1({
        instruments: [{ family: 'IBK_PLIN', memberships: ['B', 'A'] }],
      }),
      corpus: loadCorpus(),
      evaluatedAt: '2026-07-20T09:00:00-05:00',
      holidayCalendar: A2_HOLIDAY_CALENDAR_FIXTURE_V1.normalizedDates,
    });

  it('produces a byte-identical DecideInput + hash across builds (deterministic)', () => {
    const a = build();
    const b = build();
    expect(computeDecideInputHash(a)).toBe(computeDecideInputHash(b));
    // validates under engineInputV1Schema (build would have thrown otherwise)
    expect(a.context.merchantId).toBe(merchant);
    expect(a.holidayCalendar).toEqual([...A2_HOLIDAY_CALENDAR_FIXTURE_V1.normalizedDates]);
    expect(a.selectedScopeId).toBeUndefined();
    expect(a.baselineByScopeId).toBeUndefined();
  });

  it('flatten maps BILL fields into PurchaseContext', () => {
    const ctx = flattenToPurchaseContext(normalizeA2PurchaseSignatureV1(billRaw));
    expect(ctx.wholeBillCentimos).toBe(10000);
    expect(ctx.purchaseDomain).toBe('RESTAURANT_BILL');
    expect(ctx.ticketCount).toBeUndefined();
  });
});

describe('A2 request hashes (§25)', () => {
  it('are deterministic and change on material difference', () => {
    const ctx = { participantId: 'p1' };
    const h1 = createPurchaseIntentRequestHash({
      intentCaptureKey: 'k',
      intentType: 'BUYING_NOW',
      context: ctx,
    });
    const h2 = createPurchaseIntentRequestHash({
      intentCaptureKey: 'k',
      intentType: 'BUYING_NOW',
      context: ctx,
    });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(
      createPurchaseIntentRequestHash({
        intentCaptureKey: 'k',
        intentType: 'EXPLORATORY',
        context: ctx,
      }),
    );
    expect(h1).not.toBe(
      createPurchaseIntentRequestHash({
        intentCaptureKey: 'k',
        intentType: 'BUYING_NOW',
        context: { participantId: 'p2' },
      }),
    );
    const sig = normalizeA2PurchaseSignatureV1(billRaw);
    const c1 = appendContextRequestHash({
      intentId: 'i',
      contextCaptureKey: 'c',
      contextSchemaVersion: 'v',
      intendedTransactionAt: 't',
      signature: sig,
      context: ctx,
    });
    const sig2 = normalizeA2PurchaseSignatureV1({ ...billRaw, wholeBillCentimos: 20000 });
    const c2 = appendContextRequestHash({
      intentId: 'i',
      contextCaptureKey: 'c',
      contextSchemaVersion: 'v',
      intendedTransactionAt: 't',
      signature: sig2,
      context: ctx,
    });
    expect(c1).not.toBe(c2);
  });
});
