// PagaMenos · M7 CAPABILITY SIGNER — PPC-1 physical provider capability, OFFLINE suite.
//
// Drives the PRODUCTIVE `issueGenerationWriteCapability` with the TO-8 database step replaced by a
// TEST double of `runM7CapabilitySignerTransaction` that returns a canned committed row (or rejects).
// That double proves NOTHING about the commit boundary — the real-PostgreSQL suite (`pnpm m7:signer`)
// does. What this suite proves, offline and deterministically:
//   * the signed URL verifies under an INDEPENDENT SigV4 verifier (itself validated against AWS's
//     published presigned-URL example), and changing key, method, host/backend or expiry breaks it;
//   * expiry is floored: X-Amz-Date + X-Amz-Expires <= validUntil, 1 <= expiresIn <= 604800;
//   * exactly the returned credential signs; no fallback; the backend literal is compared;
//   * the registry is strict and is refused BEFORE the database step;
//   * untransportable keys, other capability kinds and tampered library output are refused;
//   * nothing leaks into console / JSON / String / util.inspect / error message, stack or cause;
//   * importing and signing read no AWS_* / home / shared-config environment, touch no file, open no
//     socket, call no fetch and log nothing.
//
// The presigner is the REAL `@aws-sdk/s3-request-presigner`, wrapped only to COUNT calls (and, in two
// cases, to throw or tamper). No provider, emulator or conformance double is involved: this is not
// provider evidence of any kind.
import { createRequire } from 'node:module';
import { inspect } from 'node:util';

import fc from 'fast-check';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { M7GenerationWriteCapability } from '@/m7/runtime/capability-signer-contract';

import {
  AWS_DOC_PRESIGNED_EXAMPLE,
  verifySigV4PresignedUrl,
} from './__fixtures__/sigv4-independent-verifier';
import { randomTestCredential, registryJson } from './__fixtures__/test-signing-credentials';

// ─── test doubles (hoisted) ──────────────────────────────────────────────────────────────────────
const control = vi.hoisted(() => ({
  presignCalls: 0,
  presignerConstructed: 0,
  runnerCalls: 0,
  rows: [] as Record<string, unknown>[],
  runnerRejects: null as Error | null,
  presignThrows: null as Error | null,
  tamper: null as null | ((r: Record<string, unknown>) => Record<string, unknown>),
}));

