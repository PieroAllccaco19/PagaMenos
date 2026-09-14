// M7 V1.1 — S01: extraction-time preconditions of Erratum 01 ER-01 (MD-1…MD-7, MG-1…MG-6).
//
// These are PRECONDITION checks over the accepted normative fragments only. S01 computes no manifest
// digest `D`, no `migrationSha256`, authors no manifest and assembles no migration. What is checked is
// that the accepted template satisfies what MD-3 / MG-3 derive from it:
//   • the placeholder `P` (MD-1) occurs nowhere in the fragments;
//   • the §19.13.4 install sequence carries exactly two `<manifestSha256>` template arguments, as the
//     second argument of the single `c_register_manifest_v1` call and of the single
//     `c_activate_manifest_v1` call, and none occurs anywhere else;
//   • both functions name that parameter `p_manifest_sha256` in §19.11.2 (MD-3);
//   • no normative SQL — in particular no function body — carries a concrete digest literal (MG-3 (d)).
import type { NormativeFragment } from './fragments';

/** MD-1: `sha256:` followed by sixty-four `x` (U+0078); 71 ASCII bytes. */
export const PLACEHOLDER_P = `sha256:${'x'.repeat(64)}`;
export const MANIFEST_DIGEST_TEMPLATE = '<manifestSha256>';
export const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

/** The subset of a fragment the checker reads, so negative controls can mutate copies freely. */
export interface CheckedFragment {
  readonly id: string;
  readonly clause: string;
  readonly bodyFirstLine: number;
  readonly sql: string;
}

export function toCheckedFragments(fragments: readonly NormativeFragment[]): CheckedFragment[] {
  return fragments.map((f) => ({
    id: f.anchor.id,
    clause: f.anchor.clause,
    bodyFirstLine: f.bodyFirstLine,
    sql: f.sql,
  }));
}

export interface TemplateLocation {
  readonly fragment: string;
  readonly clause: string;
  readonly sourceLine: number;
  readonly column: number;
  readonly call: string | null;
  readonly argumentIndex: number | null;
  readonly lineText: string;
}

export interface MdMgPreconditionResult {
  readonly placeholder: {
    readonly value: string;
    readonly byteLength: number;
    readonly matchesDigestPattern: boolean;
    readonly occurrencesInFragments: number;
    readonly fragmentsContaining: readonly string[];
  };
  readonly manifestSha256Template: {
    readonly occurrencesInFragments: number;
    readonly locations: readonly TemplateLocation[];
    readonly installSequenceClause: string;
    readonly registerCallsInInstallSequence: number;
    readonly activateCallsInInstallSequence: number;
  };
  readonly parameterNames: {
    readonly c_register_manifest_v1: readonly string[];
    readonly c_activate_manifest_v1: readonly string[];
  };
  readonly concreteDigestScan: {
    readonly prefixedDigestLiteralsInFragments: number;
    readonly bareHex64InFragments: number;
    readonly functionBodiesScanned: number;
    readonly prefixedDigestLiteralsInFunctionBodies: number;
    readonly bareHex64InFunctionBodies: number;
  };
  readonly violations: readonly string[];
}

const INSTALL_CLAUSE = '19.13.4';
const SIGNATURE_CLAUSE = '19.11.2';
const DESIGNATED_CALLS = ['c_register_manifest_v1', 'c_activate_manifest_v1'] as const;
const PREFIXED_DIGEST = /sha256:[0-9a-f]{64}(?![0-9a-f])/g;
const BARE_HEX64 = /(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])/g;

function count(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

function countLiteral(text: string, needle: string): number {
  let n = 0;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) n += 1;
  return n;
}

/** Top-level argument list of the first `m7.<fn>(…)` call on a line; `null` when absent. */
function callArguments(line: string, fn: string): string[] | null {
  const start = line.indexOf(`m7.${fn}(`);
  if (start < 0) return null;
  let depth = 0;
  let current = '';
  const args: string[] = [];
  for (let i = start + fn.length + 4; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '(') depth += 1;
    if (ch === ')') {
      if (depth === 0) {
        args.push(current.trim());
        return args;
      }
      depth -= 1;
    }
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  return null;
}

