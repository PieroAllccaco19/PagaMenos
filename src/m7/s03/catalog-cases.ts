// M7 V1.1 — S03 verification bootstrap: exact-set catalog verification, VBA-SC-5 control-plane checks,
// T-78 (§25.9) and family P T-130 … T-137b (§25.17, T-137 as amended by Erratum 03 E03-07).
//
// Verification tooling only. Every expected verifier row is built from the accepted case text and the
// pre-derived signatures of E — never from a verifier observation (VBA-AX-2).
import { createHash } from 'node:crypto';

import type { CaseResult } from './evidence';
import {
  ACTOR_ROLE,
  type VerificationContext,
  acceptedStatement,
  addConstraintFromTable,
  attempt,
  createOrReplace,
  injection,
} from './verification';

/** A well-formed digest that is not the fixture digest (VBA-SC-5), deterministic. */
export function otherWellFormedDigest(fixtureDigest: string): string {
  let n = 0;
  for (;;) {
    const d = `sha256:${createHash('sha256').update(`s03-verification-bootstrap/other-digest/${n}`).digest('hex')}`;
    if (d !== fixtureDigest) return d;
    n += 1;
  }
}

/** VBA-SC-1 item 2 and VBA-SC-5 (work-package §22): the D03-12 closure predicates. */
export async function runControlPlaneChecks(ctx: VerificationContext): Promise<{
  verifierZero: boolean;
  assertSuccess: boolean;
  otherDigestMismatch: boolean;
}> {
  const worker = await ctx.session(ACTOR_ROLE.worker, 'worker-verifier');
  const v = await ctx.verifyAsWorker();
  ctx.record({
    id: 'VBCP-VERIFY-ZERO',
    clause: 'VBA-01 VBA-SC-1 item 2; V1.1 §19.13.2 exact-set catalog verification',
    actor: 'worker',
    session: worker.identity,
    operation: 'SELECT * FROM m7.w_verify_control_plane_catalog_v1(<fixtureDigest>)',
    expected: 'zero rows',
    observed: v.ok
      ? `${v.violations.length} row(s)${v.violations.length ? `: ${v.violations.join(' | ')}` : ''}`
      : `SQLSTATE ${v.sqlstate}: ${v.message}`,
    sqlstate: v.sqlstate,
    verdict: v.ok && v.violations.length === 0 ? 'PASS' : 'FAIL',
  });
  const other = otherWellFormedDigest(ctx.fixtureDigest);
  const ok = await ctx.asOwner(async (c, id) => ({
    id,
    r: await attempt(c, 'SELECT (m7.i_assert_control_plane($1)).*', [ctx.fixtureDigest]),
    bad: await attempt(c, 'SELECT (m7.i_assert_control_plane($1)).*', [other]),
    nul: await attempt(c, 'SELECT (m7.i_assert_control_plane(NULL)).*'),
  }));
  const assertSuccess =
    ok.r.ok &&
    ok.r.rows.length === 1 &&
    ok.r.rows[0]!.manifestVersion !== undefined &&
    ok.r.rows[0]!.retiredAt === null;
  ctx.record({
    id: 'VBCP-ASSERT-FIXTURE-DIGEST',
    clause: 'VBA-01 VBA-SC-5; V1.1 §19.11.1 m7.i_assert_control_plane',
    actor: 'owner-class (executing as pagamenos_m7_owner)',
    session: ok.id,
    operation: 'SELECT (m7.i_assert_control_plane(<fixtureDigest>)).*',
    expected: 'success: exactly the one active installation row',
    observed: ok.r.ok
      ? `${ok.r.rows.length} row(s); manifestVersion=${String(ok.r.rows[0]?.manifestVersion)}`
      : `SQLSTATE ${ok.r.sqlstate}: ${ok.r.message}`,
    sqlstate: ok.r.sqlstate,
    verdict: assertSuccess ? 'PASS' : 'FAIL',
  });
  const otherDigestMismatch =
    ok.bad.sqlstate === '55000' && ok.bad.message === 'M7_CONTROL_PLANE_MISMATCH';
  ctx.record({
    id: 'VBCP-ASSERT-OTHER-DIGEST',
    clause: 'VBA-01 VBA-SC-5',
    actor: 'owner-class (executing as pagamenos_m7_owner)',
    session: ok.id,
    operation: `SELECT (m7.i_assert_control_plane('${other}')).*`,
    expected: '55000 M7_CONTROL_PLANE_MISMATCH',
    observed: ok.bad.ok ? 'succeeded' : `SQLSTATE ${ok.bad.sqlstate}: ${ok.bad.message}`,
    sqlstate: ok.bad.sqlstate,
    verdict: otherDigestMismatch ? 'PASS' : 'FAIL',
  });
  ctx.record({
    id: 'VBCP-ASSERT-NULL-DIGEST',
    clause: 'VBA-01 VBA-SC-5 (supplementary: NULL digest)',
    actor: 'owner-class (executing as pagamenos_m7_owner)',
    session: ok.id,
    operation: 'SELECT (m7.i_assert_control_plane(NULL)).*',
    expected: '55000 M7_CONTROL_PLANE_MISMATCH',
    observed: ok.nul.ok ? 'succeeded' : `SQLSTATE ${ok.nul.sqlstate}: ${ok.nul.message}`,
    sqlstate: ok.nul.sqlstate,
    verdict:
      ok.nul.sqlstate === '55000' && ok.nul.message === 'M7_CONTROL_PLANE_MISMATCH'
        ? 'PASS'
        : 'FAIL',
  });
  const wv = await ctx.verifyAsWorker(other);
  ctx.record({
    id: 'VBCP-VERIFY-OTHER-DIGEST',
    clause: 'VBA-01 VBA-SC-5 (through the worker verifier entry point)',
    actor: 'worker',
    session: worker.identity,
    operation: 'SELECT * FROM m7.w_verify_control_plane_catalog_v1(<other well-formed digest>)',
    expected: '55000 M7_CONTROL_PLANE_MISMATCH',
    observed: wv.ok
      ? `succeeded (${wv.violations.length} rows)`
      : `SQLSTATE ${wv.sqlstate}: ${wv.message}`,
    sqlstate: wv.sqlstate,
    verdict:
      wv.sqlstate === '55000' && wv.message === 'M7_CONTROL_PLANE_MISMATCH' ? 'PASS' : 'FAIL',
  });
  return { verifierZero: v.ok && v.violations.length === 0, assertSuccess, otherDigestMismatch };
}