vi.mock('@/cca/execution-context', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/cca/execution-context')>();
  return {
    ...real,
    // TEST DOUBLE of the TO-8 runner: returns the canned committed row, or rejects like a rolled-back
    // / failed commit. It never invokes the productive callback (no database exists here).
    runM7CapabilitySignerTransaction: async (): Promise<unknown> => {
      control.runnerCalls++;
      if (control.runnerRejects !== null) throw control.runnerRejects;
      return control.rows;
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', async (importOriginal) => {
  const real = await importOriginal<typeof import('@aws-sdk/s3-request-presigner')>();
  class CountingPresigner extends real.S3RequestPresigner {
    constructor(options: ConstructorParameters<typeof real.S3RequestPresigner>[0]) {
      control.presignerConstructed++;
      super(options);
    }
    override async presign(
      ...args: Parameters<InstanceType<typeof real.S3RequestPresigner>['presign']>
    ): ReturnType<InstanceType<typeof real.S3RequestPresigner>['presign']> {
      control.presignCalls++;
      if (control.presignThrows !== null) throw control.presignThrows;
      const out = await super.presign(...args);
      return (control.tamper === null
        ? out
        : control.tamper(out as unknown as Record<string, unknown>)) as unknown as typeof out;
    }
  }
  return { ...real, S3RequestPresigner: CountingPresigner };
});

// ─── instrumentation installed BEFORE the signer (and so the signing library) is first loaded ─────
const nodeRequire = createRequire(import.meta.url);
const fsCjs = nodeRequire('node:fs') as Record<string, unknown>;
const fspCjs = nodeRequire('node:fs/promises') as Record<string, unknown>;
const netModules = [
  'node:http',
  'node:https',
  'node:http2',
  'node:net',
  'node:tls',
  'node:dgram',
].map((m) => [m, nodeRequire(m) as Record<string, unknown>] as const);

interface Trace {
  envGets: string[];
  envEnumerations: number;
  fs: string[];
  net: string[];
  fetch: number;
  console: string[];
}
const trace: Trace = { envGets: [], envEnumerations: 0, fs: [], net: [], fetch: 0, console: [] };
let tracing = false;
const originals: Array<() => void> = [];

function wrap(obj: Record<string, unknown>, name: string, label: string, sink: string[]): void {
  const f = obj[name];
  if (typeof f !== 'function') return;
  obj[name] = function (this: unknown, ...a: unknown[]) {
    if (tracing) sink.push(`${label}.${name}(${typeof a[0] === 'string' ? a[0] : typeof a[0]})`);
    return (f as (...x: unknown[]) => unknown).apply(this, a);
  };
  originals.push(() => {
    obj[name] = f;
  });
}

const realEnv = process.env;
function installTracing(): void {
  process.env = new Proxy(realEnv, {
    get(t, k, r) {
      if (tracing && typeof k === 'string') trace.envGets.push(k);
      return Reflect.get(t, k, r);
    },
    ownKeys(t) {
      if (tracing) trace.envEnumerations++;
      return Reflect.ownKeys(t);
    },
    has(t, k) {
      if (tracing && typeof k === 'string') trace.envGets.push(`has:${k}`);
      return Reflect.has(t, k);
    },
    // Node's env object only accepts plain assignments on ITSELF (not a define through the proxy).
    set(t, k, v) {
      (t as unknown as Record<string | symbol, unknown>)[k] = v;
      return true;
    },
    deleteProperty(t, k) {
      delete (t as unknown as Record<string | symbol, unknown>)[k];
      return true;
    },
  });
  for (const n of [
    'readFile',
    'readFileSync',
    'open',
    'openSync',
    'stat',
    'statSync',
    'lstat',
    'lstatSync',
    'existsSync',
    'createReadStream',
    'readdir',
    'readdirSync',
  ]) {
    wrap(fsCjs, n, 'fs', trace.fs);
  }
  for (const n of ['readFile', 'open', 'stat', 'lstat', 'readdir'])
    wrap(fspCjs, n, 'fsp', trace.fs);
  for (const [m, mod] of netModules) {
    for (const n of ['request', 'get', 'connect', 'createConnection', 'createSocket']) {
      wrap(mod, n, m, trace.net);
    }
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((...a: Parameters<typeof fetch>) => {
    if (tracing) trace.fetch++;
    return realFetch(...a);
  }) as typeof fetch;
  originals.push(() => {
    globalThis.fetch = realFetch;
  });
  for (const n of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
    const f = console[n];
    console[n] = (...a: unknown[]) => {
      if (tracing) trace.console.push(`${n}:${a.map((x) => String(x)).join(' ')}`);
      f.apply(console, a);
    };
    originals.push(() => {
      console[n] = f;
    });
  }
}
function uninstallTracing(): void {
  process.env = realEnv;
  for (const undo of originals.splice(0).reverse()) undo();
}
function resetTrace(): void {
  trace.envGets = [];
  trace.envEnumerations = 0;
  trace.fs = [];
  trace.net = [];
  trace.fetch = 0;
  trace.console = [];
}

// ─── fixtures ────────────────────────────────────────────────────────────────────────────────────
const BACKEND = `sha256:${'b'.repeat(64)}`;
const OTHER_BACKEND = `sha256:${'c'.repeat(64)}`;
const PROFILE = 'ppc1-offline.credential-profile-s1';
const GRANT = '11111111-2222-4333-8444-555555555555';
const KEY =
  'ppc1-offline/evidence/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/g1/0123456789abcdef0123456789abcdef';
const ENVELOPE_SHA = `sha256:${'e'.repeat(64)}`;
/** SP-4 / T-169: the header every PPC-1 capability REQUIRES (signed). */
const COND = { 'if-none-match': '*' } as const;

function row(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    capability_operation: 'CANONICAL_CREATE',
    canonical_object_key: KEY,
    backend_sha256: BACKEND,
    valid_until: '2026-09-23T12:00:15.123456Z',
    capability_mode: 'EXACT_KEY_PRESIGNED_PUT',
    envelope_enforcement: 'SIGNER_TOPOLOGY',
    envelope_sha256: ENVELOPE_SHA,
    mint_seq: 1,
    signing_profile_version: 'pagamenos.m7.storage-profile.ppc1-offline.s1.v1',
    signing_credential_profile_id: PROFILE,
    ...over,
  };
}

const NOW = Date.parse('2026-09-23T12:00:00.750Z');
let signer: typeof import('@/db/m7-capability-signer');
let contract: typeof import('@/m7/runtime/capability-signer-contract');
const cred = randomTestCredential(BACKEND);
const importTrace: Partial<Trace> = {};

beforeAll(async () => {
  process.env.M7_CONTROL_PLANE_MANIFEST_SHA256 = `sha256:${'a'.repeat(64)}`;
  process.env.M7_CAPABILITY_SIGNER_DATABASE_URL =
    'postgresql://nobody:nothing@127.0.0.1:1/never?connect_timeout=1';
  installTracing();
  resetTrace();
  tracing = true;
  signer = await import('@/db/m7-capability-signer');
  contract = await import('@/m7/runtime/capability-signer-contract');
  tracing = false;
  Object.assign(importTrace, JSON.parse(JSON.stringify(trace)) as Trace);
});

afterAll(() => {
  uninstallTracing();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  control.presignCalls = 0;
  control.presignerConstructed = 0;
  control.runnerCalls = 0;
  control.rows = [row()];
  control.runnerRejects = null;
  control.presignThrows = null;
  control.tamper = null;
  process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = registryJson({ [PROFILE]: cred });
});

afterEach(() => {
  vi.useRealTimers();
});

async function issue(): Promise<M7GenerationWriteCapability> {
  return signer.issueGenerationWriteCapability(GRANT);
}

async function refusal(): Promise<InstanceType<typeof contract.M7CapabilitySignerError>> {
  try {
    await issue();
  } catch (e) {
    expect(e).toBeInstanceOf(contract.M7CapabilitySignerError);
    return e as InstanceType<typeof contract.M7CapabilitySignerError>;
  }
  throw new Error('expected a refusal, got a capability');
}

/** Every string that must never appear outside the deliberate `url` read. */
function secrets(c = cred): string[] {
  return [
    c.secretAccessKey,
    c.accessKeyId,
    KEY,
    PROFILE,
    BACKEND,
    c.bucket,
    'ppc1-test.invalid',
    ENVELOPE_SHA,
    'X-Amz-Signature',
  ];
}

function leakFree(text: string, c = cred): void {
  for (const s of secrets(c)) expect(text.includes(s), `leaked ${s.slice(0, 12)}…`).toBe(false);
}

// ─── the independent verifier is itself correct ──────────────────────────────────────────────────
describe('independent SigV4 verifier (test-only) — validated against AWS’s published example', () => {
  it('verifies the AWS documentation presigned URL, and rejects it once any bound part changes', () => {
    const ok = verifySigV4PresignedUrl(AWS_DOC_PRESIGNED_EXAMPLE);
    expect(ok.reasons).toEqual([]);
    expect(ok.ok).toBe(true);
    const u = AWS_DOC_PRESIGNED_EXAMPLE.url;
    const bad = [
      { ...AWS_DOC_PRESIGNED_EXAMPLE, method: 'PUT' },
      { ...AWS_DOC_PRESIGNED_EXAMPLE, url: u.replace('/test.txt', '/test.txu') },
      { ...AWS_DOC_PRESIGNED_EXAMPLE, url: u.replace('examplebucket.s3', 'otherbucket.s3') },
      {
        ...AWS_DOC_PRESIGNED_EXAMPLE,
        url: u.replace('X-Amz-Expires=86400', 'X-Amz-Expires=86401'),
      },
      { ...AWS_DOC_PRESIGNED_EXAMPLE, secretAccessKey: 'x'.repeat(40) },
    ];
    for (const b of bad) expect(verifySigV4PresignedUrl(b).ok).toBe(false);
  });
});

// ─── happy path + fidelity ───────────────────────────────────────────────────────────────────────
describe('PPC-1 capability — exact envelope fidelity', () => {
  it('signs a PUT of exactly the committed key on the provisioned bucket, with exactly the named credential', async () => {
    const cap = await issue();
    expect(control.runnerCalls).toBe(1);
    expect(control.presignCalls).toBe(1);
    expect(cap.kind).toBe('M7_GENERATION_WRITE_CAPABILITY_V1');
    expect(cap.method).toBe('PUT');
    expect(cap.mintSeq).toBe(1);
    const v = verifySigV4PresignedUrl({
      headers: COND,
      url: cap.url,
      method: 'PUT',
      secretAccessKey: cred.secretAccessKey,
    });
    expect(v.reasons).toEqual([]);
    expect(v.decodedPath).toBe(`/${cred.bucket}/${KEY}`);
    expect(v.canonicalUri).toBe(`/${cred.bucket}/${KEY}`);
    expect(v.host).toBe('s3.ppc1-test.invalid');
    expect(v.accessKeyId).toBe(cred.accessKeyId);
    expect(v.region).toBe(cred.region);
    expect(v.amzDate).toBe('20260923T120000Z'); // floored from 12:00:00.750
    expect(v.expiresIn).toBe(15); // floor(12:00:15.123456 − 12:00:00)
    expect(v.expiresAt).toBe('2026-09-23T12:00:15.000Z');
    expect(cap.expiresAt).toBe(v.expiresAt);
    expect(Date.parse(v.expiresAt!)).toBeLessThanOrEqual(Date.parse('2026-09-23T12:00:15.123Z'));
    const q = new URL(cap.url).searchParams;
    expect([...q.keys()].sort()).toEqual(
      [
        'X-Amz-Algorithm',
        'X-Amz-Content-Sha256',
        'X-Amz-Credential',
        'X-Amz-Date',
        'X-Amz-Expires',
        'X-Amz-Signature',
        'X-Amz-SignedHeaders',
      ].sort(),
    );
    expect(q.get('X-Amz-SignedHeaders')).toBe('host;if-none-match');
    expect(cap.requiredHeaders).toEqual({ 'if-none-match': '*' });
    expect(Object.isFrozen(cap.requiredHeaders)).toBe(true);
    expect(q.get('X-Amz-Content-Sha256')).toBe('UNSIGNED-PAYLOAD');
    expect(cap.url).not.toMatch(/x-amz-security-token/i);
  });

  it('changing key, method, host/backend or expiry breaks verification (incl. escaping / double-escaping)', async () => {
    const cap = await issue();
    const url = cap.url;
    const verify = (u: string, method = 'PUT') =>
      verifySigV4PresignedUrl({
        headers: COND,
        url: u,
        method,
        secretAccessKey: cred.secretAccessKey,
      });
    expect(verify(url).ok).toBe(true);
    const lastHex = KEY.slice(-1);
    const mutations: Record<string, [string, string]> = {
      'another key (last char)': [
        url.replace(`${KEY}?`, `${KEY.slice(0, -1)}${lastHex === 'f' ? 'e' : 'f'}?`),
        'PUT',
      ],
      'another epoch segment': [url.replace('/g1/', '/g2/'), 'PUT'],
      'a key prefix only': [
        url.replace(`/${KEY}?`, `/${KEY.split('/').slice(0, -1).join('/')}?`),
        'PUT',
      ],
      'another bucket': [url.replace(`/${cred.bucket}/`, '/ppc1-test-bucket2/'), 'PUT'],
      'another host / backend': [
        url.replace('s3.ppc1-test.invalid', 's3.other-ppc1.invalid'),
        'PUT',
      ],
      'a later expiry': [url.replace('X-Amz-Expires=15', 'X-Amz-Expires=16'), 'PUT'],
      'an earlier signing date': [
        url.replace('X-Amz-Date=20260923T120000Z', 'X-Amz-Date=20260923T115959Z'),
        'PUT',
      ],
      'method GET': [url, 'GET'],
      'method POST': [url, 'POST'],
      'double-escaped key segment': [url.replace('/g1/', '/g%2531/'), 'PUT'],
      'escaped percent sign': [url.replace('/g1/', '/g1%25/'), 'PUT'],
    };
    const results: Record<string, boolean> = {};
    for (const [label, [u, m]] of Object.entries(mutations)) {
      expect(u !== url || m !== 'PUT', `${label} must actually mutate`).toBe(true);
      results[label] = verify(u, m).ok;
    }
    expect(results).toEqual(Object.fromEntries(Object.keys(mutations).map((k) => [k, false])));
    // A single escape of an unreserved character, or of the `/` separator, is the SAME key to an
    // S3-style server (it decodes the path once) — so it verifies, and names exactly the signed key;
    // nothing wider and nothing else.
    for (const equivalent of [url.replace('/g1/', '/g%31/'), url.replace('/g1/', '/g1%2F')]) {
      const r = verify(equivalent);
      expect(r.ok).toBe(true);
      expect(r.decodedPath).toBe(`/${cred.bucket}/${KEY}`);
    }
  });

  it('a known-answer vector: fixed credential, instant and envelope → one exact URL', async () => {
    const kat = {
      providerClass: 'S3_COMPATIBLE',
      backendSha256: BACKEND,
      endpoint: 'https://s3.ppc1-kat.invalid:8443',
      region: 'us-kat-1',
      bucket: 'ppc1-kat-bucket',
      accessKeyId: 'AKIAPPC1KNOWNANSWER0',
      secretAccessKey: 'PPC1-KNOWN-ANSWER-TEST-SECRET-NOT-A-CREDENTIAL',
    };
    process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = registryJson({ [PROFILE]: kat });
    const cap = await issue();
    const v = verifySigV4PresignedUrl({
      headers: COND,
      url: cap.url,
      method: 'PUT',
      secretAccessKey: kat.secretAccessKey,
    });
    expect(v.reasons).toEqual([]);
    expect(v.host).toBe('s3.ppc1-kat.invalid:8443');
    expect(cap.url).toBe(KAT_URL);
  });
});

// Pinned from the first verified run; any change in the signing path shows up here.
const KAT_URL =
  'https://s3.ppc1-kat.invalid:8443/ppc1-kat-bucket/ppc1-offline/evidence/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/g1/0123456789abcdef0123456789abcdef' +
  '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD' +
  '&X-Amz-Credential=AKIAPPC1KNOWNANSWER0%2F20260923%2Fus-kat-1%2Fs3%2Faws4_request' +
  '&X-Amz-Date=20260923T120000Z&X-Amz-Expires=15' +
  '&X-Amz-Signature=985997c62b892fa969df5da554739d03589017e75e53846bce3205b373c50cd5' +
  '&X-Amz-SignedHeaders=host%3Bif-none-match';

// ─── conditional create (AUD-M7-PPC1-01): CANONICAL_CREATE is a SIGNED If-None-Match: * create ───
describe('conditional create — the signature REQUIRES If-None-Match: * (SP-4, §11.3, Corollary 4, T-169)', () => {
  it('the capability names exactly one required header; the signed-header set is exactly host;if-none-match', async () => {
    const cap = await issue();
    expect(cap.requiredHeaders).toEqual({ 'if-none-match': '*' });
    expect(Object.isFrozen(cap.requiredHeaders)).toBe(true);
    expect(() => {
      (cap.requiredHeaders as Record<string, string>)['if-none-match'] = 'x';
    }).toThrow();
    const v = verifySigV4PresignedUrl({
      url: cap.url,
      method: 'PUT',
      secretAccessKey: cred.secretAccessKey,
      headers: cap.requiredHeaders,
    });
    expect(v.reasons).toEqual([]);
    expect(v.signedHeaders).toEqual(['host', 'if-none-match']);
  });

  it('verifies ONLY with If-None-Match: *; fails when omitted, changed, or when key / method / host / expiry change', async () => {
    const cap = await issue();
    const base = { url: cap.url, method: 'PUT', secretAccessKey: cred.secretAccessKey };
    const ok = verifySigV4PresignedUrl({ ...base, headers: { 'if-none-match': '*' } });
    expect(ok.reasons).toEqual([]);
    const lastHex = KEY.slice(-1);
    const cases: Record<string, Parameters<typeof verifySigV4PresignedUrl>[0]> = {
      '1 header omitted (a plain, overwriting PUT)': { ...base, headers: {} },
      '2a value changed to an ETag': { ...base, headers: { 'if-none-match': '"0123abcd"' } },
      '2b value changed to W/*': { ...base, headers: { 'if-none-match': 'W/*' } },
      '2c condition swapped to If-Match: *': { ...base, headers: { 'if-match': '*' } },
      '3 key changed': {
        ...base,
        url: cap.url.replace(`${KEY}?`, `${KEY.slice(0, -1)}${lastHex === 'f' ? 'e' : 'f'}?`),
        headers: COND,
      },
      '4a method POST': { ...base, method: 'POST', headers: COND },
      '4b method GET': { ...base, method: 'GET', headers: COND },
      '5 host / backend changed': {
        ...base,
        url: cap.url.replace('s3.ppc1-test.invalid', 's3.other-ppc1.invalid'),
        headers: COND,
      },
      '6 expiry widened': {
        ...base,
        url: cap.url.replace('X-Amz-Expires=15', 'X-Amz-Expires=16'),
        headers: COND,
      },
      '7 condition dropped from X-Amz-SignedHeaders': {
        ...base,
        url: cap.url.replace(
          'X-Amz-SignedHeaders=host%3Bif-none-match',
          'X-Amz-SignedHeaders=host',
        ),
        headers: {},
      },
    };
    const results: Record<string, { ok: boolean; reasons: readonly string[] }> = {};
    for (const [label, input] of Object.entries(cases)) {
      expect(
        input.url !== cap.url ||
          JSON.stringify(input.headers) !== JSON.stringify(COND) ||
          input.method !== 'PUT',
        label,
      ).toBe(true);
      const r = verifySigV4PresignedUrl(input);
      results[label] = { ok: r.ok, reasons: r.reasons };
    }
    expect(Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.ok]))).toEqual(
      Object.fromEntries(Object.keys(cases).map((k) => [k, false])),
    );
    expect(results['1 header omitted (a plain, overwriting PUT)']!.reasons).toContain(
      'MISSING_SIGNED_HEADER:if-none-match',
    );
  });
});

