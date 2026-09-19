// M7 V1.1 — S03 verification bootstrap: positive paths (VBA-01 VBA-SC-1 item 5) and T-74 … T-76.
//
// Verification tooling only. Every positive path runs through the role's own connection with the fixture
// digest as the expected digest. A path is EXECUTED only when its complete success criterion — database
// result and persisted state — is verifiable without a real object store, a real signer or a deployment;
// every path whose success needs an object-store fact (bytes, digest, ETag, listing, HEAD/DELETE outcome) or
// a signer outcome is NOT EXECUTED with its reason (VBA-SC-3). Expected values are the accepted function
// contracts plus the FIXED fixture values; identifiers returned by earlier calls are handles, not truth.
import { createHash } from 'node:crypto';

import type pg from 'pg';

import type { CaseResult, Verdict } from './evidence';
import { VBCP_FIXED_VALUES, VBCP_IDENTITIES, VBCP_MARKER, VBCP_MERCHANT_REFS } from './fixture';
import { ACTOR_ROLE, type AttemptResult, type VerificationContext, attempt } from './verification';

/** One A1/A2 participant built through the sanctioned services (scripts/m7/pg-m7-s03-a1a2.ts). */
export interface A1A2Participant {
  readonly label: string;
  readonly participantId: string;
  readonly assignmentId: string;
  readonly intentIds: readonly string[];
  readonly decisionBindingIds: readonly string[];
}

/** A deterministic 32-byte session secret per label (a disposable-database test handle). */
export function sessionSecret(label: string): Buffer {
  return createHash('sha256').update(`${VBCP_MARKER}/session-secret/${label}`).digest();
}

const policy = VBCP_FIXED_VALUES['m7.c_register_retention_policy_v1']!;
const backend = VBCP_FIXED_VALUES['m7.c_register_storage_backend_v1']!;
const profile = VBCP_FIXED_VALUES['m7.c_register_storage_profile_v1']!;

/** `SELECT * FROM m7.<fn>($1::t1, …)` with the accepted declared types. */
export async function callFn(
  ctx: VerificationContext,
  client: pg.Client,
  name: string,
  args: readonly unknown[],
): Promise<AttemptResult> {
  const f = ctx.fn(name);
  if (f.argNames.length !== args.length)
    throw new Error(`${name}: ${args.length} args for ${f.argNames.length}`);
  const sql = `SELECT * FROM m7.${name}(${f.declaredTypes.map((t, i) => `$${i + 1}::${t}`).join(', ')})`;
  return attempt(client, sql, args);
}

function v(pass: boolean): Verdict {
  return pass ? 'PASS' : 'FAIL';
}

function show(r: AttemptResult): string {
  return r.ok ? JSON.stringify(r.rows).slice(0, 600) : `SQLSTATE ${r.sqlstate}: ${r.message}`;
}

export interface ParticipantHandles {
  readonly fixture: A1A2Participant;
  readonly secret: Buffer;
  readonly sessionId: string;
}

export interface PositivePathState {
  readonly A: ParticipantHandles;
  readonly assertionId: string;
  readonly outcomeId: string;
}

let captureSeq = 0;
function captureKey(tag: string): string {
  captureSeq += 1;
  return `s03vb-${tag}-${String(captureSeq).padStart(4, '0')}-key`;
}

/** SO-1 material for a live ORIGINAL assertion naming a FIXED vocabulary merchant. */
function so1Args(
  ctx: VerificationContext,
  h: ParticipantHandles,
  intentId: string,
  key: string,
  idem: string,
) {
  return [
    ctx.fixtureDigest,
    h.secret,
    h.fixture.participantId,
    h.fixture.assignmentId,
    intentId,
    new Date(),
    key,
    idem,
    'ORIGINAL',
    null,
    'SELF_REPORTED',
    'REALIZED_PURCHASE',
    'VOCABULARY_MERCHANT',
    VBCP_MERCHANT_REFS[0],
    'LIMA_DATE',
    null,
    '2026-07-28',
  ];
}

