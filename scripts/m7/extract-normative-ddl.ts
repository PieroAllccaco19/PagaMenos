// PagaMenos · M7 V1.1 — S01 normative DDL extraction.
//
//   pnpm m7:ddl:extract   regenerate prisma/m7/normative/ from the accepted specification bytes
//   pnpm m7:ddl:check     fail (exit 1) if the committed artifacts differ from a fresh generation
//
// Offline and DB-free. It reads only the two accepted documents, verifies their exact identities
// before extracting, and writes only inside prisma/m7/normative/. It never touches prisma/migrations/,
// authority/ or any specification markdown, and installs nothing into PostgreSQL.
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import {
  NORMATIVE_OUTPUT_DIR,
  diffArtifacts,
  generateNormativeArtifacts,
  isClean,
} from '../../src/m7/normative/generate';
import { M7_V1_1, M7_V1_1_ERRATUM_01 } from '../../src/m7/normative/source';

const ROOT = process.cwd();
const OUT = join(ROOT, NORMATIVE_OUTPUT_DIR);

function listFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function readActual(): Map<string, string> {
  const actual = new Map<string, string>();
  for (const abs of listFiles(OUT)) {
    actual.set(relative(OUT, abs).replace(/\\/g, '/'), readFileSync(abs, 'utf8'));
  }
  return actual;
}

function main(): void {
  const check = process.argv.includes('--check');
  const unknown = process.argv.slice(2).filter((a) => a !== '--check');
  if (unknown.length > 0) {
    console.error(`[m7:ddl] unknown argument(s): ${unknown.join(' ')}`);
    process.exit(2);
  }

  let generated;
  try {
    generated = generateNormativeArtifacts(
      readFileSync(join(ROOT, M7_V1_1.path)),
      readFileSync(join(ROOT, M7_V1_1_ERRATUM_01.path)),
    );
  } catch (error) {
    console.error(`[m7:ddl] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }

  if (check) {
    const drift = diffArtifacts(generated.files, readActual());
    if (!isClean(drift)) {
      console.error(
        `[m7:ddl:check] FAIL: ${NORMATIVE_OUTPUT_DIR} drifted from the accepted source`,
      );
      for (const p of drift.missing) console.error(`  missing:    ${p}`);
      for (const p of drift.unexpected) console.error(`  unexpected: ${p}`);
      for (const p of drift.changed) console.error(`  changed:    ${p}`);
      process.exit(1);
    }
    console.log(`[m7:ddl:check] OK: ${generated.files.size} artifacts match the accepted source`);
    return;
  }

  const actual = readActual();
  for (const stale of [...actual.keys()].filter((p) => !generated.files.has(p))) {
    rmSync(join(OUT, stale));
  }
  for (const [path, text] of generated.files) {
    const target = join(OUT, path);
    mkdirSync(dirname(target), { recursive: true });
    if (actual.get(path) !== text) writeFileSync(target, text, 'utf8');
  }
  console.log(`[m7:ddl] wrote ${generated.files.size} artifacts to ${NORMATIVE_OUTPUT_DIR}`);
}

main();
