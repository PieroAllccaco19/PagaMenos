// M7 V1.1 — S01: the Erratum 01 override table.
//
// The clauses S01 must read differently because accepted Erratum 01 amends them (Register §12;
// Erratum 01 §2.1). Each row records the S01 reading and is verified mechanically against BOTH accepted
// documents: the "Before" text must be present in the V1.1 bytes, the "After" text in the Erratum 01
// bytes, and every derived quantity must equal what the accepted bytes yield. Nothing here edits either
// document, executes a lifecycle event, chooses a baseline commit, or computes a manifest digest.
import type { NormativeFragment } from './fragments';
import type { Inventory } from './inventory';
import type { MdMgPreconditionResult, NegativeControl } from './manifest-digest-preconditions';
import { countOccurrences, parseMarkdown, sectionLines } from './source';

export interface OverrideEvidence {
  readonly check: string;
  readonly observed: unknown;
  readonly expected: unknown;
  readonly pass: boolean;
}

export interface OverrideRecord {
  readonly id: 'ER-01' | 'ER-02' | 'ER-03' | 'ER-04' | 'ER-05';
  readonly subject: string;
  readonly amendedClauses: readonly string[];
  readonly s01Reading: Record<string, unknown>;
  readonly evidence: readonly OverrideEvidence[];
  readonly pass: boolean;
}

/** Erratum 01 §9.0 — lifecycle event names (normative). */
export const LIFECYCLE_EVENTS = [
  ['LC-1', 'IMPLEMENTATION CANDIDATE COMPLETION'],
  ['LC-2', 'PRE-PUBLICATION TECHNICAL VERIFICATION'],
  ['LC-3', 'MANIFEST INDEPENDENT REVIEW AND ACCEPTANCE'],
  ['LC-4', 'MACHINE-READABLE AUTHORITY PUBLICATION'],
  ['LC-5', 'PRIVILEGED SELECTOR ROTATION'],
  ['LC-6', 'POST-ROTATION MA VERIFICATION'],
  ['LC-7', 'GATE-2 M7 IMPLEMENTATION / RUNTIME ACCEPTANCE'],
] as const;

/** Erratum 01 §7.2 — the relations PA-1 enumerates as explicitly row-locked by accepted A1/A2 code. */
export const PA_1_RELATIONS = [
  'public.experiment_assignment',
  'public.purchase_intent',
  'public.analysis_protocol',
] as const;

type Section = { line: number; text: string }[];

function joined(section: Section): string {
  return section.map((l) => l.text).join('\n');
}

function ev(check: string, observed: unknown, expected: unknown): OverrideEvidence {
  return { check, observed, expected, pass: JSON.stringify(observed) === JSON.stringify(expected) };
}

