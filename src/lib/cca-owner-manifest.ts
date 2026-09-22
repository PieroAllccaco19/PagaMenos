// PagaMenos · accepted transaction / assignment owner manifest (CCA Amendment 01 §33–§39, §42).
//
// CI TOOLING for the capability suites. The manifest is the §34 inventory, RE-ENUMERATED mechanically
// against this exact baseline rather than assumed (§34 note): 15 interactive transaction sites across
// 8 files, plus the two §33 class-B additions this candidate introduces (the governed client's single
// registration point and the CCA engine). Three classes exist, exactly as §33 requires:
//   A  accepted existing owners — unchanged capability, transparent registration only (§35, §40);
//   B  the new CCA owner (engine + its registration infrastructure);
//   C  everyone else — prohibited (an unknown owner or an unknown site count FAILS).
import ts from 'typescript';

export type OwnerClass =
  'ACCEPTED_A1_OWNER' | 'ACCEPTED_A2_OWNER' | 'ACCEPTED_BASE_OWNER' | 'CCA_GOVERNANCE_INFRA';

export interface TransactionOwner {
  /** Exact number of `$transaction` references (AST identifiers, comments excluded). */
  readonly sites: number;
  readonly class: OwnerClass;
  readonly authority: string;
}

export const ACCEPTED_TRANSACTION_OWNERS: Readonly<Record<string, TransactionOwner>> = {
  'db/purchase-intent-repository.ts': {
    sites: 6,
    class: 'ACCEPTED_A2_OWNER',
    authority: 'A2 §5–§10/§21/§24 (§34)',
  },
  'db/decision-snapshot-repository.ts': {
    sites: 2,
    class: 'ACCEPTED_BASE_OWNER',
    authority: 'base decision persistence, P35A-01 (§34, §34.2)',
  },
  'db/study-protocol-repository.ts': {
    sites: 2,
    class: 'ACCEPTED_BASE_OWNER',
    authority: 'base study AnalysisProtocol §2/§9 (§34, §34.2)',
  },
  'db/purchase-intent-decision-repository.ts': {
    sites: 1,
    class: 'ACCEPTED_A2_OWNER',
    authority: 'A2 §12/§16/§17/§19 (§34)',
  },
  'db/study-assignment-repository.ts': {
    sites: 1,
    class: 'ACCEPTED_BASE_OWNER',
    authority: 'base study ExperimentAssignment §7/§9 (§34, §34.1)',
  },
  'db/study-consent-repository.ts': {
    sites: 1,
    class: 'ACCEPTED_A1_OWNER',
    authority: 'A1 §8.6/§8.9/§8.10/§8.13 (§34, §34.1)',
  },
  'db/study-experiment-repository.ts': {
    sites: 1,
    class: 'ACCEPTED_BASE_OWNER',
    authority: 'base study Experiment §4/§9 (§34, §34.2)',
  },
  'db/study-participant-repository.ts': {
    sites: 1,
    class: 'ACCEPTED_BASE_OWNER',
    authority: 'base study StudyParticipant §5/§6/§9 (§34, §34.2)',
  },
  'cca/execution-context.ts': {
    sites: 4,
    class: 'CCA_GOVERNANCE_INFRA',
    authority: 'CCA §29/§35/§40 transparent registration + §33 class-B CCA transaction',
  },
};

export type AssignmentAccessClass =
  'ACCEPTED_ASSIGNMENT_OWNER' | 'CCA_ENGINE' | 'NON_RUNTIME_NORMATIVE_TEXT' | 'CAPABILITY_TOOLING';

export interface AssignmentOwner {
  readonly references: number;
  readonly class: AssignmentAccessClass;
  readonly authority: string;
}

export const ACCEPTED_ASSIGNMENT_ACCESS: Readonly<Record<string, AssignmentOwner>> = {
  'db/study-consent-repository.ts': {
    references: 2,
    class: 'ACCEPTED_ASSIGNMENT_OWNER',
    authority: 'A1 §8.10 consent serialization lock (§34.1)',
  },
  'db/purchase-intent-repository.ts': {
    references: 2,
    class: 'ACCEPTED_ASSIGNMENT_OWNER',
    authority: 'A2 §21 assignment-first lock (§34.1)',
  },
  'db/study-assignment-repository.ts': {
    references: 6,
    class: 'ACCEPTED_ASSIGNMENT_OWNER',
    authority: 'base study §7/§9 sole writer (§34.1)',
  },
  'db/cca-engine.ts': {
    references: 1,
    class: 'CCA_ENGINE',
    authority: 'CCA §13/§33 class B — the ONLY new assignment lock',
  },
  'm7/normative/erratum-01-overrides.ts': {
    references: 2,
    class: 'NON_RUNTIME_NORMATIVE_TEXT',
    authority: 'accepted M7 normative extraction text (no application DB access)',
  },
  'm7/normative/fragments.ts': {
    references: 1,
    class: 'NON_RUNTIME_NORMATIVE_TEXT',
    authority: 'accepted M7 normative extraction text',
  },
  'm7/s03/positive-paths.ts': {
    references: 3,
    class: 'NON_RUNTIME_NORMATIVE_TEXT',
    authority: 'accepted S03 verification harness SQL text (pg_temp fixture)',
  },
};