/** T-78 and the reversible §25.17 cases, in the committed disposable database. */
export async function runReversibleInjections(
  ctx: VerificationContext,
  legacyRole: string,
): Promise<void> {
  const sig = (name: string) => ctx.fn(name).signature;
  const A = ACTOR_ROLE;
  const t78 = 'V1.1 §25.9 T-78 (M7-I75)';
  const bodyEdit = (name: string) => {
    const f = ctx.fn(name);
    return createOrReplace(f, `${f.body}-- s03-verification-bootstrap injected body edit\n`);
  };

  await injection(ctx, {
    id: 'T-78/definer-flip',
    clause: t78,
    injectActor: 'owner-class',
    inject: `ALTER FUNCTION ${sig('w_list_deletion_sla_v1')} SECURITY INVOKER`,
    reverse: `ALTER FUNCTION ${sig('w_list_deletion_sla_v1')} SECURITY DEFINER`,
    expectedRows: [`FN-DRIFT: ${sig('w_list_deletion_sla_v1')}`],
  });
  await injection(ctx, {
    id: 'T-78/proconfig-drop-lock-timeout',
    clause: t78,
    injectActor: 'owner-class',
    inject: `ALTER FUNCTION ${sig('w_list_artifacts_for_audit_v1')} RESET lock_timeout`,
    reverse: `ALTER FUNCTION ${sig('w_list_artifacts_for_audit_v1')} SET lock_timeout = '5s'`,
    expectedRows: [`FN-DRIFT: ${sig('w_list_artifacts_for_audit_v1')}`],
  });
  await injection(ctx, {
    id: 'T-78/add-grant',
    clause: t78,
    injectActor: 'owner-class',
    inject: `GRANT EXECUTE ON FUNCTION ${sig('p_lookup_outcome_receipt_v1')} TO ${A.issuer}`,
    reverse: `REVOKE EXECUTE ON FUNCTION ${sig('p_lookup_outcome_receipt_v1')} FROM ${A.issuer}`,
    expectedRows: [`GRANT-EXTRA: ${sig('p_lookup_outcome_receipt_v1')} -> ${A.issuer}`],
  });
  await injection(ctx, {
    id: 'T-78/remove-grant',
    clause: t78,
    injectActor: 'owner-class',
    inject: `REVOKE EXECUTE ON FUNCTION ${sig('s_revoke_participant_session_v1')} FROM ${A.issuer}`,
    reverse: `GRANT EXECUTE ON FUNCTION ${sig('s_revoke_participant_session_v1')} TO ${A.issuer}`,
    expectedRows: [`GRANT-MISSING: ${sig('s_revoke_participant_session_v1')} -> ${A.issuer}`],
  });
  await injection(ctx, {
    id: 'T-78/body-edit',
    clause: t78,
    injectActor: 'owner-class',
    inject: bodyEdit('w_sweep_superseded_generations_v1'),
    reverse: createOrReplace(ctx.fn('w_sweep_superseded_generations_v1')),
    expectedRows: [`FN-DRIFT: ${sig('w_sweep_superseded_generations_v1')}`],
    note: 'body edit = the accepted body with one appended SQL comment line; reversal = the accepted statement as CREATE OR REPLACE',
  });

  const p = 'V1.1 §25.17';
  await injection(ctx, {
    id: 'T-130',
    clause: `${p} T-130`,
    injectActor: 'owner-class',
    inject: `GRANT SELECT ("statusLabel") ON m7.m7_outcome_assertion TO ${A.participant}`,
    reverse: `REVOKE SELECT ("statusLabel") ON m7.m7_outcome_assertion FROM ${A.participant}`,
    expectedRows: [`COL-ACL: m7_outcome_assertion.statusLabel -> ${A.participant} SELECT`],
  });
  await injection(ctx, {
    id: 'T-131',
    clause: `${p} T-131`,
    injectActor: 'owner-class',
    inject: `REVOKE EXECUTE ON FUNCTION ${sig('p_record_outcome_assertion_v1')} FROM ${A.participant}`,
    reverse: `GRANT EXECUTE ON FUNCTION ${sig('p_record_outcome_assertion_v1')} TO ${A.participant}`,
    expectedRows: [`GRANT-MISSING: ${sig('p_record_outcome_assertion_v1')} -> ${A.participant}`],
  });
  await injection(ctx, {
    id: 'T-132',
    clause: `${p} T-132`,
    injectActor: 'owner-class',
    inject: `GRANT EXECUTE ON FUNCTION ${sig('w_execute_row_purge_v1')} TO ${A.participant}`,
    reverse: `REVOKE EXECUTE ON FUNCTION ${sig('w_execute_row_purge_v1')} FROM ${A.participant}`,
    expectedRows: [`GRANT-EXTRA: ${sig('w_execute_row_purge_v1')} -> ${A.participant}`],
    note: 'the grantee (participant) does not hold the mint function, so no IA-06 row is expected',
  });
  await injection(ctx, {
    id: 'T-133/member-extra',
    clause: `${p} T-133 (first clause)`,
    injectActor: 'bootstrap-admin',
    inject: `GRANT ${ctx.catalog.ownerRole} TO ${legacyRole}`,
    reverse: `REVOKE ${ctx.catalog.ownerRole} FROM ${legacyRole}`,
    expectedRows: [`MEMBER-EXTRA: ${ctx.catalog.ownerRole} <- ${legacyRole}`],
    note: 'VBA-TX-3: GRANT of pagamenos_m7_owner needs ADMIN OPTION, which no conforming owner-class role holds',
  });
  await injection(ctx, {
    id: 'T-134/drop-trigger',
    clause: `${p} T-134 (first sub-case)`,
    injectActor: 'owner-class',
    inject: 'DROP TRIGGER m7_outcome_assertion_a_guard_insert ON m7.m7_outcome_assertion',
    reverse: acceptedStatement(ctx, 'TRIGGER', 'm7_outcome_assertion_a_guard_insert'),
    expectedRows: ['OBJ-MISSING: TRIGGER m7_outcome_assertion.m7_outcome_assertion_a_guard_insert'],
  });
  await injection(ctx, {
    id: 'T-134/drop-constraint',
    clause: `${p} T-134 (second sub-case)`,
    injectActor: 'owner-class',
    inject:
      'ALTER TABLE m7.m7_evidence_artifact DROP CONSTRAINT m7_evidence_artifact_generation_fkey',
    reverse: addConstraintFromTable(
      ctx,
      'm7_evidence_artifact',
      'm7_evidence_artifact_generation_fkey',
    ),
    expectedRows: [
      'OBJ-MISSING: CONSTRAINT m7_evidence_artifact.m7_evidence_artifact_generation_fkey',
    ],
  });
  await injection(ctx, {
    id: 'T-134/drop-index',
    clause: `${p} T-134 (third sub-case)`,
    injectActor: 'owner-class',
    inject: 'DROP INDEX m7.m7_storage_outbox_one_open_effect',
    reverse: acceptedStatement(ctx, 'INDEX', 'm7_storage_outbox_one_open_effect'),
    expectedRows: ['OBJ-MISSING: INDEX m7_storage_outbox.m7_storage_outbox_one_open_effect'],
  });
  await injection(ctx, {
    id: 'T-134/extra-index',
    clause: `${p} T-134 ("adding an unexpected index yields OBJ-EXTRA")`,
    injectActor: 'owner-class',
    inject: 'CREATE INDEX s03_verification_bootstrap_extra_idx ON m7.m7_outcome ("createdAt")',
    reverse: 'DROP INDEX m7.s03_verification_bootstrap_extra_idx',
    expectedRows: ['OBJ-EXTRA: INDEX m7_outcome.s03_verification_bootstrap_extra_idx'],
  });
  await injection(ctx, {
    id: 'T-135/body',
    clause: `${p} T-135 (first sub-case)`,
    injectActor: 'owner-class',
    inject: bodyEdit('i_require_session'),
    reverse: createOrReplace(ctx.fn('i_require_session')),
    expectedRows: [`FN-DRIFT: ${sig('i_require_session')}`],
  });
  await injection(ctx, {
    id: 'T-135/security-invoker',
    clause: `${p} T-135 (second sub-case)`,
    injectActor: 'owner-class',
    inject: `ALTER FUNCTION ${sig('w_list_storage_scopes_for_sweep_v1')} SECURITY INVOKER`,
    reverse: `ALTER FUNCTION ${sig('w_list_storage_scopes_for_sweep_v1')} SECURITY DEFINER`,
    expectedRows: [`FN-DRIFT: ${sig('w_list_storage_scopes_for_sweep_v1')}`],
  });
  await injection(ctx, {
    id: 'T-135/reset-lock-timeout',
    clause: `${p} T-135 (third sub-case)`,
    injectActor: 'owner-class',
    inject: `ALTER FUNCTION ${sig('i_request_hash')} RESET lock_timeout`,
    reverse: `ALTER FUNCTION ${sig('i_request_hash')} SET lock_timeout = '5s'`,
    expectedRows: [`FN-DRIFT: ${sig('i_request_hash')}`],
  });
  await injection(ctx, {
    id: 'T-135/extra-function',
    clause: `${p} T-135 (fourth sub-case; E03 §6 note: exactly FN-EXTRA)`,
    injectActor: 'owner-class',
    inject: 'CREATE FUNCTION m7.x_extra() RETURNS void LANGUAGE plpgsql AS $x$BEGIN END$x$',
    reverse: 'DROP FUNCTION m7.x_extra()',
    expectedRows: ['FN-EXTRA: m7.x_extra()'],
  });
  await injection(ctx, {
    id: 'T-135/drop-function',
    clause: `${p} T-135 ("dropping a function yields FN-MISSING")`,
    injectActor: 'owner-class',
    inject: `DROP FUNCTION ${sig('i_evidence_request_hash')}`,
    reverse: ctx.fn('i_evidence_request_hash').statement,
    expectedRows: [`FN-MISSING: ${sig('i_evidence_request_hash')}`],
    note: 'i_evidence_request_hash holds no login grant and no view depends on it; reversal = its accepted statement',
  });
  await injection(ctx, {
    id: 'T-136/schema-public',
    clause: `${p} T-136 (first sub-case)`,
    injectActor: 'owner-class',
    inject: 'GRANT USAGE ON SCHEMA m7 TO PUBLIC',
    reverse: 'REVOKE USAGE ON SCHEMA m7 FROM PUBLIC',
    expectedRows: ['SCHEMA-ACL-EXTRA: PUBLIC USAGE'],
  });
  await injection(ctx, {
    id: 'T-136/schema-worker-revoked',
    clause: `${p} T-136 (second sub-case)`,
    injectActor: 'owner-class',
    inject: `REVOKE USAGE ON SCHEMA m7 FROM ${A.worker}`,
    reverse: `GRANT USAGE ON SCHEMA m7 TO ${A.worker}`,
    expectedRows: [`SCHEMA-ACL-MISSING: ${A.worker} USAGE`],
    verifierActor: 'owner-class',
    note: 'with USAGE on m7 revoked from the worker, the worker cannot reach the verifier; the owner-class actor calls it',
  });
  await injection(ctx, {
    id: 'T-136/default-acl',
    clause: `${p} T-136 (third sub-case)`,
    injectActor: 'owner-class',
    inject: 'ALTER DEFAULT PRIVILEGES IN SCHEMA m7 GRANT SELECT ON TABLES TO PUBLIC',
    reverse: 'ALTER DEFAULT PRIVILEGES IN SCHEMA m7 REVOKE SELECT ON TABLES FROM PUBLIC',
    expectedRows: ['DEFACL: r -> PUBLIC SELECT'],
  });
  await injection(ctx, {
    id: 'T-136/sequence',
    clause: `${p} T-136 (fourth sub-case)`,
    injectActor: 'owner-class',
    inject: async (c) => {
      await c.query('CREATE SEQUENCE m7.s03_verification_bootstrap_seq');
      await c.query(
        `GRANT USAGE ON SEQUENCE m7.s03_verification_bootstrap_seq TO ${A.participant}`,
      );
    },
    reverse: 'DROP SEQUENCE m7.s03_verification_bootstrap_seq',
    expectedRows: [
      'REL-EXTRA: s03_verification_bootstrap_seq',
      `REL-ACL: s03_verification_bootstrap_seq -> ${A.participant} USAGE`,
    ],
    note: `CREATE SEQUENCE m7.s03_verification_bootstrap_seq; GRANT USAGE ON SEQUENCE … TO ${A.participant}`,
  });
  await injection(ctx, {
    id: 'T-137',
    clause: `${p} T-137 as amended by Erratum 03 E03-07`,
    injectActor: 'owner-class',
    inject: `GRANT EXECUTE ON FUNCTION ${sig('c_activate_manifest_v1')} TO ${A.worker}`,
    reverse: `REVOKE EXECUTE ON FUNCTION ${sig('c_activate_manifest_v1')} FROM ${A.worker}`,
    expectedRows: [
      `GRANT-EXTRA: ${sig('c_activate_manifest_v1')} -> ${A.worker}`,
      `RS-8: ${sig('c_activate_manifest_v1')} -> ${A.worker}`,
    ],
  });
  await injection(ctx, {
    id: 'T-137b/trigger-disabled',
    clause: `${p} T-137b (first sub-case)`,
    injectActor: 'owner-class',
    inject:
      'ALTER TABLE m7.m7_outcome_assertion DISABLE TRIGGER m7_outcome_assertion_a_guard_insert',
    reverse:
      'ALTER TABLE m7.m7_outcome_assertion ENABLE TRIGGER m7_outcome_assertion_a_guard_insert',
    expectedRows: ['TRG-DISABLED: m7_outcome_assertion_a_guard_insert'],
  });
  await injection(ctx, {
    id: 'T-137b/role-drift',
    clause: `${p} T-137b (second sub-case)`,
    injectActor: 'bootstrap-admin',
    inject: `ALTER ROLE ${A.participant} INHERIT`,
    reverse: `ALTER ROLE ${A.participant} NOINHERIT`,
    expectedRows: [`ROLE-DRIFT: ${A.participant}`],
    note: 'VBA-TX-3: a role-attribute change needs CREATEROLE, which no conforming owner-class role holds',
  });
}

