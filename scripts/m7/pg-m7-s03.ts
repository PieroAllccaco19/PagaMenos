// PagaMenos · M7 V1.1 — S03 installation-and-verification harness (M7-S03-VBCP, VBA-01).
//
//   pnpm m7:s03 --evidence-dir <dir>   derive E / F, then control run, T-81 / T-82, positive installation
//                                      with the S03 verification bootstrap, verification families, teardown,
//                                      post-teardown re-derivation; sanitized evidence into <dir>
//   pnpm m7:s03 --derive-only [...]    only the pre-execution derivation (no PostgreSQL)
//
// `M7-S03-VBCP` is a VERIFICATION FIXTURE: never a manifest, never lifecycle authority, never published,
// never committed. Every environment is a throwaway cluster provisioned only by the accepted VBA-S02-1
// template and destroyed at the end. The installation is never executed by a superuser. No normative byte
// is altered: F01 … F25 and the two F26 parts are executed verbatim. Evidence stays OUTSIDE the repository.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { canonicalize } from '../../src/persistence/canonical';
import { censusUnnest } from '../../src/m7/normative/erratum-04-corrections';
import { M7_V1_1 } from '../../src/m7/normative/source';
import { resolvePgBinaries } from '../../src/m7/testkit/cluster';
import { generateSecret } from '../../src/m7/testkit/provision';
import { deriveM7RoleExpectations } from '../../src/m7/testkit/roles';
import { buildA1A2Participants, A2_TEST_BUILD_GIT_SHA } from './pg-m7-s03-a1a2';
import {
  runControlPlaneChecks,
  runReversibleInjections,
  runT133MemberMissing,
  runT137bRetiredProfile,
} from '../../src/m7/s03/catalog-cases';
import {
  type S03Environment,
  type TeardownEvidence,
  databaseUrl,
  destroyEnvironment,
  freshMigratedDatabase,
  startProvisionedEnvironment,
  withLogin,
} from '../../src/m7/s03/environment';
import {
  type CaseResult,
  EventLog,
  assertOutsideRepository,
  derivedExpectation,
  fixedInput,
  observed,
  runtimeChaining,
  sha256OfText,
  writeEvidenceFile,
} from '../../src/m7/s03/evidence';
import { deriveExpectations } from '../../src/m7/s03/expectations';
import {
  DISPOSABLE_VERIFICATION_ROLES,
  VBCP_IDENTITIES,
  VBCP_N,
  buildFixture,
} from '../../src/m7/s03/fixture';
import {
  type PositiveInstallResult,
  assertNoInterleaving,
  partitionF26,
  runPositiveInstall,
} from '../../src/m7/s03/orchestration';
import {
  STORE_OR_SIGN_POSITIVE_PATHS,
  runPositivePaths,
  runSearchPathCases,
} from '../../src/m7/s03/positive-paths';
import { runControlRun, runProvisioningFailureCases } from '../../src/m7/s03/provisioning-cases';
import { loadS03Sources } from '../../src/m7/s03/sources';
import {
  S03DefectStop,
  VerificationContext,
  runFamilyA,
  runT09,
  runT77,
  runT79,
  runT80,
} from '../../src/m7/s03/verification';

const ROOT = process.cwd();

interface Args {
  readonly deriveOnly: boolean;
  readonly evidenceDir: string;
}