// ─── expiry ──────────────────────────────────────────────────────────────────────────────────────
describe('expiry is floored and bounded — never rounded or clamped upward', () => {
  it('property: either refused, or X-Amz-Date + X-Amz-Expires <= validUntil with expiresIn = floor(window)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({
          min: Date.parse('2026-01-01T00:00:00Z'),
          max: Date.parse('2030-01-01T00:00:00Z'),
        }),
        fc.integer({ min: -5_000, max: 700_000_000 }),
        fc.integer({ min: 0, max: 999 }),
        async (now, windowMs, extraMicros) => {
          vi.setSystemTime(now);
          const vuMs = now + windowMs;
          const iso = new Date(vuMs).toISOString(); // …sss Z
          const validUntil = `${iso.slice(0, 23)}${String(extraMicros).padStart(3, '0')}Z`;
          control.rows = [row({ valid_until: validUntil })];
          const signingMs = now - (now % 1000);
          const expected = Math.floor((vuMs - signingMs) / 1000);
          let cap: M7GenerationWriteCapability | null = null;
          let reason: string | null = null;
          try {
            cap = await issue();
          } catch (e) {
            reason = (e as { reason: string }).reason;
          }
          if (expected < 1 || expected > 604_800) {
            expect(reason).toBe('SIGNING_WINDOW_INVALID');
            return;
          }
          expect(reason).toBeNull();
          const v = verifySigV4PresignedUrl({
            headers: COND,
            url: cap!.url,
            method: 'PUT',
            secretAccessKey: cred.secretAccessKey,
          });
          expect(v.ok).toBe(true);
          expect(v.expiresIn).toBe(expected);
          expect(Date.parse(v.expiresAt!)).toBeLessThanOrEqual(vuMs);
          expect(Date.parse(v.expiresAt!)).toBe(signingMs + expected * 1000);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('edges: < 1 s refused; exactly 604800 s signed; 604801 s refused; malformed validUntil refused', async () => {
    const at = (vu: string) => {
      control.rows = [row({ valid_until: vu })];
    };
    at('2026-09-23T12:00:00.999999Z'); // window from 12:00:00 is 0.999999 s
    expect((await refusal()).reason).toBe('SIGNING_WINDOW_INVALID');
    at('2026-09-23T12:00:01.000000Z');
    expect((await issue()).expiresAt).toBe('2026-09-23T12:00:01.000Z');
    at('2026-09-30T12:00:00.000000Z'); // + 604800 s
    expect(
      verifySigV4PresignedUrl({
        headers: COND,
        url: (await issue()).url,
        method: 'PUT',
        secretAccessKey: cred.secretAccessKey,
      }).expiresIn,
    ).toBe(604_800);
    at('2026-09-30T12:00:01.000000Z');
    expect((await refusal()).reason).toBe('SIGNING_WINDOW_INVALID');
    for (const bad of [
      '2026-09-23T11:59:59.000000Z',
      '2026-02-30T12:00:05.000000Z',
      '2026-09-23T12:00:05Z',
      '2026-09-23T12:00:05.000Z',
      '2026-09-23 12:00:05.000000Z',
      '2026-09-23T12:00:05.000000+00:00',
    ]) {
      at(bad);
      expect((await refusal()).reason, bad).toBe('SIGNING_WINDOW_INVALID');
    }
    // Every refusal above happened AFTER the (canned) committed mint and before any signing: only the
    // two in-bounds windows reached the library.
    expect(control.presignCalls).toBe(2);
  });
});