export async function runPositivePaths(
  ctx: VerificationContext,
  participants: { A: A1A2Participant; B: A1A2Participant; C: A1A2Participant },
): Promise<PositivePathState> {
  const R = ACTOR_ROLE;
  const issuer = await ctx.session(R.issuer, 'issuer-pp');
  const part = await ctx.session(R.participant, 'participant-pp');
  const privacy = await ctx.session(R.privacy, 'privacy-pp');
  const authority = await ctx.session(R.authority, 'authority-pp');
  const worker = await ctx.session(R.worker, 'worker-pp');
  const rec = (r: Omit<CaseResult, 'clause'> & { clause?: string }, fnName: string) =>
    ctx.record({ clause: `VBA-01 VBA-SC-1 item 5; ${fnName} (V1.1 §19.11–§19.13)`, ...r });

  // ---- s_issue_participant_session_v1 (issuer) ----
  const issue = async (label: string, p: A1A2Participant): Promise<ParticipantHandles | null> => {
    const secret = sessionSecret(label);
    const handle = createHash('sha256').update(secret).digest();
    const r = await callFn(ctx, issuer.client, 's_issue_participant_session_v1', [
      ctx.fixtureDigest,
      p.participantId,
      handle,
    ]);
    const sessionId = r.ok ? String(r.rows[0]!.session_id) : '';
    let persisted = false;
    if (r.ok) {
      const row = (
        await ctx.inspect<{ ttl: string; pid: string; active: boolean }>(
          `SELECT ("expiresAt" - "issuedAt")::text AS ttl, "participantId"::text AS pid,
                  "installationId" = (SELECT "id" FROM m7.m7_control_plane_installation WHERE "retiredAt" IS NULL) AS active
             FROM m7.m7_participant_session WHERE "id" = $1`,
          [sessionId],
        )
      )[0];
      persisted =
        row !== undefined && row.pid === p.participantId && row.active && row.ttl === '01:00:00';
    }
    rec(
      {
        id: `PP-s_issue_participant_session_v1/${label}`,
        actor: 'issuer',
        session: issuer.identity,
        operation: `s_issue_participant_session_v1(<fixtureDigest>, participant ${p.label}, sha256(secret))`,
        expected: `one session row: participant ${p.label}, bound to the active installation, expiresAt − issuedAt = FIXED sessionTtl (${String(policy.p_session_ttl)})`,
        observed: `${show(r)}; persisted as expected=${persisted}`,
        sqlstate: r.sqlstate,
        verdict: v(r.ok && persisted),
      },
      'm7.s_issue_participant_session_v1',
    );
    return r.ok ? { fixture: p, secret, sessionId } : null;
  };
  const A = await issue('A', participants.A);
  const A2 = await issue('A-second', participants.A);
  const B = await issue('B', participants.B);
  const C = await issue('C', participants.C);
  if (!A || !A2 || !B || !C)
    throw new Error('positive paths: session issuance failed; downstream paths blocked');

  // ---- p_lock_and_prove_assignment_v1 ----
  {
    const r = await callFn(ctx, part.client, 'p_lock_and_prove_assignment_v1', [
      ctx.fixtureDigest,
      A.secret,
      A.fixture.participantId,
      A.fixture.assignmentId,
    ]);
    rec(
      {
        id: 'PP-p_lock_and_prove_assignment_v1',
        actor: 'participant',
        session: part.identity,
        operation:
          'p_lock_and_prove_assignment_v1(<fixtureDigest>, secret A, participant A, assignment A)',
        expected: 'completes (void): assignment owned, session valid',
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok),
      },
      'm7.p_lock_and_prove_assignment_v1',
    );
  }

  // ---- p_record_outcome_assertion_v1 (SO-1), replay, and p_lookup_outcome_receipt_v1 ----
  const intentA = A.fixture.intentIds[0]!;
  const keyA = captureKey('so1');
  const idemA = captureKey('idem');
  const argsA = so1Args(ctx, A, intentA, keyA, idemA);
  const so1 = await callFn(ctx, part.client, 'p_record_outcome_assertion_v1', argsA);
  const assertionId = so1.ok ? String(so1.rows[0]!.assertion_id) : '';
  const outcomeId = so1.ok ? String(so1.rows[0]!.outcome_id) : '';
  let stored = false;
  if (so1.ok) {
    const row = (
      await ctx.inspect<{ vocab: string | null; ref: string | null; kind: string; rk: string }>(
        `SELECT a."merchantVocabularyVersion" AS vocab, a."merchantRef" AS ref, a."assertionKind"::text AS kind,
                r."resultKind"::text AS rk
           FROM m7.m7_outcome_assertion a JOIN m7.m7_outcome_command_receipt r ON r."assertionId" = a."id"
          WHERE a."id" = $1`,
        [assertionId],
      )
    )[0];
    stored =
      row?.vocab === VBCP_IDENTITIES.vocabularyVersion &&
      row.ref === VBCP_MERCHANT_REFS[0] &&
      row.kind === 'ORIGINAL' &&
      row.rk === 'RECORDED';
  }
  rec(
    {
      id: 'PP-p_record_outcome_assertion_v1',
      actor: 'participant',
      session: part.identity,
      operation:
        'SO-1: ORIGINAL, SELF_REPORTED, REALIZED_PURCHASE, VOCABULARY_MERCHANT (FIXED ref), LIMA_DATE',
      expected: `result_kind RECORDED, replayed false; assertion stores the ACTIVE (FIXED) vocabulary ${VBCP_IDENTITIES.vocabularyVersion}; one RECORDED receipt`,
      observed: `${show(so1)}; persisted as expected=${stored}`,
      sqlstate: so1.sqlstate,
      verdict: v(
        so1.ok &&
          so1.rows[0]?.result_kind === 'RECORDED' &&
          so1.rows[0]?.replayed === false &&
          stored,
      ),
    },
    'm7.p_record_outcome_assertion_v1',
  );
  {
    const replay = await callFn(ctx, part.client, 'p_record_outcome_assertion_v1', [
      ...argsA.slice(0, 5),
      argsA[5],
      ...argsA.slice(6),
    ]);
    rec(
      {
        id: 'PP-p_record_outcome_assertion_v1/replay',
        actor: 'participant',
        session: part.identity,
        operation: 'SO-1 repeated with the same idempotency key and material (RP-3)',
        expected: 'same outcome_id and assertion_id, result_kind RECORDED, replayed true',
        observed: show(replay),
        sqlstate: replay.sqlstate,
        verdict: v(
          replay.ok &&
            replay.rows[0]?.assertion_id === assertionId &&
            replay.rows[0]?.outcome_id === outcomeId &&
            replay.rows[0]?.replayed === true,
        ),
      },
      'm7.p_record_outcome_assertion_v1',
    );
    const lookup = await callFn(ctx, part.client, 'p_lookup_outcome_receipt_v1', [
      ctx.fixtureDigest,
      A.secret,
      A.fixture.participantId,
      intentA,
      keyA,
      idemA,
      'ORIGINAL',
      null,
      'SELF_REPORTED',
      'REALIZED_PURCHASE',
      'VOCABULARY_MERCHANT',
      VBCP_MERCHANT_REFS[0],
      'LIMA_DATE',
      null,
      '2026-07-28',
    ]);
    rec(
      {
        id: 'PP-p_lookup_outcome_receipt_v1',
        actor: 'participant',
        session: part.identity,
        operation: 'pre-CCA replay lookup with the recorded material',
        expected:
          "lookup_status 'MATCH' with the recorded outcome_id / assertion_id, result_kind RECORDED",
        observed: show(lookup),
        sqlstate: lookup.sqlstate,
        verdict: v(
          lookup.ok &&
            lookup.rows[0]?.lookup_status === 'MATCH' &&
            lookup.rows[0]?.assertion_id === assertionId &&
            lookup.rows[0]?.result_kind === 'RECORDED',
        ),
      },
      'm7.p_lookup_outcome_receipt_v1',
    );
  }

  // ---- p_begin_evidence_upload_v1 (SO-2) and p_lookup_evidence_receipt_v1 ----
  const so2 = await callFn(ctx, part.client, 'p_begin_evidence_upload_v1', [
    ctx.fixtureDigest,
    A.secret,
    A.fixture.participantId,
    A.fixture.assignmentId,
    intentA,
    new Date(),
    's03vb-correlation-nonce-0001',
  ]);
  const intentId = so2.ok ? String(so2.rows[0]!.upload_intent_id) : '';
  const so2Row = so2.rows[0] ?? {};
  rec(
    {
      id: 'PP-p_begin_evidence_upload_v1',
      actor: 'participant',
      session: part.identity,
      operation: 'SO-2 for intent A with a 28-character correlation nonce',
      expected: `intent_state ISSUED; staging key under the FIXED staging prefix ${String(backend.p_staging_prefix)}; max_bytes = FIXED ${String(policy.p_max_upload_bytes)}; transport SERVER_MEDIATED; profile ${VBCP_IDENTITIES.storageProfileVersion}; credential ${String(profile.p_credential_profile_id)}`,
      observed: show(so2),
      sqlstate: so2.sqlstate,
      verdict: v(
        so2.ok &&
          so2Row.intent_state === 'ISSUED' &&
          String(so2Row.staging_object_key).startsWith(
            `${String(backend.p_staging_prefix)}${intentId}/`,
          ) &&
          so2Row.max_bytes === policy.p_max_upload_bytes &&
          so2Row.upload_transport === 'SERVER_MEDIATED' &&
          so2Row.storage_profile_version === VBCP_IDENTITIES.storageProfileVersion &&
          so2Row.credential_profile_id === profile.p_credential_profile_id,
      ),
    },
    'm7.p_begin_evidence_upload_v1',
  );
  {
    const r = await callFn(ctx, part.client, 'p_lookup_evidence_receipt_v1', [
      ctx.fixtureDigest,
      A.secret,
      A.fixture.participantId,
      intentId,
      captureKey('evkey'),
      captureKey('evidem'),
      null,
    ]);
    rec(
      {
        id: 'PP-p_lookup_evidence_receipt_v1',
        actor: 'participant',
        session: part.identity,
        operation: 'pre-CCA evidence replay lookup for the issued intent (no submission yet)',
        expected: "lookup_status 'NONE'",
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && r.rows[0]?.lookup_status === 'NONE'),
      },
      'm7.p_lookup_evidence_receipt_v1',
    );
  }

  // ---- worker upload-pipeline paths that need no object-store fact ----
  const wcall = (name: string, args: readonly unknown[]) => callFn(ctx, worker.client, name, args);
  {
    const r = await wcall('w_expire_upload_intents_v1', [ctx.fixtureDigest, 100]);
    rec(
      {
        id: 'PP-w_expire_upload_intents_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_expire_upload_intents_v1(<fixtureDigest>, 100) right after issuance',
        expected: `0: no intent has reached its deadline (FIXED uploadUrlTtl ${String(policy.p_upload_url_ttl)} + finalizeWindow ${String(policy.p_finalize_window)}) and none is withdrawn`,
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && r.rows[0]?.w_expire_upload_intents_v1 === 0),
      },
      'm7.w_expire_upload_intents_v1',
    );
  }
  {
    const r = await wcall('w_list_claimable_upload_intents_v1', [ctx.fixtureDigest, 100]);
    const ids = r.rows.map((x) => String(x.upload_intent_id));
    rec(
      {
        id: 'PP-w_list_claimable_upload_intents_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_list_claimable_upload_intents_v1(<fixtureDigest>, 100)',
        expected:
          'exactly the ISSUED, unexpired intents on a routable backend: the one intent SO-2 issued',
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && ids.length === 1 && ids[0] === intentId),
      },
      'm7.w_list_claimable_upload_intents_v1',
    );
  }
  let leaseEpoch: string | null = null;
  {
    const r = await wcall('w_claim_upload_intent_v1', [
      ctx.fixtureDigest,
      intentId,
      's03vb-worker-1',
    ]);
    const row = r.rows[0] ?? {};
    leaseEpoch = r.ok ? String(row.lease_epoch) : null;
    rec(
      {
        id: 'PP-w_claim_upload_intent_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_claim_upload_intent_v1(<fixtureDigest>, <issued intent>, worker id)',
        expected: `lease_epoch 1; canonical key under the FIXED evidence prefix ${String(backend.p_evidence_prefix)}; executing profile = FIXED profile; decoder/encoder/conditional-create/write-capability = FIXED; media type / max pixels = FIXED`,
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(
          r.ok &&
            String(row.lease_epoch) === '1' &&
            String(row.canonical_object_key).startsWith(
              `${String(backend.p_evidence_prefix)}${intentId}/g1/`,
            ) &&
            row.storage_profile_version === VBCP_IDENTITIES.storageProfileVersion &&
            row.decoder_generation === profile.p_decoder_generation &&
            row.encoder_generation === profile.p_encoder_generation &&
            row.conditional_create_mode === profile.p_conditional_create_mode &&
            row.write_capability_mode === profile.p_write_capability_mode &&
            row.canonical_media_type === policy.p_canonical_media_type &&
            row.max_pixels === policy.p_max_pixels,
        ),
        note: 'DB-only allocation of the generation and its opaque write grant; no capability is minted (the sealed signer path is SIGN and NOT EXECUTED)',
      },
      'm7.w_claim_upload_intent_v1',
    );
  }
  {
    const r = await wcall('w_release_upload_intent_v1', [ctx.fixtureDigest, intentId, leaseEpoch]);
    const st = await ctx.inspect<{ state: string; queued: string }>(
      `SELECT i."state"::text AS state,
              (SELECT count(*) FROM m7.m7_storage_outbox ob WHERE ob."uploadIntentId" = i."id" AND ob."zone" = 'CANONICAL')::text AS queued
         FROM m7.m7_evidence_upload_intent i WHERE i."id" = $1`,
      [intentId],
    );
    rec(
      {
        id: 'PP-w_release_upload_intent_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_release_upload_intent_v1(<fixtureDigest>, <intent>, <lease epoch>)',
        expected:
          'intent back to ISSUED; the released generation enqueued for deletion (one CANONICAL outbox row)',
        observed: `${show(r)}; state=${st[0]?.state}; canonical outbox rows=${st[0]?.queued}`,
        sqlstate: r.sqlstate,
        verdict: v(r.ok && st[0]?.state === 'ISSUED' && st[0]?.queued === '1'),
      },
      'm7.w_release_upload_intent_v1',
    );
  }
  {
    const r = await wcall('w_sweep_superseded_generations_v1', [ctx.fixtureDigest, 100]);
    rec(
      {
        id: 'PP-w_sweep_superseded_generations_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_sweep_superseded_generations_v1(<fixtureDigest>, 100) after the release',
        expected: '0: the only superseded generation already has its DELETE_OBJECT outbox row',
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && r.rows[0]?.w_sweep_superseded_generations_v1 === 0),
      },
      'm7.w_sweep_superseded_generations_v1',
    );
  }
  {
    // The released generation's delete may not run before its write fence (XF-5): claim + grant TTL + W + Λ.
    const fence = (
      await ctx.inspect<{ wait: string }>(
        `SELECT GREATEST(0, EXTRACT(EPOCH FROM (max(ob."notBefore") - pg_catalog.clock_timestamp())))::text AS wait
           FROM m7.m7_storage_outbox ob WHERE ob."uploadIntentId" = $1`,
        [intentId],
      )
    )[0]!;
    await new Promise((res) => setTimeout(res, Math.ceil(Number(fence.wait) * 1000) + 1500));
    const r = await wcall('w_lease_outbox_v1', [ctx.fixtureDigest, 's03vb-worker-1', 10]);
    const row = r.rows[0] ?? {};
    rec(
      {
        id: 'PP-w_lease_outbox_v1',
        actor: 'worker',
        session: worker.identity,
        operation:
          'w_lease_outbox_v1(<fixtureDigest>, worker id, 10) after the write fence elapsed',
        expected: `exactly one lease: zone CANONICAL, lease_epoch 1, routed to the FIXED container / region / endpoint / credential profile, bound policy = FIXED policy`,
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(
          r.ok &&
            r.rows.length === 1 &&
            row.zone === 'CANONICAL' &&
            String(row.lease_epoch) === '1' &&
            row.container_id === backend.p_container_id &&
            row.region_id === backend.p_region_id &&
            row.endpoint_identity === backend.p_endpoint_identity &&
            row.credential_profile_id === profile.p_credential_profile_id &&
            row.bound_policy_version === VBCP_IDENTITIES.policyVersion,
        ),
        note: 'the provider DELETE and m7.w_record_effect_attempt_v1 that follow a lease are STORE and NOT EXECUTED',
      },
      'm7.w_lease_outbox_v1',
    );
    if (r.ok && r.rows.length === 1) {
      await new Promise((res) => setTimeout(res, 50));
      const rn = await wcall('w_renew_outbox_lease_v1', [
        ctx.fixtureDigest,
        row.outbox_id,
        row.lease_epoch,
      ]);
      rec(
        {
          id: 'PP-w_renew_outbox_lease_v1',
          actor: 'worker',
          session: worker.identity,
          operation: 'w_renew_outbox_lease_v1(<fixtureDigest>, <leased outbox>, <epoch>)',
          expected: 'a new lease expiry (UTC ISO text), later than the leased expiry',
          observed: show(rn),
          sqlstate: rn.sqlstate,
          verdict: v(
            rn.ok && String(rn.rows[0]?.w_renew_outbox_lease_v1) > String(row.lease_expires_at),
          ),
        },
        'm7.w_renew_outbox_lease_v1',
      );
    }
  }

  // ---- privacy → authority → worker row redaction (participant B; no upload intents) ----
  const so1B = await callFn(
    ctx,
    part.client,
    'p_record_outcome_assertion_v1',
    so1Args(ctx, B, B.fixture.intentIds[0]!, captureKey('so1b'), captureKey('idemb')),
  );
  const erasureKey = captureKey('erasure');
  const er = await callFn(ctx, privacy.client, 'r_record_erasure_request_v1', [
    ctx.fixtureDigest,
    B.secret,
    B.fixture.participantId,
    B.fixture.assignmentId,
    erasureKey,
  ]);
  const erAgain = await callFn(ctx, privacy.client, 'r_record_erasure_request_v1', [
    ctx.fixtureDigest,
    B.secret,
    B.fixture.participantId,
    B.fixture.assignmentId,
    erasureKey,
  ]);
  const erasureId = er.ok ? String(er.rows[0]!.r_record_erasure_request_v1) : null;
  rec(
    {
      id: 'PP-r_record_erasure_request_v1',
      actor: 'privacy',
      session: privacy.identity,
      operation:
        'r_record_erasure_request_v1 for participant B, then the same client request key again',
      expected: 'an erasure-request id; the repeated request returns the same id (idempotent)',
      observed: `first ${show(er)}; again ${show(erAgain)}; SO-1 for B ${so1B.ok ? 'ok' : show(so1B)}`,
      sqlstate: er.sqlstate,
      verdict: v(
        er.ok &&
          erAgain.ok &&
          erAgain.rows[0]?.r_record_erasure_request_v1 === erasureId &&
          so1B.ok,
      ),
    },
    'm7.r_record_erasure_request_v1',
  );
  const decisionDigest = `sha256:${createHash('sha256').update(`${VBCP_MARKER}/decision-record/B`).digest('hex')}`;
  const mint = await callFn(ctx, authority.client, 'a_mint_deletion_authorization_v1', [
    ctx.fixtureDigest,
    'GRANTED_PARTICIPANT_ERASURE_REQUEST',
    B.fixture.assignmentId,
    erasureId,
    'ASSIGNMENT_M7_DATA',
    null,
    'ROW_REDACT',
    true,
    decisionDigest,
  ]);
  const authId = mint.ok ? String(mint.rows[0]!.a_mint_deletion_authorization_v1) : null;
  const authRow = authId
    ? (
        await ctx.inspect<{ pol: string; by: string }>(
          `SELECT "retentionPolicyVersion" AS pol, "authorizedBy"::text AS by FROM m7.m7_deletion_authorization WHERE "id" = $1`,
          [authId],
        )
      )[0]
    : undefined;
  rec(
    {
      id: 'PP-a_mint_deletion_authorization_v1',
      actor: 'authority',
      session: authority.identity,
      operation:
        'a_mint_deletion_authorization_v1(GRANTED_PARTICIPANT_ERASURE_REQUEST, assignment B, erasure request, ASSIGNMENT_M7_DATA, ROW_REDACT, retain history)',
      expected: `an authorization id bound to the FIXED policy ${VBCP_IDENTITIES.policyVersion}, authorizedBy = ${ACTOR_ROLE.authority}`,
      observed: `${show(mint)}; row=${JSON.stringify(authRow)}`,
      sqlstate: mint.sqlstate,
      verdict: v(
        mint.ok &&
          authRow?.pol === VBCP_IDENTITIES.policyVersion &&
          authRow.by === ACTOR_ROLE.authority,
      ),
    },
    'm7.a_mint_deletion_authorization_v1',
  );
  const sched = await wcall('w_schedule_authorized_deletion_v1', [ctx.fixtureDigest, authId]);
  rec(
    {
      id: 'PP-w_schedule_authorized_deletion_v1',
      actor: 'worker',
      session: worker.identity,
      operation: 'w_schedule_authorized_deletion_v1(<fixtureDigest>, <authorization>)',
      expected: '1: no artifact in scope, exactly one ROW_REDACT execution scheduled',
      observed: show(sched),
      sqlstate: sched.sqlstate,
      verdict: v(sched.ok && sched.rows[0]?.w_schedule_authorized_deletion_v1 === 1),
    },
    'm7.w_schedule_authorized_deletion_v1',
  );
  const exec = authId
    ? (
        await ctx.inspect<{ id: string }>(
          `SELECT "id"::text AS id FROM m7.m7_deletion_execution WHERE "authorizationId" = $1 AND "mechanism" = 'ROW_REDACT'`,
          [authId],
        )
      )[0]?.id
    : undefined;
  const red = await wcall('w_execute_row_redaction_v1', [ctx.fixtureDigest, exec ?? null]);
  const redacted = (
    await ctx.inspect<{ live: string; red: string }>(
      `SELECT count(*) FILTER (WHERE a."redactedAt" IS NULL)::text AS live,
              count(*) FILTER (WHERE a."redactedAt" IS NOT NULL AND a."statusLabel" IS NULL AND a."merchantRef" IS NULL)::text AS red
         FROM m7.m7_outcome_assertion a JOIN m7.m7_outcome o ON o."id" = a."outcomeId" WHERE o."assignmentId" = $1`,
      [B.fixture.assignmentId],
    )
  )[0]!;
  rec(
    {
      id: 'PP-w_execute_row_redaction_v1',
      actor: 'worker',
      session: worker.identity,
      operation: 'w_execute_row_redaction_v1(<fixtureDigest>, <ROW_REDACT execution>)',
      expected:
        "1 (B's one live assertion); afterwards B has 0 live and 1 redacted assertion with NULL payload",
      observed: `${show(red)}; live=${redacted.live} redacted=${redacted.red}`,
      sqlstate: red.sqlstate,
      verdict: v(
        red.ok &&
          red.rows[0]?.w_execute_row_redaction_v1 === 1 &&
          redacted.live === '0' &&
          redacted.red === '1',
      ),
      note: 'the execution id is read by the owner-class actor (actual side); the worker has no table privilege',
    },
    'm7.w_execute_row_redaction_v1',
  );

  // ---- authority → worker row purge (participant C; no upload intents, no erasure request) ----
  const so1C = await callFn(
    ctx,
    part.client,
    'p_record_outcome_assertion_v1',
    so1Args(ctx, C, C.fixture.intentIds[0]!, captureKey('so1c'), captureKey('idemc')),
  );
  const mintC = await callFn(ctx, authority.client, 'a_mint_deletion_authorization_v1', [
    ctx.fixtureDigest,
    'COMPETENT_AUTHORITY_ORDER',
    C.fixture.assignmentId,
    null,
    'ASSIGNMENT_M7_DATA',
    null,
    'ROW_PURGE',
    true,
    `sha256:${createHash('sha256').update(`${VBCP_MARKER}/decision-record/C`).digest('hex')}`,
  ]);
  const authC = mintC.ok ? String(mintC.rows[0]!.a_mint_deletion_authorization_v1) : null;
  const schedC = await wcall('w_schedule_authorized_deletion_v1', [ctx.fixtureDigest, authC]);
  const execC = authC
    ? (
        await ctx.inspect<{ id: string }>(
          `SELECT "id"::text AS id FROM m7.m7_deletion_execution WHERE "authorizationId" = $1 AND "mechanism" = 'ROW_PURGE'`,
          [authC],
        )
      )[0]?.id
    : undefined;
  const cBefore = (
    await ctx.inspect<{ n: string }>(
      `SELECT ((SELECT count(*) FROM m7.m7_outcome WHERE "assignmentId" = $1)
             + (SELECT count(*) FROM m7.m7_participant_session WHERE "participantId" = $2))::text AS n`,
      [C.fixture.assignmentId, C.fixture.participantId],
    )
  )[0]!.n;
  const purge = await wcall('w_execute_row_purge_v1', [ctx.fixtureDigest, execC ?? null]);
  const cAfter = (
    await ctx.inspect<{ n: string; done: string }>(
      `SELECT ((SELECT count(*) FROM m7.m7_outcome WHERE "assignmentId" = $1)
             + (SELECT count(*) FROM m7.m7_outcome_assertion a JOIN m7.m7_outcome o ON o."id" = a."outcomeId" WHERE o."assignmentId" = $1)
             + (SELECT count(*) FROM m7.m7_participant_session WHERE "participantId" = $2))::text AS n,
              (SELECT count(*) FROM m7.m7_deletion_execution_completion WHERE "executionId" = $3)::text AS done`,
      [C.fixture.assignmentId, C.fixture.participantId, execC ?? null],
    )
  )[0]!;
  const purgeAgain = await wcall('w_execute_row_purge_v1', [ctx.fixtureDigest, execC ?? null]);
  rec(
    {
      id: 'PP-w_execute_row_purge_v1',
      actor: 'worker (after authority mint + worker schedule)',
      session: worker.identity,
      operation:
        'COMPETENT_AUTHORITY_ORDER / ROW_PURGE / retain history for assignment C; schedule; purge; purge again',
      expected:
        "a positive affected-row count; afterwards C's outcomes, assertions and sessions are gone and one completion is recorded; the replay returns the same count (RM-3)",
      observed: `SO-1 C ${so1C.ok ? 'ok' : show(so1C)}; mint ${mintC.ok ? 'ok' : show(mintC)}; schedule ${show(schedC)}; C rows before=${cBefore}; purge ${show(purge)}; after rows=${cAfter.n} completions=${cAfter.done}; replay ${show(purgeAgain)}`,
      sqlstate: purge.sqlstate,
      verdict: v(
        so1C.ok &&
          mintC.ok &&
          schedC.ok &&
          schedC.rows[0]?.w_schedule_authorized_deletion_v1 === 1 &&
          purge.ok &&
          Number(purge.rows[0]?.w_execute_row_purge_v1) > 0 &&
          cAfter.n === '0' &&
          cAfter.done === '1' &&
          purgeAgain.ok &&
          purgeAgain.rows[0]?.w_execute_row_purge_v1 === purge.rows[0]?.w_execute_row_purge_v1,
      ),
    },
    'm7.w_execute_row_purge_v1',
  );

  // ---- empty-work worker paths ----
  const zeroInt = async (name: string, why: string) => {
    const r = await wcall(name, [ctx.fixtureDigest, 100]);
    rec(
      {
        id: `PP-${name}`,
        actor: 'worker',
        session: worker.identity,
        operation: `${name}(<fixtureDigest>, 100)`,
        expected: `0: ${why}`,
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && r.rows[0]?.[name] === 0),
      },
      `m7.${name}`,
    );
  };
  await zeroInt(
    'w_schedule_withdrawal_deletions_v1',
    'no evidence artifact exists and no consent is withdrawn',
  );
  await zeroInt('w_schedule_retention_deletions_v1', 'no evidence artifact exists');
  await zeroInt(
    'w_assert_deletion_sla_failures_v1',
    'every execution of this run lies within its FIXED budget and hard deadline',
  );
  {
    const r = await callFn(ctx, worker.client, 'w_list_storage_scopes_for_sweep_v1', [
      ctx.fixtureDigest,
    ]);
    const row = r.rows[0] ?? {};
    rec(
      {
        id: 'PP-w_list_storage_scopes_for_sweep_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_list_storage_scopes_for_sweep_v1(<fixtureDigest>)',
        expected:
          'exactly one scope: the FIXED backend identity (container, region, endpoint, staging and evidence prefixes) under the FIXED profile / credential',
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(
          r.ok &&
            r.rows.length === 1 &&
            row.container_id === backend.p_container_id &&
            row.region_id === backend.p_region_id &&
            row.endpoint_identity === backend.p_endpoint_identity &&
            row.staging_prefix === backend.p_staging_prefix &&
            row.evidence_prefix === backend.p_evidence_prefix &&
            row.storage_profile_version === VBCP_IDENTITIES.storageProfileVersion &&
            row.credential_profile_id === profile.p_credential_profile_id,
        ),
        note: 'listing the scope is DB-only; the sweep itself (provider listing + w_classify_object_key_v1) is STORE and NOT EXECUTED',
      },
      'm7.w_list_storage_scopes_for_sweep_v1',
    );
  }
  {
    const r = await wcall('w_list_artifacts_for_audit_v1', [ctx.fixtureDigest, 100]);
    rec(
      {
        id: 'PP-w_list_artifacts_for_audit_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_list_artifacts_for_audit_v1(<fixtureDigest>, 100)',
        expected:
          'zero rows: no AVAILABLE evidence artifact exists (finalization is STORE-dependent and not executed)',
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && r.rows.length === 0),
      },
      'm7.w_list_artifacts_for_audit_v1',
    );
  }
  {
    const r = await callFn(ctx, worker.client, 'w_list_deletion_sla_v1', [ctx.fixtureDigest]);
    rec(
      {
        id: 'PP-w_list_deletion_sla_v1',
        actor: 'worker',
        session: worker.identity,
        operation: 'w_list_deletion_sla_v1(<fixtureDigest>)',
        expected:
          'completes; zero rows: both executions of this run completed within their FIXED budgets and no deadline has passed',
        observed: show(r),
        sqlstate: r.sqlstate,
        verdict: v(r.ok && r.rows.length === 0),
      },
      'm7.w_list_deletion_sla_v1',
    );
  }

  // ---- s_revoke_participant_session_v1 (issuer) and its effect ----
  {
    const r = await callFn(ctx, issuer.client, 's_revoke_participant_session_v1', [
      ctx.fixtureDigest,
      A2.sessionId,
      'LOGOUT',
    ]);
    const after = await callFn(ctx, part.client, 'p_lock_and_prove_assignment_v1', [
      ctx.fixtureDigest,
      A2.secret,
      A2.fixture.participantId,
      A2.fixture.assignmentId,
    ]);
    rec(
      {
        id: 'PP-s_revoke_participant_session_v1',
        actor: 'issuer',
        session: issuer.identity,
        operation:
          "s_revoke_participant_session_v1(<fixtureDigest>, <second session of A>, 'LOGOUT'); then that session is used",
        expected:
          "'QUIESCENT'; afterwards the revoked session is refused with 28000 M7_SESSION_INVALID",
        observed: `${show(r)}; later use: ${show(after)}`,
        sqlstate: r.sqlstate,
        verdict: v(
          r.ok &&
            r.rows[0]?.s_revoke_participant_session_v1 === 'QUIESCENT' &&
            after.sqlstate === '28000',
        ),
      },
      'm7.s_revoke_participant_session_v1',
    );
  }

  return { A, assertionId, outcomeId };
}