function signatureParameters(sql: string, fn: string): string[] {
  const start = sql.indexOf(`CREATE FUNCTION m7.${fn}(`);
  if (start < 0) return [];
  const end = sql.indexOf(') RETURNS', start);
  if (end < 0) return [];
  return sql
    .slice(start + `CREATE FUNCTION m7.${fn}(`.length, end)
    .split(',')
    .map((p) => p.trim().split(/\s+/)[0] ?? '');
}

/** Bodies of every `CREATE FUNCTION` in the fragments: text between `AS $tag$` and the closing `$tag$`. */
export function functionBodies(
  fragments: readonly CheckedFragment[],
): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  for (const f of fragments) {
    const lines = f.sql.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^CREATE FUNCTION m7\.([a-z0-9_]+)\(/.exec(lines[i]!);
      if (!m) continue;
      let j = i;
      while (j < lines.length && !/^AS \$([A-Za-z_]*)\$/.test(lines[j]!)) j += 1;
      const tag = /^AS \$([A-Za-z_]*)\$/.exec(lines[j] ?? '')?.[1];
      if (tag === undefined) throw new Error(`${f.id}: function ${m[1]} has no AS $tag$ body`);
      const close = new RegExp(`^\\$${tag}\\$`);
      let k = j + 1;
      while (k < lines.length && !close.test(lines[k]!)) k += 1;
      if (k === lines.length) throw new Error(`${f.id}: function ${m[1]} body is not closed`);
      out.push({ name: m[1]!, body: lines.slice(j, k + 1).join('\n') });
      i = k;
    }
  }
  return out;
}