/**
 * Files permitted to use a raw SQL helper: the db layer, private tracked-adapter impls, and the
 * sanctioned M7 participant-session module.
 *
 * The third owner is an EXACT path, never a prefix or suffix, so no future service can match it by
 * naming. M7 V1.1 §8.2 requires that module to invoke `m7.s_issue_participant_session_v1` and
 * `m7.s_revoke_participant_session_v1` over its own `pagamenos_m7_session_issuer_rt` connection;
 * those are PostgreSQL functions of §19.11.3, not Prisma models, so there is no model-API spelling
 * of them. Its raw surface is exactly those two statements, it touches no table, it opens no
 * transaction (so it is not a transaction owner) and it never reaches `public.experiment_assignment`
 * (so the accepted assignment-owner census is untouched).
 */
export const RAW_SQL_ALLOWED = (rel: string): boolean =>
  rel.startsWith('db/') ||
  /\.cca-adapter\.tsx?$/.test(rel) ||
  rel === 'services/m7-participant-session.ts';

export interface SourceFile {
  readonly rel: string;
  readonly code: string;
}

function sourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('m.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function walkAst(code: string, visit: (n: ts.Node) => void): void {
  const rec = (n: ts.Node): void => {
    visit(n);
    ts.forEachChild(n, rec);
  };
  rec(sourceFile(code));
}

/**
 * Transaction ENTRY POINTS: a `.$transaction` member access, the computed `['$transaction']`
 * spelling, or a declaration/assignment of a `$transaction` member (a wrapper). Comments are not
 * AST nodes and never count; a mere string comparison against the name is not an entry point.
 */
export function countTransactionSites(code: string): number {
  let n = 0;
  walkAst(code, (node) => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === '$transaction') n++;
    else if (ts.isElementAccessExpression(node)) {
      const arg = node.argumentExpression;
      if (
        (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) &&
        arg.text === '$transaction'
      ) {
        n++;
      }
    } else if (
      (ts.isPropertySignature(node) ||
        ts.isPropertyAssignment(node) ||
        ts.isMethodSignature(node) ||
        ts.isMethodDeclaration(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === '$transaction'
    ) {
      n++;
    }
  });
  return n;
}

/** Direct `experiment_assignment` / ExperimentAssignment-delegate references. */
export function countAssignmentAccess(code: string): number {
  let n = 0;
  walkAst(code, (node) => {
    const isText =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node);
    if (isText && /experiment_assignment/.test(node.text)) n++;
    else if (
      ts.isPropertyAccessExpression(node) &&
      (node.name.text === 'experimentAssignment' ||
        node.name.text === 'experimentAssignmentReceipt')
    ) {
      n++;
    }
  });
  return n;
}

export function usesRawSqlHelper(code: string): boolean {
  let hit = false;
  walkAst(code, (node) => {
    if (
      ts.isIdentifier(node) &&
      /^(\$queryRaw|\$executeRaw|\$queryRawUnsafe|\$executeRawUnsafe)$/.test(node.text)
    ) {
      hit = true;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Prisma' &&
      node.name.text === 'sql'
    ) {
      hit = true;
    }
  });
  return hit;
}

/** §36: an unknown owner, a new site, or a vanished accepted owner all FAIL. */
export function transactionOwnerViolations(
  files: readonly SourceFile[],
  manifest: Readonly<Record<string, TransactionOwner>> = ACCEPTED_TRANSACTION_OWNERS,
): string[] {
  const v: string[] = [];
  const seen = new Map<string, number>();
  for (const { rel, code } of files) {
    const sites = countTransactionSites(code);
    if (sites === 0) continue;
    seen.set(rel, sites);
    const entry = manifest[rel];
    if (entry === undefined) {
      v.push(`UNAUTHORIZED_TRANSACTION_OWNER:${rel} (${sites} site(s))`);
    } else if (entry.sites !== sites) {
      v.push(`TRANSACTION_SITE_COUNT_CHANGED:${rel} expected ${entry.sites} found ${sites}`);
    }
  }
  for (const [rel, entry] of Object.entries(manifest)) {
    if (!seen.has(rel)) v.push(`ACCEPTED_OWNER_MISSING:${rel} (expected ${entry.sites} site(s))`);
  }
  return v;
}

/** §37/§38: direct assignment access outside the accepted owners and the CCA engine FAILS. */
export function assignmentAccessViolations(
  files: readonly SourceFile[],
  manifest: Readonly<Record<string, AssignmentOwner>> = ACCEPTED_ASSIGNMENT_ACCESS,
): string[] {
  const v: string[] = [];
  const seen = new Map<string, number>();
  for (const { rel, code } of files) {
    const refs = countAssignmentAccess(code);
    if (refs === 0) continue;
    seen.set(rel, refs);
    const entry = manifest[rel];
    if (entry === undefined) v.push(`UNAUTHORIZED_ASSIGNMENT_ACCESS:${rel} (${refs} reference(s))`);
    else if (entry.references !== refs) {
      v.push(`ASSIGNMENT_ACCESS_CHANGED:${rel} expected ${entry.references} found ${refs}`);
    }
  }
  for (const [rel, entry] of Object.entries(manifest)) {
    if (!seen.has(rel)) {
      v.push(`ACCEPTED_ASSIGNMENT_OWNER_MISSING:${rel} (expected ${entry.references})`);
    }
  }
  return v;
}

/** §42: raw SQL helpers outside the db layer and the private tracked adapters FAIL. */
export function rawSqlViolations(
  files: readonly SourceFile[],
  allowed: (rel: string) => boolean = RAW_SQL_ALLOWED,
): string[] {
  return files
    .filter(({ rel, code }) => usesRawSqlHelper(code) && !allowed(rel))
    .map(({ rel }) => `RAW_SQL_OUTSIDE_ACCEPTED_OWNER:${rel}`);
}