// ─── kind gate, key transportability ────────────────────────────────────────────────────────────
describe('only the one implemented kind is signed; keys are carried verbatim or refused', () => {
  it('another operation / capability mode / enforcement → UNSUPPORTED_CAPABILITY_KIND, zero signing', async () => {
    for (const over of [
      { capability_operation: 'CANONICAL_DELETE' },
      { capability_mode: 'EXACT_KEY_SCOPED_TOKEN' },
      { envelope_enforcement: 'PROVIDER_IAM' },
    ]) {
      control.rows = [row(over)];
      const e = await refusal();
      expect(e.reason).toBe('UNSUPPORTED_CAPABILITY_KIND');
      expect(e.deploymentDefect).toBe(false);
    }
    expect(control.runnerCalls).toBe(3);
    expect(control.presignCalls).toBe(0);
    expect(control.presignerConstructed).toBe(0);
  });

  it('untransportable keys (escaping, empty / dot segments, non-DDL characters) → refused, zero signing', async () => {
    const bad = [
      'a b/c',
      'a+b/c',
      'a%2Fb/c',
      'a%25/c',
      'ключ/c',
      'a//b',
      '/a/b',
      'a/b/',
      'a/./b',
      'a/../b',
      '..',
      'a/b?x=1',
      'a/b#f',
      'a\\b',
      'a:b',
      `${'k'.repeat(1025)}`,
    ];
    for (const key of bad) {
      control.rows = [row({ canonical_object_key: key })];
      expect((await refusal()).reason, key).toBe('CANONICAL_KEY_NOT_TRANSPORTABLE');
    }
    expect(control.presignCalls).toBe(0);
  });
});