function occurs(check: string, section: Section, excerpt: string, times = 1): OverrideEvidence {
  return ev(check, countOccurrences(joined(section), excerpt), times);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function record(
  id: OverrideRecord['id'],
  subject: string,
  amendedClauses: string[],
  s01Reading: Record<string, unknown>,
  evidence: OverrideEvidence[],
): OverrideRecord {
  return { id, subject, amendedClauses, s01Reading, evidence, pass: evidence.every((e) => e.pass) };
}

export interface OverrideInputs {
  readonly v11Text: string;
  readonly e01Text: string;
  readonly fragments: readonly NormativeFragment[];
  readonly inventory: Inventory;
  readonly preconditions: MdMgPreconditionResult;
  readonly negativeControls: readonly NegativeControl[];
}

export function verifyErratum01Overrides(inputs: OverrideInputs): OverrideRecord[] {
  const v11 = parseMarkdown(inputs.v11Text);
  const e01 = parseMarkdown(inputs.e01Text);
  const inv = inputs.inventory;

  // ---------------------------------------------------------------------------------------------
  // ER-02 — six credential keys (§24.3) and six login roles (T-08b).
  // ---------------------------------------------------------------------------------------------
  const e01s6 = sectionLines(e01, '## 6. ', 2);
  const v11s243 = sectionLines(v11, '### 24.3 ', 3);
  const v11s252 = sectionLines(v11, '### 25.2 ', 3);
  const afterBullet = e01s6.filter((l) =>
    l.text.includes('the **six** new M7 database credential environment-key names of §18.3'),
  );
  const afterKeys = sortedUnique(
    afterBullet.flatMap((l) => l.text.match(/M7_[A-Z_]+_DATABASE_URL/g) ?? []),
  );
  const t08bV11 = v11s252.filter((l) => l.text.startsWith('| T-08b |')).map((l) => l.text);
  const t08bE01 = e01s6.filter((l) => l.text.startsWith('| T-08b |')).map((l) => l.text);
  const t08bBefore = t08bE01.filter((t) => t.includes('9 × 5'));
  const t08bAfter = t08bE01.filter((t) => t.includes('9 × 6'));
  const t08bAfterRoles = sortedUnique(
    t08bAfter.flatMap((t) => t.match(/pagamenos_m7_[a-z_]+_rt/g) ?? []),
  );
  const preamble = inputs.fragments.find((f) => f.anchor.clause === '19.2');
  const vLogin = /v_login\s+CONSTANT text\[\] := ARRAY\[([^\]]*)\]/.exec(preamble?.sql ?? '');
  const preambleLoginRoles = sortedUnique(vLogin?.[1]?.match(/pagamenos_m7_[a-z_]+_rt/g) ?? []);
  const cFunctions = inv.ddl.functionsByPrefix.c ?? 0;
  const loginRoles = sortedUnique(inv.roles.login);
  const credentialKeys = sortedUnique(inv.databaseCredentialEnvKeys);
  const er02 = record(
    'ER-02',
    'stale five-credential / five-login-role cardinality',
    ['V1.1 §24.3 third bullet', 'V1.1 §25.2 row T-08b (cardinality only)'],
    {
      section24_3CredentialEnvKeyCount: credentialKeys.length,
      section24_3CredentialEnvKeys: credentialKeys,
      t08bLoginRoleCount: loginRoles.length,
      t08bLoginRoles: loginRoles,
      t08bExpectedDenials: {
        cFunctions,
        loginRoles: loginRoles.length,
        total: cFunctions * loginRoles.length,
        sqlstate: '42501',
      },
      distinctTIdCount: inv.verificationCases.distinct,
    },
    [
      occurs(
        'V1.1 §24.3 carries the stale "five" bullet (Before)',
        v11s243,
        'extended to M7 modules, the five new credential names (§18.3) and the LO-3 function allowlist;',
      ),
      ev('Erratum 01 §6.2 After bullet present exactly once', afterBullet.length, 1),
      ev('After bullet keys == V1.1 §18.3 keys', afterKeys, credentialKeys),
      ev('V1.1 §18.3 credential env keys', credentialKeys.length, 6),
      ev('V1.1 §25.2 T-08b row present exactly once', t08bV11.length, 1),
      ev('Erratum 01 T-08b Before row == V1.1 T-08b row (verbatim)', t08bBefore, t08bV11),
      ev('Erratum 01 T-08b After row present exactly once', t08bAfter.length, 1),
      ev('T-08b After roles == V1.1 §18.2 login roles', t08bAfterRoles, loginRoles),
      ev('V1.1 §18.2 login roles', loginRoles.length, 6),
      ev('V1.1 §19.2 v_login array == §18.2 login roles', preambleLoginRoles, loginRoles),
      ev('m7.c_* function count (factor 9)', cFunctions, 9),
      ev('T-08b expected denials 9 × 6', cFunctions * loginRoles.length, 54),
      occurs(
        'Erratum 01: distinct T-ID total remains 209',
        e01s6,
        'The distinct T-ID total remains **209**.',
      ),
      ev('observed distinct T-IDs', inv.verificationCases.distinct, 209),
    ],
  );

  // ---------------------------------------------------------------------------------------------
  // ER-03 — PA-1 lock inventory includes analysis_protocol.
  // ---------------------------------------------------------------------------------------------
  const e01s7 = sectionLines(e01, '## 7. ', 2);
  const v11s1624 = sectionLines(v11, '#### 16.2.4 ', 4);
  const pa1After = e01s7.filter((l) =>
    l.text.includes('(iii) public.analysis_protocol (FOR UPDATE'),
  );
  const pa1Relations = [
    ...(pa1After[0]?.text ?? '').matchAll(/\((?:i|ii|iii)\) (public\.[a-z_]+)/g),
  ].map((m) => m[1]!);
  const fragmentSql = inputs.fragments.map((f) => f.sql).join('\n');
  const er03 = record(
    'ER-03',
    'PA-1 lock inventory',
    ['V1.1 §16.2.4 PA-1 row', 'V1.1 §16.2.4 consequence (b), first clause'],
    {
      pa1ExplicitlyLockedRelations: [...PA_1_RELATIONS],
      a1A2RuntimeCodeChangedByS01: false,
      lockBehaviourChanged: false,
    },
    [
      occurs(
        'V1.1 §16.2.4 carries the incomplete PA-1 inventory (Before)',
        v11s1624,
        // V1.1's own bytes keep the inline-code backticks that the Erratum 01 "Before" cell drops (§4 rule 1).
        '| **PA-1** | accepted A1 and A2 code issues explicit row locks only on `public.experiment_assignment` (`FOR UPDATE`, as the first lock of its transaction) and `public.purchase_intent`',
      ),
      ev('Erratum 01 §7.2 PA-1 After row present exactly once', pa1After.length, 1),
      ev('PA-1 After relations (i)(ii)(iii)', pa1Relations, [...PA_1_RELATIONS]),
      occurs(
        'Erratum 01 §7.2 consequence (b) After names analysis_protocol',
        e01s7,
        'or on `analysis_protocol` (held only by the A1 AnalysisProtocol freeze)',
      ),
      ev(
        'E01-PO-1: "analysis_protocol" occurrences in V1.1',
        countOccurrences(inputs.v11Text, 'analysis_protocol'),
        0,
      ),
      ev(
        'E01-PO-1: "analysis_protocol" occurrences in normative SQL',
        countOccurrences(fragmentSql, 'analysis_protocol'),
        0,
      ),
    ],
  );

  // ---------------------------------------------------------------------------------------------
  // ER-01 — manifest digest / migration digest derivation (preconditions only in S01).
  // ---------------------------------------------------------------------------------------------
  const e01s5 = sectionLines(e01, '## 5. ', 2);
  const ruleLines = (family: 'MD' | 'MG', n: number): number =>
    e01s5.filter((l) => l.text.startsWith(`- **${family}-${n} (`)).length;
  const er01 = record(
    'ER-01',
    'manifest digest ↔ migration digest dependency cycle',
    [
      'V1.1 §23.3 digest row',
      'V1.1 §23.4 database.migrationSha256 / database.controlPlaneInstall (derivation only)',
      'V1.1 §19.13.4 install-sequence comment (derivation only)',
      'V1.1 §23.5 last sentence (derivation only)',
      'V1.1 §24.2 MA-1 (reproduction procedure named)',
    ],
    {
      manifestDigestRules: 'MD-1…MD-7',
      migrationDigestRules: 'MG-1…MG-6',
      placeholderP: inputs.preconditions.placeholder.value,
      fixedPointHashing: false,
      rawMigrationFileChecksumIsMigrationSha256: false,
      finalManifestDigestComputedByS01: false,
      migrationSha256ComputedByS01: false,
      manifestAuthoredByS01: false,
      s01Scope:
        'extraction preconditions of MD-3 / MD-4 (a) / MG-3 (a), (d) over the accepted template',
    },
    [
      ...[1, 2, 3, 4, 5, 6, 7].map((n) =>
        ev(`Erratum 01 defines MD-${n} exactly once`, ruleLines('MD', n), 1),
      ),
      ...[1, 2, 3, 4, 5, 6].map((n) =>
        ev(`Erratum 01 defines MG-${n} exactly once`, ruleLines('MG', n), 1),
      ),
      occurs(
        'MD-1 placeholder definition present',
        e01s5,
        '`P` is the 71-byte ASCII string consisting of `sha256:` followed by sixty-four `x` characters (U+0078).',
      ),
      occurs(
        'MD-3 derives exactly two template arguments from V1.1 §19.13.4',
        e01s5,
        'V1.1 §19.13.4 contains exactly two `<manifestSha256>` arguments in its install sequence',
      ),
      occurs(
        'raw migration file checksum is not migrationSha256',
        e01s5,
        "The raw file SHA-256 of `B_mig` (for example a migration tool's own checksum) is **not** `migrationSha256` and MUST NOT be substituted for it.",
      ),
      ev(
        'no fixed-point search (MD-6 / MG-6)',
        countOccurrences(joined(e01s5), 'No fixed point is searched for') >= 2,
        true,
      ),
      ev('MD/MG extraction preconditions: violations', inputs.preconditions.violations, []),
      ev(
        'MD/MG negative controls: every control refused',
        inputs.negativeControls.filter((c) => !c.failed).map((c) => c.id),
        [],
      ),
    ],
  );

  // ---------------------------------------------------------------------------------------------
  // ER-04 — authority.baselineCommit is governed by BC-1…BC-6; S01 chooses none.
  // ---------------------------------------------------------------------------------------------
  const e01s8 = sectionLines(e01, '## 8. ', 2);
  const er04 = record(
    'ER-04',
    'meaning of authority.baselineCommit',
    ['V1.1 §23.4 authority row (meaning of baselineCommit)'],
    {
      governedBy: 'BC-1…BC-6',
      baselineCommit: null,
      determinedAt: 'LC-1, by BC-2 (verified at LC-3)',
      chosenOrHardCodedByS01: false,
    },
    [
      ...[1, 2, 3, 4, 5, 6].map((n) =>
        ev(
          `Erratum 01 defines BC-${n} exactly once`,
          e01s8.filter((l) => l.text.startsWith(`- **BC-${n} (`)).length,
          1,
        ),
      ),
      ev(
        'V1.1 names baselineCommit exactly once',
        countOccurrences(inputs.v11Text, 'baselineCommit'),
        1,
      ),
      occurs('BC-6: no baseline commit is hard-coded', e01s8, '`ca1be1b…` is **not** hard-coded.'),
    ],
  );

  // ---------------------------------------------------------------------------------------------
  // ER-05 — lifecycle terminology LC-1…LC-7 and corrected MA-6.
  // ---------------------------------------------------------------------------------------------
  const e01s9 = sectionLines(e01, '## 9. ', 2);
  const v11s242 = sectionLines(v11, '### 24.2 ', 3);
  const lcRows = e01s9
    .map((l) => /^\| \*\*(LC-\d)\*\* \| \*\*([^*]+)\*\* \|/.exec(l.text))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => [m[1]!, m[2]!]);
  const er05 = record(
    'ER-05',
    'MA-6 / selector rotation / Gate-2 lifecycle',
    ['V1.1 §24.2 MA-6', 'lifecycle event names for V1.1 §23.7 and §24.2'],
    {
      lifecycleEvents: LIFECYCLE_EVENTS.map(([id, name]) => ({ id, name })),
      ma6Reading:
        'selector rotation (LC-5) only after manifest independent review and acceptance (LC-3) and independent review of the publishing authority-baseline commit (LC-4); rotation neither requires nor implies Gate-2 acceptance (LC-7), which it precedes',
      lifecycleEventsExecutedByS01: [],
    },
    [
      ev(
        'Erratum 01 §9.0 LC table rows',
        lcRows,
        LIFECYCLE_EVENTS.map(([id, name]) => [id, name]),
      ),
      occurs(
        'V1.1 §24.2 carries the ambiguous MA-6 (Before)',
        v11s242,
        '| MA-6 | the selector rotation happens **after** independent acceptance, by a privileged owner',
      ),
      occurs(
        'Erratum 01 MA-6 After: LC-5 only after LC-3',
        e01s9,
        "the selector rotation (E01 LC-5) happens only **after** the manifest's independent review and acceptance (E01 LC-3)",
      ),
      occurs(
        'Erratum 01 MA-6 After: rotation precedes Gate 2 (LC-7)',
        e01s9,
        'The rotation neither requires nor implies Gate-2 implementation/runtime acceptance (E01 LC-7), which it precedes',
      ),
    ],
  );

  return [er01, er02, er03, er04, er05];
}