export function checkMdMgPreconditions(
  fragments: readonly CheckedFragment[],
): MdMgPreconditionResult {
  const violations: string[] = [];

  // MD-1 — P itself, and its absence from every fragment (MD-4 (a) / MG-3 (a) preconditions).
  const pBytes = new TextEncoder().encode(PLACEHOLDER_P).byteLength;
  const pMatches = DIGEST_PATTERN.test(PLACEHOLDER_P);
  if (pBytes !== 71) violations.push(`MD-1: P is ${pBytes} bytes, expected 71`);
  if (pMatches) violations.push('MD-1: P matches the digest pattern');
  const fragmentsContainingP = fragments
    .filter((f) => f.sql.includes(PLACEHOLDER_P))
    .map((f) => f.id);
  const pOccurrences = fragments.reduce((n, f) => n + countLiteral(f.sql, PLACEHOLDER_P), 0);
  if (pOccurrences !== 0) {
    violations.push(
      `MD-1/MG-3(a): P occurs ${pOccurrences} time(s) in ${fragmentsContainingP.join(', ')}`,
    );
  }

  // MD-3 / MG-3 — the two designated template arguments of §19.13.4.
  const locations: TemplateLocation[] = [];
  for (const f of fragments) {
    f.sql.split('\n').forEach((lineText, i) => {
      for (let col = lineText.indexOf(MANIFEST_DIGEST_TEMPLATE); col !== -1;) {
        let call: string | null = null;
        let argumentIndex: number | null = null;
        for (const fn of DESIGNATED_CALLS) {
          const args = callArguments(lineText, fn);
          if (args) {
            call = fn;
            const idx = args.indexOf(MANIFEST_DIGEST_TEMPLATE);
            argumentIndex = idx >= 0 ? idx : null;
          }
        }
        locations.push({
          fragment: f.id,
          clause: f.clause,
          sourceLine: f.bodyFirstLine + i,
          column: col + 1,
          call,
          argumentIndex,
          lineText,
        });
        col = lineText.indexOf(MANIFEST_DIGEST_TEMPLATE, col + MANIFEST_DIGEST_TEMPLATE.length);
      }
    });
  }
  const install = fragments.filter((f) => f.clause === INSTALL_CLAUSE);
  if (install.length !== 1)
    violations.push(`install sequence fragment §${INSTALL_CLAUSE} not found exactly once`);
  const installSql = install[0]?.sql ?? '';
  const registerCalls = countLiteral(installSql, 'SELECT m7.c_register_manifest_v1(');
  const activateCalls = countLiteral(installSql, 'SELECT m7.c_activate_manifest_v1(');
  if (registerCalls !== 1)
    violations.push(
      `MD-3: ${registerCalls} c_register_manifest_v1 calls in §${INSTALL_CLAUSE}, expected 1`,
    );
  if (activateCalls !== 1)
    violations.push(
      `MD-3: ${activateCalls} c_activate_manifest_v1 calls in §${INSTALL_CLAUSE}, expected 1`,
    );
  if (locations.length !== 2) {
    violations.push(
      `MD-3/MG-3: ${locations.length} <manifestSha256> template arguments, expected exactly 2`,
    );
  }
  const designated = locations.filter(
    (l) => l.clause === INSTALL_CLAUSE && l.call !== null && l.argumentIndex === 1,
  );
  const undesignated = locations.filter((l) => !designated.includes(l));
  if (undesignated.length > 0) {
    violations.push(
      `MD-3/MG-3: <manifestSha256> outside a designated slot at source line(s) ${undesignated.map((l) => l.sourceLine).join(', ')}`,
    );
  }
  const designatedCalls = designated.map((l) => l.call);
  if (JSON.stringify(designatedCalls) !== JSON.stringify([...DESIGNATED_CALLS])) {
    violations.push(
      `MD-3/MG-3: designated slots are ${JSON.stringify(designatedCalls)}, expected one per call, register before activate`,
    );
  }

  // MD-3 — both functions name the designated parameter p_manifest_sha256 (second parameter).
  const signatures = fragments.filter((f) => f.clause === SIGNATURE_CLAUSE);
  const signatureSql = signatures[0]?.sql ?? '';
  const registerParams = signatureParameters(signatureSql, 'c_register_manifest_v1');
  const activateParams = signatureParameters(signatureSql, 'c_activate_manifest_v1');
  for (const [fn, params] of [
    ['c_register_manifest_v1', registerParams],
    ['c_activate_manifest_v1', activateParams],
  ] as const) {
    if (params[1] !== 'p_manifest_sha256') {
      violations.push(
        `MD-3: §${SIGNATURE_CLAUSE} ${fn} second parameter is ${JSON.stringify(params[1])}`,
      );
    }
  }

  // MG-3 (d) precondition — no concrete digest literal in normative SQL, in particular function bodies.
  const allSql = fragments.map((f) => f.sql).join('\n');
  const bodies = functionBodies(fragments);
  const bodyText = bodies.map((b) => b.body).join('\n');
  const scan = {
    prefixedDigestLiteralsInFragments: count(allSql, PREFIXED_DIGEST),
    bareHex64InFragments: count(allSql, BARE_HEX64),
    functionBodiesScanned: bodies.length,
    prefixedDigestLiteralsInFunctionBodies: count(bodyText, PREFIXED_DIGEST),
    bareHex64InFunctionBodies: count(bodyText, BARE_HEX64),
  };
  if (scan.prefixedDigestLiteralsInFragments !== 0) {
    violations.push(
      `MG-3(d): ${scan.prefixedDigestLiteralsInFragments} concrete sha256: digest literal(s) in normative SQL`,
    );
  }
  if (scan.bareHex64InFragments !== 0) {
    violations.push(
      `MG-3(d): ${scan.bareHex64InFragments} bare 64-hex literal(s) in normative SQL`,
    );
  }

  return {
    placeholder: {
      value: PLACEHOLDER_P,
      byteLength: pBytes,
      matchesDigestPattern: pMatches,
      occurrencesInFragments: pOccurrences,
      fragmentsContaining: fragmentsContainingP,
    },
    manifestSha256Template: {
      occurrencesInFragments: locations.length,
      locations,
      installSequenceClause: INSTALL_CLAUSE,
      registerCallsInInstallSequence: registerCalls,
      activateCallsInInstallSequence: activateCalls,
    },
    parameterNames: {
      c_register_manifest_v1: registerParams,
      c_activate_manifest_v1: activateParams,
    },
    concreteDigestScan: scan,
    violations,
  };
}

export interface NegativeControl {
  readonly id: string;
  readonly mutation: string;
  readonly expectedToFail: true;
  readonly failed: boolean;
  readonly violations: readonly string[];
}

function mutate(
  fragments: readonly CheckedFragment[],
  clause: string,
  fn: (sql: string) => string,
): CheckedFragment[] {
  let hit = 0;
  const out = fragments.map((f) => {
    if (f.clause !== clause) return f;
    hit += 1;
    const sql = fn(f.sql);
    if (sql === f.sql) throw new Error(`negative control mutation of §${clause} changed nothing`);
    return { ...f, sql };
  });
  if (hit !== 1) throw new Error(`negative control target §${clause} not found exactly once`);
  return out;
}