// ─── credential routing (XC-7) ───────────────────────────────────────────────────────────────────
describe('credential routing — exactly the committed signing_credential_profile_id, no fallback', () => {
  it('missing or near-miss identifiers → SIGNING_CREDENTIAL_MISSING (deployment defect), zero signing', async () => {
    const other = randomTestCredential(BACKEND);
    const registries: Record<string, Record<string, unknown>> = {
      'only another profile': { 'ppc1-offline.credential-profile-s2': other },
      'case variant': { [PROFILE.toUpperCase()]: other },
      'prefix of the id': { [PROFILE.slice(0, -1)]: other },
      'id plus suffix': { [`${PROFILE}x`]: other },
      '"default"': { default: other },
      '"*"-like wildcard': { '*': other },
    };
    for (const [label, reg] of Object.entries(registries)) {
      process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = registryJson(reg);
      let e: { reason: string; deploymentDefect: boolean } | undefined;
      try {
        await issue();
      } catch (x) {
        e = x as typeof e;
      }
      if (label === '"*"-like wildcard') {
        // `*` is outside the credential-profile alphabet: the whole registry is refused pre-DB.
        expect(e?.reason, label).toBe('PROVIDER_CREDENTIALS_UNAVAILABLE');
        continue;
      }
      expect(e?.reason, label).toBe('SIGNING_CREDENTIAL_MISSING');
      expect(e?.deploymentDefect, label).toBe(true);
    }
    expect(control.presignCalls).toBe(0);
  });

  it('the selected credential’s backend literal differs → SIGNING_CREDENTIAL_BACKEND_MISMATCH, zero signing', async () => {
    process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = registryJson({
      [PROFILE]: randomTestCredential(OTHER_BACKEND),
    });
    const e = await refusal();
    expect(e.reason).toBe('SIGNING_CREDENTIAL_BACKEND_MISMATCH');
    expect(e.deploymentDefect).toBe(true);
    expect(control.presignCalls).toBe(0);
  });

  it('with several credentials present, exactly the named one signs (and the others do not verify)', async () => {
    const s2 = randomTestCredential(BACKEND, { bucket: 'ppc1-test-bucket-s2' });
    const s0 = randomTestCredential(BACKEND);
    process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = registryJson({
      'ppc1-offline.credential-profile-s0': s0,
      [PROFILE]: cred,
      'ppc1-offline.credential-profile-s2': s2,
    });
    const cap = await issue();
    expect(
      verifySigV4PresignedUrl({
        headers: COND,
        url: cap.url,
        method: 'PUT',
        secretAccessKey: cred.secretAccessKey,
      }).ok,
    ).toBe(true);
    for (const c of [s0, s2]) {
      expect(
        verifySigV4PresignedUrl({
          headers: COND,
          url: cap.url,
          method: 'PUT',
          secretAccessKey: c.secretAccessKey,
        }).ok,
      ).toBe(false);
      expect(cap.url.includes(c.accessKeyId)).toBe(false);
    }
    control.rows = [row({ signing_credential_profile_id: 'ppc1-offline.credential-profile-s2' })];
    const cap2 = await issue();
    const v2 = verifySigV4PresignedUrl({
      headers: COND,
      url: cap2.url,
      method: 'PUT',
      secretAccessKey: s2.secretAccessKey,
    });
    expect(v2.ok).toBe(true);
    expect(v2.accessKeyId).toBe(s2.accessKeyId);
    expect(v2.decodedPath).toBe(`/ppc1-test-bucket-s2/${KEY}`);
  });
});

