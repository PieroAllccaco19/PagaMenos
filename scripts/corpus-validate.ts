// PagaMenos · offline corpus validation gate (M1). No network / DB / dev server.
// Runs: schema validation (shape) → semantic corpus lint → frozen reconciliation counts.
// Exits non-zero on any failure.
import { lintCorpus, loadCorpus, parseCorpus, reconcileCorpus } from '../src/corpus/index';

function main(): number {
  const corpus = loadCorpus();
  console.log(`Corpus: ${corpus.corpusId}`);
  console.log(`Freeze: ${corpus.freezeTimestamp}\n`);

  // 1. Schema (syntactic) validity — throws ZodError on failure.
  try {
    parseCorpus(corpus);
    console.log('[schema]  OK — corpus conforms to the Zod schema (strict, no superseded fields)');
  } catch (e) {
    console.error('[schema]  FAIL');
    console.error(e instanceof Error ? e.message : String(e));
    return 1;
  }

  // 2. Semantic corpus lint (fail-closed).
  const lintErrors = lintCorpus(corpus);
  if (lintErrors.length === 0) {
    console.log('[lint]    OK — 0 semantic errors');
  } else {
    console.error(`[lint]    FAIL — ${lintErrors.length} error(s):`);
    for (const e of lintErrors) {
      console.error(`  - [${e.code}] ${e.ruleId ?? e.scopeId ?? ''} ${e.message}`.trimEnd());
    }
  }

  // 3. Reconciliation against frozen targets.
  const r = reconcileCorpus(corpus);
  console.log('\n[reconcile]');
  console.log(
    `  merchants           = ${r.merchants} (food ${r.foodMerchants} / entertainment ${r.entertainmentMerchants})`,
  );
  console.log(`  active rules        = ${r.activeRules}`);
  console.log(
    `  provider dist       = IBK_PLIN ${r.providerDistribution.IBK_PLIN} · DINERS ${r.providerDistribution.DINERS} · BCP_QORE ${r.providerDistribution.BCP_QORE} · SIP_OH ${r.providerDistribution.SIP_OH}`,
  );
  console.log(`  provider-private    = ${r.providerPrivateOverlays}`);
  console.log(
    `  overlap             = O2 ${r.overlap.O2} · O3 ${r.overlap.O3} · O4_CONFIRMED ${r.overlap.O4_CONFIRMED}`,
  );
  console.log(
    `  decision            = CORE ${r.decision.DECISION_ENGINE_CORE} · ASSIST ${r.decision.DECISION_ASSIST} · DIRECTORY ${r.decision.DIRECTORY_SUFFICIENT}`,
  );
  console.log(`  excluded (history)  = ${r.excludedCount}`);
  console.log(`  stale Cineplanet active? ${r.staleCineplanetActive}`);

  if (r.mismatches.length > 0) {
    console.error('\n[reconcile] FAIL:');
    for (const m of r.mismatches) console.error(`  - ${m}`);
  } else {
    console.log('\n[reconcile] OK — all frozen counts match');
  }

  const ok = lintErrors.length === 0 && r.mismatches.length === 0;
  console.log(`\nRESULT: ${ok ? 'PASS' : 'FAIL'}`);
  return ok ? 0 : 1;
}

process.exit(main());