function parseArgs(argv: string[]): Args {
  let deriveOnly = false;
  let evidenceDir: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === '--derive-only') deriveOnly = true;
    else if (a === '--evidence-dir' && argv[i + 1]) evidenceDir = resolve(argv[(i += 1)]!);
    else {
      console.error(`[m7:s03] unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return {
    deriveOnly,
    evidenceDir: evidenceDir ?? mkdtempSync(join(tmpdir(), 'pagamenos-m7-s03-evidence-')),
  };
}

/** The pre-execution derivation: pure, DB-free (VBA-AX-3). */
function derive() {
  const sources = loadS03Sources(ROOT);
  const f12 = sources.fragments[11]!;
  const census = censusUnnest(f12.sql);
  const qualifiedMultiArray = census.calls.filter(
    (c) => c.schema !== null && c.args.length >= 2,
  ).length;
  if (qualifiedMultiArray !== 0 || census.rowsFrom !== 6) {
    throw new Error(
      `STOP — F12 is not E04-conforming: multi-array=${qualifiedMultiArray} ROWS FROM=${census.rowsFrom}`,
    );
  }
  // E04 remains applied to F12 only; E05 to F18 and F22 only (both re-proved by loadS03Sources).
  const invariance = sources.fragments.map((f) => ({
    id: f.id,
    e04Corrections: f.erratum04Corrections.length,
    e05Corrections: [...f.erratum05Corrections],
    sha256: f.identity.sha256,
    erratum04Sha256: f.erratum04Sha256,
    unchangedUnderE05: f.identity.sha256 === f.erratum04Sha256,
  }));
  const e05Changed = invariance.filter((x) => !x.unchangedUnderE05).map((x) => x.id);
  if (
    invariance.some((x) => x.id !== 'F12' && x.e04Corrections !== 0) ||
    JSON.stringify(e05Changed) !== JSON.stringify(['F18', 'F22'])
  ) {
    throw new Error(`STOP — fragment set is not the accepted E05 set: changed=${e05Changed}`);
  }
  const derivation = deriveExpectations(sources, VBCP_IDENTITIES.manifestVersion);
  const build = buildFixture(sources, derivation.catalog, derivation.payload);
  const partition = partitionF26(sources.fragments[25]!.sql);
  return {
    sources,
    derivation,
    build,
    partition,
    f12Census: {
      qualifiedMultiArray,
      rowsFrom: census.rowsFrom,
      rowsFromLines: census.rowsFromLines,
    },
    invariance,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  assertOutsideRepository(args.evidenceDir, ROOT);
  const events = new EventLog();
  const secrets: string[] = [];
  const ports: number[] = [];
  const results: CaseResult[] = [];
  const evidence: Record<string, unknown> = {
    slice:
      'M7 V1.1 + E01–E05 — M7-S03 E05-conforming verification: S03 verification bootstrap control plane (M7-S03-VBCP) run',
    nature:
      'VERIFICATION EVIDENCE ONLY — not authority, not a manifest, satisfies no MA / IMP / Gate-2 item (VBA-LB-1)',
    platform: `${process.platform}/${process.arch} node ${process.version}`,
  };

  // ---------------------------------------------------------------- Phase 0: pre-execution derivation
  events.push('derivation-start');
  const d0 = derive();
  const { sources, derivation, build, partition } = d0;
  const eCanonical = canonicalize(derivation.payload);
  const fCanonical = canonicalize(build.fixture);
  events.push('derivation-complete', {
    expectationPayloadSha256: build.expectationPayloadSha256,
    fixtureDigest: build.fixtureDigest,
  });
  const pre = {
    note: 'Written before the first PostgreSQL connection of this run (VBA-AX-3).',
    vbcpIdentities: fixedInput({ ...VBCP_IDENTITIES, N: VBCP_N }),
    expectationPayloadSha256: derivedExpectation(build.expectationPayloadSha256),
    fixtureDigest: derivedExpectation(build.fixtureDigest),
    entriesSha256: derivedExpectation(build.entriesSha256),
    canonicalE: { sha256: sha256OfText(eCanonical), bytes: Buffer.byteLength(eCanonical) },
    canonicalF: { sha256: sha256OfText(fCanonical), bytes: Buffer.byteLength(fCanonical) },
    census: build.census,
    inventorySelfCheck: derivation.inventory,
    sources: {
      S1: sources.s1.map((s) => ({
        path: s.path,
        gitBlob: s.gitBlob,
        sha256: s.sha256,
        bytes: s.bytes,
        lines: s.lines,
      })),
      S2: {
        fragments: sources.fragments.map((f) => ({
          id: f.id,
          clause: f.clause,
          lines: f.lines,
          ...f.identity,
        })),
        extractionIndex: sources.extractionIndex,
        regeneratedFromS1: sources.regeneration,
      },
      S3: {
        rolesTemplate: { ...sources.rolesTemplate, text: undefined },
        provisionModule: { ...sources.provisionModule, text: undefined },
      },
      governingContracts: sources.governing,
      canonicalSerializer: sources.canonicalSerializer,
    },
    f12: {
      ...sources.fragments[11]!.identity,
      lines: sources.fragments[11]!.lines,
      census: d0.f12Census,
    },
    fragmentErratumInvariance: d0.invariance,
    e05Fragments: sources.fragments
      .filter((f) => f.id === 'F18' || f.id === 'F22')
      .map((f) => ({
        id: f.id,
        lines: f.lines,
        corrections: f.erratum05Corrections,
        ...f.identity,
      })),
    f26Partition: {
      partitionLine: partition.partitionLine,
      original: partition.original,
      prefix: partition.prefix,
      suffix: partition.suffix,
      concatenationIdentical: partition.concatenationIdentical,
    },
    derivedRefClosureSource:
      'E03-08 Ref(T): §19.4–§19.9 FOREIGN KEY constraints of E (self-references excluded)',
  };
  const preSha = writeEvidenceFile(join(args.evidenceDir, 'pre-execution.json'), pre, [], []);
  const eSha = writeEvidenceFile(
    join(args.evidenceDir, 'E.expectation-payload.json'),
    derivation.payload,
    [],
    [],
  );
  const fSha = writeEvidenceFile(
    join(args.evidenceDir, 'F.vbcp-fixture-document.json'),
    build.fixture,
    [],
    [],
  );
  events.push('pre-execution-evidence-written', { preSha, eSha, fSha });
  console.log(`[m7:s03] E sha256 ${build.expectationPayloadSha256}`);
  console.log(`[m7:s03] fixtureDigest ${build.fixtureDigest}`);
  console.log(
    `[m7:s03] census ${build.census.declared}/${build.census.FIXED}/${build.census.PRE_DERIVED}/${build.census.RUNTIME_BINDING}`,
  );
  if (args.deriveOnly) {
    console.log(`[m7:s03] derive-only: pre-execution evidence in ${args.evidenceDir}`);
    return 0;
  }

  const binaries = resolvePgBinaries(process.env.PG_BIN);
  const v11 = sources.s1.find((s) => s.path === M7_V1_1.path)!;
  const roleExpectations = deriveM7RoleExpectations(Buffer.from(v11.text, 'utf8'));
  const migrationRole = derivation.catalog.migrationRole;
  const teardowns: TeardownEvidence[] = [];
  let stop: string | null = null;
  let d0312 = {
    finalAssertion: false,
    verifierZero: false,
    assertSuccess: false,
    otherDigestMismatch: false,
  };
  let envC: S03Environment | undefined;
  let envP: S03Environment | undefined;

  try {
    // -------------------------------------------------------------- Phase 1: control environment
    events.push('first-postgresql-connection-about-to-open', { environment: 'control' });
    envC = await startProvisionedEnvironment(
      'control',
      binaries,
      roleExpectations,
      migrationRole,
      ROOT,
    );
    secrets.push(...envC.secrets);
    ports.push(envC.cluster.port);
    events.push('control-environment-provisioned');
    evidence.provisioningControl = envC.provisioning;
    const control = await runControlRun(envC, sources.fragments, ROOT);
    results.push(control.result);
    evidence.controlRun = {
      checkpoints: control.run.checkpoints,
      journal: control.run.journal,
      residue: control.residue,
      migrations: control.migrations,
    };
    if (control.run.failure === null) stop = 'STOP — S03 FAIL-CLOSED CONTROL RUN DID NOT FAIL.';
    else if (control.result.verdict !== 'PASS')
      stop = `STOP — CONTROL RUN FAILED FOR A MATERIALLY DIFFERENT REASON: ${control.result.observed}`;
    if (!stop) {
      const pf = await runProvisioningFailureCases(envC, sources.fragments, ROOT);
      results.push(...pf);
      const firstFail = pf.find((r) => r.verdict === 'FAIL');
      if (firstFail) stop = `STOP ON FAIL: ${firstFail.id} — ${firstFail.observed}`;
    }
    teardowns.push(await destroyEnvironment(envC));
    envC = undefined;

    // -------------------------------------------------------------- Phase 2: positive environment
    if (!stop) {
      envP = await startProvisionedEnvironment(
        'positive',
        binaries,
        roleExpectations,
        migrationRole,
        ROOT,
      );
      secrets.push(...envP.secrets);
      ports.push(envP.cluster.port);
      evidence.provisioningPositive = envP.provisioning;
      const legacy = DISPOSABLE_VERIFICATION_ROLES.legacy.name;
      const legacyPw = generateSecret();
      secrets.push(legacyPw);
      await envP.cluster.withAdmin('postgres', (c) =>
        c.query(
          `CREATE ROLE ${legacy} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${legacyPw}'`,
        ),
      );
      envP.credentials.set(legacy, legacyPw);
      const db = 's03_positive';
      const migrations = await freshMigratedDatabase(envP, db, ROOT);
      const installInput = {
        fragments: sources.fragments,
        partition,
        install: build.fixture.controlPlaneInstall,
        catalog: derivation.catalog,
        payload: derivation.payload,
        fixtureDigest: build.fixtureDigest,
        entriesSha256: build.entriesSha256,
      };
      const envRef = envP;
      const positive: PositiveInstallResult = await withLogin(
        envRef.cluster,
        migrationRole,
        envRef.credentials.get(migrationRole)!,
        db,
        (c) => runPositiveInstall(c, installInput),
      );
      assertNoInterleaving(positive.journal);
      evidence.positiveInstall = {
        database: db,
        migrations,
        checkpoints: positive.checkpoints,
        immediatelyBeforeF26Suffix: {
          checkpoint: positive.finalCheckpoint,
          expected: derivedExpectation({
            sessionUser: derivation.catalog.migrationRole,
            currentUser: derivation.catalog.ownerRole,
          }),
          holds:
            positive.finalCheckpoint?.sessionUser === derivation.catalog.migrationRole &&
            positive.finalCheckpoint?.currentUser === derivation.catalog.ownerRole,
          realization:
            'the seventh bootstrap statement is ONE SELECT that calls m7.c_activate_manifest_v1 exactly once and also projects session_user::text and current_user::text; no eighth statement precedes F26-suffix (AUD-S03-E05-01)',
          distinctFrom:
            'registeredBy / installedBy (runtimeBindingProof.registeredBy) are row provenance written by the functions, NOT this direct observation',
        },
        journal: positive.journal,
        calls: positive.calls.map((c) => ({
          order: c.order,
          function: c.function,
          outcome: c.outcome,
          returned:
            c.returned === undefined
              ? undefined
              : c.order === 1
                ? runtimeChaining(c.returned)
                : observed(c.returned),
          sqlstate: c.sqlstate,
          message: c.message,
          arguments: c.arguments.map((a) => ({
            parameter: a.parameter,
            class: a.class,
            domain: a.domain,
            declaredType: a.declaredType,
            value:
              a.bindText.length > 200
                ? {
                    sha256: sha256OfText(a.bindText),
                    bytes: Buffer.byteLength(a.bindText),
                    elidedSee: 'E.expectation-payload.json',
                  }
                : a.bindText,
          })),
        })),
        runtimeBinding: positive.runtimeBinding,
        failure: positive.failure,
        committed: positive.committed,
      };
      const call6 = positive.calls[5];
      evidence.call6CatalogLoad = {
        function: call6?.function,
        outcome: call6?.outcome,
        returnedRelationCount: call6?.returned === undefined ? null : observed(call6.returned),
        expectedRelationCount: derivedExpectation(derivation.payload.p_relation_names.length),
        historical42883Recurred: call6?.sqlstate === '42883',
      };
      if (!positive.committed) {
        stop = `STOP — NEW M7 NORMATIVE / AUTHORITY DEFECT DISCOVERED (or installation failure): ${JSON.stringify(positive.failure)}`;
      } else {
        d0312.finalAssertion = true;
        // VBA-FX-9 post-commit checks (actual observations after commit).
        const post = await withLogin(
          envRef.cluster,
          migrationRole,
          envRef.credentials.get(migrationRole)!,
          db,
          async (c) => {
            const prof = (
              await c.query(
                `SELECT "backendSha256" AS b, "registeredBy"::text AS by FROM m7.m7_storage_profile WHERE "storageProfileVersion" = $1`,
                [VBCP_IDENTITIES.storageProfileVersion],
              )
            ).rows[0];
            const inst = (
              await c.query(
                `SELECT "id"::text AS id, "manifestVersion" AS mv, "installedBy"::text AS by, "retiredAt" FROM m7.m7_control_plane_installation`,
              )
            ).rows;
            const man = (
              await c.query(
                `SELECT "manifestSha256" AS d, "registeredBy"::text AS by FROM m7.m7_control_plane_manifest WHERE "manifestVersion" = $1`,
                [VBCP_IDENTITIES.manifestVersion],
              )
            ).rows[0];
            return { prof, inst, man };
          },
        );
        const rb = positive.runtimeBinding;
        const versionReturns = {
          policy: positive.calls[2]?.returned === VBCP_IDENTITIES.policyVersion,
          vocabulary: positive.calls[3]?.returned === VBCP_IDENTITIES.vocabularyVersion,
          manifest: positive.calls[4]?.returned === VBCP_IDENTITIES.manifestVersion,
        };
        evidence.runtimeBindingProof = {
          producer: rb?.producer,
          returnedValue: rb ? runtimeChaining(rb.returnedValue) : null,
          consumer: rb?.consumer,
          consumerParameter: rb?.consumerParameter,
          sentValue: rb ? runtimeChaining(rb.sentValue) : null,
          returnedEqualsSent: rb?.byteIdentical ?? false,
          committedProfileReferencesReturnedBackend: observed(post.prof?.b === rb?.returnedValue),
          versionStringsReturnedExactly: versionReturns,
          installationRows: observed(post.inst),
          manifestDigestEqualsFixtureDigest: observed(post.man?.d === build.fixtureDigest),
          registeredBy: observed({ profile: post.prof?.by, manifest: post.man?.by }),
        };
        const bindingOk =
          (rb?.byteIdentical ?? false) &&
          post.prof?.b === rb?.returnedValue &&
          versionReturns.policy &&
          versionReturns.vocabulary &&
          versionReturns.manifest &&
          post.man?.d === build.fixtureDigest;
        results.push({
          id: 'VBA-FX-9',
          clause: 'VBA-01 VBA-FX-9 runtime binding; VBA-OR-3 / VBA-OR-5 installation',
          actor: `migration role ${migrationRole}`,
          session: null,
          operation: 'F01 … F25, F26-prefix, seven M7-S03-VBCP calls, F26-suffix (one transaction)',
          expected:
            'direct immediately-before-F26-suffix checkpoint session_user = migration role, current_user = pagamenos_m7_owner; F26-suffix completes without exception; backendSha256 returned = sent; committed profile references it; policy / vocabulary / manifest calls return their FIXED version strings; manifestSha256 = fixtureDigest',
          observed: `committed; final checkpoint ${JSON.stringify(positive.finalCheckpoint && { s: positive.finalCheckpoint.sessionUser, c: positive.finalCheckpoint.currentUser })}; call 6 returned ${String(call6?.returned)}; binding byte-identical=${rb?.byteIdentical}; profile→backend=${post.prof?.b === rb?.returnedValue}; versions=${JSON.stringify(versionReturns)}`,
          sqlstate: null,
          verdict:
            bindingOk &&
            call6?.returned === derivation.payload.p_relation_names.length &&
            positive.finalCheckpoint?.sessionUser === derivation.catalog.migrationRole &&
            positive.finalCheckpoint?.currentUser === derivation.catalog.ownerRole
              ? 'PASS'
              : 'FAIL',
        });

        const ctx = new VerificationContext(
          {
            host: '127.0.0.1',
            port: envRef.cluster.port,
            database: db,
            adminUser: envRef.cluster.adminUser,
            adminPassword: envRef.cluster.secrets()[0]!,
            credentials: envRef.credentials,
          },
          derivation.catalog,
          build.fixtureDigest,
          migrationRole,
        );
        try {
          const cp = await runControlPlaneChecks(ctx);
          d0312 = { ...d0312, ...cp };
          const participants = await buildA1A2Participants(databaseUrl(envRef, migrationRole, db), [
            { label: 'A', intents: 1 },
            { label: 'B', intents: 1 },
            { label: 'C', intents: 1 },
          ]);
          evidence.a1a2Fixture = {
            via: 'sanctioned A1/A2 services (src/services), DATABASE_URL = migration role',
            a2BuildProvenanceTestConstant: fixedInput(A2_TEST_BUILD_GIT_SHA),
            participants: participants.map((p) => ({
              label: p.label,
              intents: p.intentIds.length,
            })),
          };
          const st = await runPositivePaths(ctx, {
            A: participants[0]!,
            B: participants[1]!,
            C: participants[2]!,
          });
          for (const p of STORE_OR_SIGN_POSITIVE_PATHS) {
            ctx.record({
              id: `PP-${p.fn.replace(/^m7\./, '')}`,
              clause: 'VBA-01 VBA-SC-1 item 5 / VBA-SC-3',
              actor: '—',
              session: null,
              operation: `${p.fn} positive path`,
              expected: '—',
              observed: '—',
              sqlstate: null,
              verdict: 'NOT_EXECUTED',
              note: `NOT_EXECUTED — ${p.reason}`,
            });
          }
          await runFamilyA(ctx, { assertionId: st.assertionId });
          await runT09(ctx, legacy);
          await runSearchPathCases(ctx, st);
          const probe = DISPOSABLE_VERIFICATION_ROLES.probe.name;
          const probePw = generateSecret();
          secrets.push(probePw);
          await envRef.cluster.withAdmin('postgres', (c) =>
            c.query(
              `CREATE ROLE ${probe} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${probePw}'`,
            ),
          );
          envRef.credentials.set(probe, probePw);
          await runT77(ctx, probe);
          await runT79(ctx);
          await runT80(ctx);
          await runReversibleInjections(ctx, legacy);
          const endZero = await ctx.verifyAsWorker();
          ctx.record({
            id: 'VBCP-VERIFY-ZERO-AFTER-INJECTIONS',
            clause: 'VBA-01 VBA-TX-3 (every reversible injection reversed)',
            actor: 'worker',
            session: null,
            operation:
              'w_verify_control_plane_catalog_v1(<fixtureDigest>) after all reversible cases',
            expected: 'zero rows',
            observed: endZero.ok
              ? `${endZero.violations.length} row(s) ${endZero.violations.join(' | ')}`
              : `SQLSTATE ${endZero.sqlstate}`,
            sqlstate: endZero.sqlstate,
            verdict: endZero.ok && endZero.violations.length === 0 ? 'PASS' : 'FAIL',
          });

          // T-137b third sub-case: its own freshly installed disposable database.
          const db2 = 's03_positive_t137b';
          await freshMigratedDatabase(envRef, db2, ROOT);
          const positive2 = await withLogin(
            envRef.cluster,
            migrationRole,
            envRef.credentials.get(migrationRole)!,
            db2,
            (c) => runPositiveInstall(c, installInput),
          );
          assertNoInterleaving(positive2.journal);
          evidence.secondInstallForT137b = {
            database: db2,
            committed: positive2.committed,
            failure: positive2.failure,
            calls: positive2.calls.map((c) => ({
              order: c.order,
              function: c.function,
              outcome: c.outcome,
            })),
          };
          const ctx2 = new VerificationContext(
            { ...ctx.target, database: db2 },
            derivation.catalog,
            build.fixtureDigest,
            migrationRole,
          );
          try {
            if (positive2.committed)
              await runT137bRetiredProfile(ctx2, VBCP_IDENTITIES.storageProfileVersion);
            else
              ctx2.record({
                id: 'T-137b/retired-profile',
                clause: 'V1.1 §25.17 T-137b',
                actor: '—',
                session: null,
                operation: '—',
                expected: '—',
                observed: `second install failed: ${JSON.stringify(positive2.failure)}`,
                sqlstate: positive2.failure?.sqlstate ?? null,
                verdict: 'BLOCKED',
              });
          } finally {
            results.push(...ctx2.results);
            await ctx2.close();
          }

          // T-133 second clause, terminal for the cluster.
          await runT133MemberMissing(ctx);
        } finally {
          results.push(...ctx.results);
          await ctx.close();
        }
      }
      teardowns.push(await destroyEnvironment(envP));
      envP = undefined;
    }
  } catch (error) {
    const e = error as Error;
    stop ??=
      e instanceof S03DefectStop
        ? `STOP ON FAIL: ${e.result.id} — ${e.result.observed}`
        : `HARNESS ERROR: ${e.stack ?? e.message}`;
  } finally {
    if (envC) teardowns.push(await destroyEnvironment(envC));
    if (envP) teardowns.push(await destroyEnvironment(envP));
  }
  events.push('all-environments-destroyed', teardowns);

  // ---------------------------------------------------------------- Phase 3: post-teardown re-derivation
  const d1 = derive();
  const reDerivation = {
    expectationPayloadSha256Equal:
      d1.build.expectationPayloadSha256 === build.expectationPayloadSha256,
    fixtureDigestEqual: d1.build.fixtureDigest === build.fixtureDigest,
    canonicalEByteIdentical: canonicalize(d1.derivation.payload) === eCanonical,
    canonicalFByteIdentical: canonicalize(d1.build.fixture) === fCanonical,
    entriesSha256Equal: d1.build.entriesSha256 === build.entriesSha256,
  };
  events.push('post-teardown-re-derivation', reDerivation);

  const notExecuted = [
    [
      'STORE',
      'V1.1 §25.1 VC-2: cases marked STORE need a real object store (or a double itself tested against the real provider); VBA-LB-3 / VBA-SC-3',
    ],
    ['2STORE', 'V1.1 §25.1 VC-2: two distinct real backends; VBA-SC-3'],
    [
      'SIGN',
      'V1.1 §25.1 VC-8: the deployed capability signer, its module and real provider credential; VBA-SC-3',
    ],
    [
      'real object-store cases',
      'no real object store is reachable from a disposable S03 run (VBA-FX-3: the fixture backend authenticates against nothing)',
    ],
    ['real signer cases', 'no deployed signer exists (VC-8)'],
    ['real deployment cases', 'deployment / Wave 0 not authorized; VBA-LB-1 item 7'],
    [
      'T-81 PostgreSQL 14 sub-case',
      'no PostgreSQL 14 binary; VBA-SC-3; VFC-PG-1 scopes S03 to ≥ 16',
    ],
    [
      'hosted required-check surface (VC-1)',
      'local evidence does not discharge the hosted required-check surface (VBA-SC-3); not executed',
    ],
    ['§24.3 CI additions', 'not implemented / not executed by this work package (VBA-SC-3)'],
  ].map(([item, reason]) => ({
    item,
    verdict: 'NOT_EXECUTED',
    reason: `NOT_EXECUTED — ${reason}`,
  }));

  const seenIds = new Set<string>();
  const duplicateIds = results.map((r) => r.id).filter((id) => !seenIds.add(id));
  if (duplicateIds.length > 0)
    stop ??= `HARNESS ERROR: duplicate case ids ${duplicateIds.join(',')}`;
  const verdictCounts: Record<string, number> = {};
  for (const r of results) verdictCounts[r.verdict] = (verdictCounts[r.verdict] ?? 0) + 1;
  const failures = results.filter((r) => r.verdict === 'FAIL' || r.verdict === 'BLOCKED');
  const d0312Closed =
    d0312.finalAssertion && d0312.verifierZero && d0312.assertSuccess && d0312.otherDigestMismatch;
  Object.assign(evidence, {
    events: events.events,
    preExecutionEvidence: { preSha, eSha, fSha },
    d03_12: { ...d0312, closedPredicates: d0312Closed },
    cases: results,
    verdictCounts,
    notExecuted,
    teardown: teardowns,
    reDerivation,
    stop,
    isolation: {
      productionManifestProduced: false,
      authorityArtifactProduced: false,
      selectorValueProduced: false,
      deploymentStateProduced: false,
      acceptedAuthorityBaseShaAsserted: false,
    },
  });
  const outPath = join(args.evidenceDir, 'run-evidence.json');
  const runSha = writeEvidenceFile(outPath, evidence, secrets, ports);
  console.log('\n[m7:s03] ─── S03 summary ───');
  for (const r of results)
    console.log(
      `[m7:s03] ${r.verdict.padEnd(12)} ${r.id}${r.verdict === 'FAIL' ? ` — ${r.observed.slice(0, 300)}` : ''}`,
    );
  console.log(`[m7:s03] verdicts ${JSON.stringify(verdictCounts)}`);
  console.log(`[m7:s03] D03-12 predicates ${JSON.stringify(d0312)}`);
  console.log(`[m7:s03] re-derivation ${JSON.stringify(reDerivation)}`);
  console.log(`[m7:s03] teardown ${JSON.stringify(teardowns)}`);
  if (stop) console.log(`[m7:s03] ${stop.split('\n')[0]}`);
  console.log(`[m7:s03] evidence ${outPath} (sha256 ${runSha})`);
  const reOk = Object.values(reDerivation).every(Boolean);
  const tdOk = teardowns.every(
    (t) =>
      t.dataDirectoryRemoved &&
      t.portClosed &&
      t.credentialsDiscarded &&
      t.survivingProcesses === 0,
  );
  return !stop && failures.length === 0 && d0312Closed && reOk && tdOk ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