// ─── registry strictness (pre-DB) ────────────────────────────────────────────────────────────────
describe('the provider-credential registry is strict and is refused BEFORE any database step', () => {
  it('absent / malformed registries → PROVIDER_CREDENTIALS_UNAVAILABLE, the TO-8 step never runs', async () => {
    const good = randomTestCredential(BACKEND);
    const bad: Record<string, string | undefined> = {
      absent: undefined,
      empty: '',
      'not JSON': `{${good.secretAccessKey}`,
      array: JSON.stringify([good]),
      null: 'null',
      'empty object': '{}',
      'extra field': registryJson({ [PROFILE]: { ...good, note: 'x' } }),
      sessionToken: registryJson({ [PROFILE]: { ...good, sessionToken: 'TESTSESSIONTOKEN0000' } }),
      'missing field': registryJson({ [PROFILE]: { ...good, region: undefined } }),
      'other providerClass': registryJson({ [PROFILE]: { ...good, providerClass: 'GCS' } }),
      'http endpoint': registryJson({
        [PROFILE]: { ...good, endpoint: 'http://s3.ppc1-test.invalid' },
      }),
      'endpoint with path': registryJson({
        [PROFILE]: { ...good, endpoint: 'https://s3.ppc1-test.invalid/x' },
      }),
      'endpoint trailing slash': registryJson({
        [PROFILE]: { ...good, endpoint: 'https://s3.ppc1-test.invalid/' },
      }),
      'endpoint userinfo': registryJson({
        [PROFILE]: { ...good, endpoint: 'https://u:p@s3.ppc1-test.invalid' },
      }),
      'endpoint query': registryJson({
        [PROFILE]: { ...good, endpoint: 'https://s3.ppc1-test.invalid?x=1' },
      }),
      'bad bucket': registryJson({ [PROFILE]: { ...good, bucket: 'Bad_Bucket' } }),
      'bucket with ..': registryJson({ [PROFILE]: { ...good, bucket: 'a..b' } }),
      'bad region': registryJson({ [PROFILE]: { ...good, region: 'US EAST' } }),
      'short secret': registryJson({ [PROFILE]: { ...good, secretAccessKey: 'short' } }),
      'bad access key id': registryJson({ [PROFILE]: { ...good, accessKeyId: 'AKIA-BAD' } }),
      'bad backend literal': registryJson({
        [PROFILE]: { ...good, backendSha256: 'b'.repeat(64) },
      }),
      '__proto__ key': `{"__proto__": ${JSON.stringify(good)}}`,
      'constructor key': registryJson({ constructor: good }),
      'id outside alphabet': registryJson({ 'id with space': good }),
      'one bad entry among good': registryJson({ [PROFILE]: good, other: { ...good, region: '' } }),
    };
    const outcomes: Record<string, string> = {};
    for (const [label, value] of Object.entries(bad)) {
      if (value === undefined) delete process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS;
      else process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS = value;
      const e = await refusal();
      outcomes[label] = e.reason;
      expect(e.deploymentDefect).toBe(true);
      leakFree(`${e.message}\n${e.stack ?? ''}\n${inspect(e)}\n${JSON.stringify(e)}`, good);
      expect((e as Error & { cause?: unknown }).cause).toBeUndefined();
    }
    expect(outcomes).toEqual(
      Object.fromEntries(Object.keys(bad).map((k) => [k, 'PROVIDER_CREDENTIALS_UNAVAILABLE'])),
    );
    expect(control.runnerCalls).toBe(0);
    expect(control.presignCalls).toBe(0);
  });

  it('a malformed grant id is refused before the registry and before the TO-8 step', async () => {
    delete process.env.M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS;
    for (const a of [['nope'], [GRANT, { canonicalObjectKey: KEY }], [42]] as unknown[][]) {
      try {
        await (signer.issueGenerationWriteCapability as (...x: unknown[]) => Promise<unknown>)(
          ...a,
        );
        throw new Error('resolved');
      } catch (e) {
        expect((e as { reason: string }).reason).toBe('INVALID_GENERATION_GRANT_ID');
      }
    }
    expect(control.runnerCalls).toBe(0);
  });
});