const REGISTER_LINE =
  '--   SELECT m7.c_register_manifest_v1(<manifestVersion>, <manifestSha256>, ...);';
const ACTIVATE_LINE = '--   SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestSha256>);';

/**
 * In-memory negative controls: each alters the occurrence cardinality or position of the template, or
 * plants a forbidden literal, in a COPY of the fragments. Every control must be refused.
 */
export function runNegativeControls(fragments: readonly CheckedFragment[]): NegativeControl[] {
  const concrete = `sha256:${'0123456789abcdef'.repeat(4)}`;
  const controls: { id: string; mutation: string; apply: () => CheckedFragment[] }[] = [
    {
      id: 'NC-1',
      mutation: 'add a third <manifestSha256> argument to the §19.13.4 install sequence',
      apply: () =>
        mutate(fragments, INSTALL_CLAUSE, (s) =>
          s.replace(
            ACTIVATE_LINE,
            `${ACTIVATE_LINE}\n--   SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestSha256>);`,
          ),
        ),
    },
    {
      id: 'NC-2',
      mutation: 'remove one <manifestSha256> argument (activate call)',
      apply: () =>
        mutate(fragments, INSTALL_CLAUSE, (s) =>
          s.replace(
            ACTIVATE_LINE,
            '--   SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestVersion>);',
          ),
        ),
    },
    {
      id: 'NC-3',
      mutation: 'move the register call template to the first (non-designated) argument position',
      apply: () =>
        mutate(fragments, INSTALL_CLAUSE, (s) =>
          s.replace(
            REGISTER_LINE,
            '--   SELECT m7.c_register_manifest_v1(<manifestSha256>, <manifestVersion>, ...);',
          ),
        ),
    },
    {
      id: 'NC-4',
      mutation: 'add a <manifestSha256> occurrence outside the install sequence (§19.11.2)',
      apply: () =>
        mutate(fragments, SIGNATURE_CLAUSE, (s) => `-- stray template <manifestSha256>\n${s}`),
    },
    {
      id: 'NC-5',
      mutation: 'plant the placeholder P in a normative fragment (§19.4)',
      apply: () => mutate(fragments, '19.4', (s) => `-- ${PLACEHOLDER_P}\n${s}`),
    },
    {
      id: 'NC-6',
      mutation: 'plant a concrete sha256: digest literal inside a function body (§19.11.2)',
      apply: () =>
        mutate(fragments, SIGNATURE_CLAUSE, (s) =>
          s.replace(
            "PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true);",
            `PERFORM pg_catalog.set_config('pagamenos.m7.write_path', 'M7_CONTROL_PLANE_INSTALL_V1', true); -- '${concrete}'`,
          ),
        ),
    },
    {
      id: 'NC-7',
      mutation:
        'place both templates in the register call and none in the activate call (cardinality 2, wrong slots)',
      apply: () =>
        mutate(fragments, INSTALL_CLAUSE, (s) =>
          s
            .replace(
              ACTIVATE_LINE,
              '--   SELECT m7.c_activate_manifest_v1(<manifestVersion>, <manifestVersion>);',
            )
            .replace(
              REGISTER_LINE,
              '--   SELECT m7.c_register_manifest_v1(<manifestVersion>, <manifestSha256>, <manifestSha256>);',
            ),
        ),
    },
    {
      id: 'NC-8',
      mutation: 'rename the §19.11.2 activate parameter p_manifest_sha256',
      apply: () =>
        mutate(fragments, SIGNATURE_CLAUSE, (s) =>
          s.replace(
            'CREATE FUNCTION m7.c_activate_manifest_v1(p_manifest_version text, p_manifest_sha256 text)',
            'CREATE FUNCTION m7.c_activate_manifest_v1(p_manifest_version text, p_digest text)',
          ),
        ),
    },
  ];
  return controls.map((c) => {
    const result = checkMdMgPreconditions(c.apply());
    return {
      id: c.id,
      mutation: c.mutation,
      expectedToFail: true,
      failed: result.violations.length > 0,
      violations: result.violations,
    };
  });
}