/** Positive paths that need an object-store fact or the signer (VBA-SC-3): NOT EXECUTED, never PASS. */
export const STORE_OR_SIGN_POSITIVE_PATHS: readonly {
  readonly fn: string;
  readonly reason: string;
}[] = [
  {
    fn: 'm7.p_finalize_evidence_submission_v1',
    reason:
      'STORE — SO-3 consumes a VALIDATED intent, which exists only after the worker observed the uploaded bytes (w_record_validated_observation_v1)',
  },
  {
    fn: 'm7.w_record_validated_observation_v1',
    reason:
      'STORE — its inputs (byte size, content SHA-256, provider ETag) are facts of a real object read back from a real store',
  },
  {
    fn: 'm7.w_record_content_rejected_v1',
    reason: 'STORE — the rejection reason is the outcome of decoding real staged bytes',
  },
  {
    fn: 'm7.w_record_terminal_failure_v1',
    reason:
      'STORE — the failure reason (canonical key conflict, read-back failure, provider permanent error) is a provider outcome',
  },
  {
    fn: 'm7.w_record_effect_attempt_v1',
    reason:
      'STORE — its result (ABSENT_CONFIRMED / STILL_PRESENT / provider error) is the outcome of a provider DELETE/HEAD',
  },
  {
    fn: 'm7.w_requeue_failed_effect_v1',
    reason:
      'STORE — requires a FAILED_PERMANENT outbox row, reachable only through provider effect attempts',
  },
  {
    fn: 'm7.w_classify_object_key_v1',
    reason: 'STORE — classifies a key observed in a real provider listing',
  },
  {
    fn: 'm7.w_record_canonical_missing_v1',
    reason:
      'STORE — records a provider HEAD/GET finding for an AVAILABLE artifact (none can exist without SO-3)',
  },
  {
    fn: 'm7.w_record_canonical_digest_mismatch_v1',
    reason: 'STORE — records a digest recomputed from real canonical bytes',
  },
];