// ─── commit boundary (offline half only) and library failures ────────────────────────────────────
describe('no signature without a resolved TO-8 step; library failures never leak', () => {
  it('the TO-8 step rejects (rollback / failed or unknown commit) → UNAVAILABLE, the presigner is never constructed', async () => {
    const { M7CapabilitySignerTransactionError } = await import('@/cca/execution-context');
    for (const err of [
      new Error(`driver: connection terminated during COMMIT ${cred.secretAccessKey}`),
      new M7CapabilitySignerTransactionError('TO8_TRANSACTION_ALREADY_ACTIVE', 'x'),
    ]) {
      control.runnerRejects = err;
      try {
        await issue();
        throw new Error('resolved');
      } catch (e) {
        expect(e).not.toBe(undefined);
        leakFree(String((e as Error).message), cred);
      }
    }
    expect(control.runnerCalls).toBe(2);
    expect(control.presignerConstructed).toBe(0);
    expect(control.presignCalls).toBe(0);
  });

  it('the signing library throws (with the secret in its message) → SIGNING_FAILED, no cause, no leak', async () => {
    control.presignThrows = new Error(`boom ${cred.secretAccessKey} ${KEY}`);
    const e = await refusal();
    expect(e.reason).toBe('SIGNING_FAILED');
    expect((e as Error & { cause?: unknown }).cause).toBeUndefined();
    leakFree(`${e.message}\n${e.stack ?? ''}\n${inspect(e)}\n${JSON.stringify(e)}`);
  });

  it('tampered library output (wider path, extra header/param, other expiry, other method) → SIGNING_FAILED', async () => {
    const tampers: Record<string, (r: Record<string, unknown>) => Record<string, unknown>> = {
      'path widened to a prefix': (r) => ({ ...r, path: `/${cred.bucket}/ppc1-offline/` }),
      'method POST': (r) => ({ ...r, method: 'POST' }),
      'extra query param': (r) => ({
        ...r,
        query: { ...(r.query as object), 'x-id': 'PutObject' },
      }),
      'longer expiry': (r) => ({ ...r, query: { ...(r.query as object), 'X-Amz-Expires': '900' } }),
      'extra signed header': (r) => ({
        ...r,
        headers: { ...(r.headers as object), 'x-amz-acl': 'public-read' },
      }),
      'other host': (r) => ({ ...r, hostname: 'evil.invalid' }),
      'session token param': (r) => ({
        ...r,
        query: { ...(r.query as object), 'X-Amz-Security-Token': 't' },
      }),
      'if-none-match dropped from the request': (r) => {
        const h = { ...(r.headers as Record<string, string>) };
        delete h['if-none-match'];
        return { ...r, headers: h };
      },
      'if-none-match value changed': (r) => ({
        ...r,
        headers: { ...(r.headers as object), 'if-none-match': '"etag"' },
      }),
      'if-none-match not in the signed-header set': (r) => ({
        ...r,
        query: { ...(r.query as object), 'X-Amz-SignedHeaders': 'host' },
      }),
    };
    for (const [label, t] of Object.entries(tampers)) {
      control.tamper = t;
      expect((await refusal()).reason, label).toBe('SIGNING_FAILED');
    }
  });
});