/** T-137b third sub-case, in its own freshly installed disposable database (not reversible). */
export async function runT137bRetiredProfile(
  ctx: VerificationContext,
  storageProfileVersion: string,
): Promise<void> {
  await injection(ctx, {
    id: 'T-137b/retired-profile',
    clause: 'V1.1 §25.17 T-137b (third sub-case)',
    injectActor: 'owner-class',
    inject: async (c) => {
      await c.query('BEGIN');
      await c.query(
        `SELECT pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true)`,
      );
      await c.query(
        `UPDATE m7.m7_storage_profile SET "retiredAt" = pg_catalog.clock_timestamp(), "retiredBy" = session_user
          WHERE "storageProfileVersion" = $1`,
        [storageProfileVersion],
      );
      await c.query('COMMIT');
    },
    reverse: null,
    expectedRows: ['IA-13: active manifest storage profile or backend retired'],
    note: 'retired "behind the guards": a direct owner-class UPDATE that satisfies t_storage_profile_guard but bypasses c_retire_storage_profile_v1 (RT-1); retirement is one-way, so the case runs in its own fresh database',
  });
}

/** T-133 second clause: REVOKE of the migration role's membership. Terminal for the cluster. */
export async function runT133MemberMissing(
  ctx: VerificationContext,
): Promise<CaseResult | undefined> {
  await injection(ctx, {
    id: 'T-133/member-missing',
    clause: 'V1.1 §25.17 T-133 (second clause)',
    injectActor: 'bootstrap-admin',
    inject: `REVOKE ${ctx.catalog.ownerRole} FROM ${ctx.migrationRole}`,
    reverse: null,
    expectedRows: [`MEMBER-MISSING: ${ctx.catalog.ownerRole} <- ${ctx.migrationRole}`],
    note: 'terminal: not reversed (no re-grant inside S03, work-package §8); the cluster is destroyed next',
  });
  return ctx.results.at(-1);
}