// ---------------------------------------------------------------------------------------------------
// §25.9 T-74 … T-76: search_path attacks against SO-1 / SO-2 (participant A's live session)
// ---------------------------------------------------------------------------------------------------

export async function runSearchPathCases(
  ctx: VerificationContext,
  st: PositivePathState,
): Promise<void> {
  const A = st.A;
  const intentA = A.fixture.intentIds[0]!;
  const so1 = (client: pg.Client, tag: string) =>
    callFn(
      ctx,
      client,
      'p_record_outcome_assertion_v1',
      so1Args(ctx, A, intentA, captureKey(`${tag}c`), captureKey(`${tag}i`)),
    );
  const so2 = (client: pg.Client, nonce: string) =>
    callFn(ctx, client, 'p_begin_evidence_upload_v1', [
      ctx.fixtureDigest,
      A.secret,
      A.fixture.participantId,
      A.fixture.assignmentId,
      intentA,
      new Date(),
      nonce,
    ]);
  const normalSo1 = (r: AttemptResult) =>
    r.ok && r.rows[0]?.result_kind === 'RECORDED' && r.rows[0]?.outcome_id === st.outcomeId;
  const normalSo2 = (r: AttemptResult) =>
    r.ok &&
    r.rows[0]?.intent_state === 'ISSUED' &&
    String(r.rows[0]?.staging_object_key).startsWith(String(backend.p_staging_prefix));

  // T-74: pg_temp shadowing, in the participant's own session.
  {
    const s = await ctx.session(ACTOR_ROLE.participant, 'participant-t74');
    const setup = [
      `CREATE TEMP TABLE experiment_assignment ("id" uuid, "participantId" uuid)`,
      `INSERT INTO pg_temp.experiment_assignment VALUES ('${A.fixture.assignmentId}', '00000000-0000-4000-8000-00000000a774')`,
      `CREATE TEMP TABLE m7_participant_session ("id" uuid, "participantId" uuid, "handleSha256" bytea, "expiresAt" timestamptz)`,
      `INSERT INTO pg_temp.m7_participant_session VALUES ('00000000-0000-4000-8000-00000000a774', '00000000-0000-4000-8000-00000000a774', '\\x00', 'infinity')`,
      `CREATE TEMP TABLE m7_storage_profile ("id" uuid, "storageProfileVersion" text, "backendSha256" text, "retiredAt" timestamptz)`,
      `INSERT INTO pg_temp.m7_storage_profile VALUES ('00000000-0000-4000-8000-00000000a774', 'attacker', 'attacker', NULL)`,
      `CREATE TEMP TABLE study_consent_event ("id" uuid, "assignmentId" uuid, "action" text, "consentSeq" integer)`,
      `INSERT INTO pg_temp.study_consent_event VALUES ('00000000-0000-4000-8000-00000000a774', '${A.fixture.assignmentId}', 'WITHDRAWN', 0)`,
    ];
    const setupResults = [];
    for (const q of setup) setupResults.push(await attempt(s.client, q));
    const r1 = await so1(s.client, 't74');
    const r2 = await so2(s.client, 's03vb-t74-correlation-nonce-01');
    ctx.record({
      id: 'T-74',
      clause: 'V1.1 §25.9 T-74 (M7-I71)',
      actor: 'participant',
      session: s.identity,
      operation:
        'create pg_temp.experiment_assignment / m7_participant_session / m7_storage_profile / study_consent_event with attacker rows; then SO-1 and SO-2 in the same session',
      expected:
        'normal behaviour: SO-1 RECORDED on the real outcome; SO-2 ISSUED under the real FIXED staging prefix; the temp tables are never read',
      observed: `setup ${setupResults.every((x) => x.ok) ? 'ok' : setupResults.map(show).join(' / ')}; SO-1 ${show(r1)}; SO-2 ${show(r2)}`,
      sqlstate: r1.sqlstate ?? r2.sqlstate,
      verdict: v(setupResults.every((x) => x.ok) && normalSo1(r1) && normalSo2(r2)),
    });
    await ctx.drop(ACTOR_ROLE.participant, 'participant-t74');
  }

  // T-75: built-in shadowing in public, created by the owner-class actor (the migration role, which owns
  // public via pg_database_owner — objects in public are not M7 objects, so SET ROLE is not used).
  {
    const shadow = [
      `CREATE FUNCTION public.sha256(bytea) RETURNS bytea LANGUAGE sql AS $$ SELECT '\\x00'::bytea $$`,
      `CREATE FUNCTION public.clock_timestamp() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '2000-01-01T00:00:00Z'::timestamptz $$`,
      `CREATE FUNCTION public.gen_random_uuid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-4000-8000-00000000a775'::uuid $$`,
      `CREATE FUNCTION public.starts_with(text, text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$`,
    ];
    const drop = [
      'DROP FUNCTION public.sha256(bytea)',
      'DROP FUNCTION public.clock_timestamp()',
      'DROP FUNCTION public.gen_random_uuid()',
      'DROP FUNCTION public.starts_with(text, text)',
    ];
    const owner = await ctx.session(ctx.migrationRole, 'owner-class-t75');
    const made = [];
    for (const q of shadow) made.push(await attempt(owner.client, q));
    const p = await ctx.session(ACTOR_ROLE.participant, 'participant-t75');
    const w = await ctx.session(ACTOR_ROLE.worker, 'worker-t75');
    const rSo1 = await so1(p.client, 't75');
    const rLock = await callFn(ctx, p.client, 'p_lock_and_prove_assignment_v1', [
      ctx.fixtureDigest,
      A.secret,
      A.fixture.participantId,
      A.fixture.assignmentId,
    ]);
    const rSched = await callFn(ctx, w.client, 'w_schedule_retention_deletions_v1', [
      ctx.fixtureDigest,
      10,
    ]);
    const rSo2 = await so2(p.client, 's03vb-t75-correlation-nonce-01');
    const uuidOk = rSo1.ok && rSo1.rows[0]?.assertion_id !== '00000000-0000-4000-8000-00000000a775';
    const dropped = [];
    for (const q of drop) dropped.push(await attempt(owner.client, q));
    ctx.record({
      id: 'T-75',
      clause: 'V1.1 §25.9 T-75 (M7-I72)',
      actor:
        'owner-class creates the shadows (migration role, owner of public); participant / worker call',
      session: p.identity,
      operation:
        'public.sha256(bytea), public.clock_timestamp(), public.gen_random_uuid(), public.starts_with(text,text) returning attacker values; then SO-1, session validation, deletion scheduling, key-prefix verification (SO-2 staging-key coherence)',
      expected:
        'unaffected: SO-1 RECORDED with a real (non-attacker) id; session validation succeeds; scheduling returns 0; SO-2 ISSUED under the real staging prefix',
      observed: `shadows ${made.every((x) => x.ok) ? 'created' : made.map(show).join(' / ')}; SO-1 ${show(rSo1)}; lock-and-prove ${show(rLock)}; schedule ${show(rSched)}; SO-2 ${show(rSo2)}; shadows ${dropped.every((x) => x.ok) ? 'dropped' : 'NOT dropped'}`,
      sqlstate: rSo1.sqlstate,
      verdict: v(
        made.every((x) => x.ok) &&
          normalSo1(rSo1) &&
          uuidOk &&
          rLock.ok &&
          rSched.ok &&
          rSched.rows[0]?.w_schedule_retention_deletions_v1 === 0 &&
          normalSo2(rSo2) &&
          dropped.every((x) => x.ok),
      ),
    });
  }

  // T-76: caller search_path is irrelevant.
  {
    const s = await ctx.session(ACTOR_ROLE.participant, 'participant-t76');
    const set = await attempt(s.client, 'SET search_path = pg_temp, public, m7');
    const r = await so1(s.client, 't76');
    ctx.record({
      id: 'T-76',
      clause: 'V1.1 §25.9 T-76 (M7-I73)',
      actor: 'participant',
      session: s.identity,
      operation: 'SET search_path = pg_temp, public, m7; then SO-1',
      expected: 'unchanged behaviour (function SET wins): SO-1 RECORDED',
      observed: `SET ${show(set)}; SO-1 ${show(r)}`,
      sqlstate: r.sqlstate,
      verdict: v(set.ok && normalSo1(r)),
    });
    await ctx.drop(ACTOR_ROLE.participant, 'participant-t76');
  }
}