// ─── redaction ───────────────────────────────────────────────────────────────────────────────────
describe('the capability is redacted from every accidental channel; the deliberate url read works', () => {
  it('JSON / String / template / util.inspect / structuredClone / Object.keys expose no secret', async () => {
    const cap = await issue();
    expect(cap.url.startsWith('https://s3.ppc1-test.invalid/')).toBe(true);
    const channels = [
      JSON.stringify(cap),
      JSON.stringify({ wrapped: cap }),
      String(cap),
      `${cap as unknown as string}`,
      inspect(cap),
      inspect({ wrapped: [cap] }, { depth: 10, showHidden: true }),
      JSON.stringify(structuredClone(cap)),
      JSON.stringify(Object.keys(cap)),
      JSON.stringify(Object.entries(cap)),
    ].join('\n');
    leakFree(channels);
    expect(channels.includes(cap.url)).toBe(false);
    expect(Object.isFrozen(cap)).toBe(true);
    expect(Object.keys(cap)).not.toContain('url');
    expect(() => {
      (cap as unknown as { url: string }).url = 'https://evil.invalid/';
    }).toThrow();
  });

  it('nothing is written to the console during a full issue', async () => {
    resetTrace();
    tracing = true;
    await issue();
    tracing = false;
    expect(trace.console).toEqual([]);
  });
});

// ─── environment / filesystem / network isolation of the signing library ────────────────────────
describe('the signing library reads no AWS_* / shared-config environment, no file, no socket', () => {
  it('importing the signer (and so the library) read no AWS_* / home-directory key and touched no ~/.aws path', () => {
    const envGets = importTrace.envGets ?? [];
    expect(
      envGets.filter((k) => /AWS|^(has:)?(HOME|USERPROFILE|HOMEPATH|HOMEDRIVE)$/.test(k)),
    ).toEqual([]);
    expect((importTrace.fs ?? []).filter((f) => /\.aws/i.test(f))).toEqual([]);
    expect(importTrace.net ?? []).toEqual([]);
    expect(importTrace.fetch ?? 0).toBe(0);
    expect(importTrace.console ?? []).toEqual([]);
  });

  it('a warm issue reads EXACTLY the credential registry and the manifest digest — nothing else', async () => {
    await issue(); // warm: the hidden client is built once and cached
    resetTrace();
    tracing = true;
    const cap = await issue();
    tracing = false;
    expect(cap.method).toBe('PUT');
    expect([...new Set(trace.envGets)].sort()).toEqual(
      ['M7_CAPABILITY_SIGNER_PROVIDER_CREDENTIALS', 'M7_CONTROL_PLANE_MANIFEST_SHA256'].sort(),
    );
    expect(trace.envEnumerations).toBe(0);
    expect(trace.fs).toEqual([]);
    expect(trace.net).toEqual([]);
    expect(trace.fetch).toBe(0);
    expect(trace.console).toEqual([]);
  });

  it('AWS_* variables and a hostile shared-config location present in the environment change nothing', async () => {
    const hostile: Record<string, string> = {
      AWS_ACCESS_KEY_ID: 'AKIAHOSTILEENVIRONMENT',
      AWS_SECRET_ACCESS_KEY: 'hostile-secret-from-environment-0000',
      AWS_SESSION_TOKEN: 'hostile-session-token',
      AWS_REGION: 'hostile-1',
      AWS_DEFAULT_REGION: 'hostile-2',
      AWS_PROFILE: 'hostile',
      AWS_CONFIG_FILE: 'Z:/nonexistent/hostile-config',
      AWS_SHARED_CREDENTIALS_FILE: 'Z:/nonexistent/hostile-credentials',
      AWS_ENDPOINT_URL: 'https://hostile.invalid',
      AWS_ENDPOINT_URL_S3: 'https://hostile-s3.invalid',
    };
    const saved: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(hostile)) {
      saved[k] = realEnv[k];
      realEnv[k] = v;
    }
    try {
      resetTrace();
      tracing = true;
      const cap = await issue();
      tracing = false;
      expect(trace.envGets.filter((k) => /AWS/.test(k))).toEqual([]);
      expect(trace.fs).toEqual([]);
      const v = verifySigV4PresignedUrl({
        headers: COND,
        url: cap.url,
        method: 'PUT',
        secretAccessKey: cred.secretAccessKey,
      });
      expect(v.ok).toBe(true);
      expect(v.accessKeyId).toBe(cred.accessKeyId);
      expect(v.region).toBe(cred.region);
      expect(v.host).toBe('s3.ppc1-test.invalid');
      for (const value of Object.values(hostile))
        expect(cap.url.includes(encodeURIComponent(value))).toBe(false);
    } finally {
      tracing = false;
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete realEnv[k];
        else realEnv[k] = v;
      }
    }
  });
});
