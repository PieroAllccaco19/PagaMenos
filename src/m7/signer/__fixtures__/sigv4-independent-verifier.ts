// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TEST-ONLY INDEPENDENT SigV4 QUERY-PRESIGN VERIFIER (PPC-1)
//
//     TEST INFRASTRUCTURE ONLY · NOT PRODUCTIVE · NOT A SIGNER · NEVER IMPORTED BY PRODUCTION
//     NOT A PROVIDER · NOT PROVIDER EVIDENCE · PROVES NOTHING ABOUT ANY REAL S3-COMPATIBLE SERVICE
//
// Re-derives an AWS Signature V4 query-presigned request from FIRST PRINCIPLES with `node:crypto`,
// independently of the AWS / Smithy libraries the productive signer uses, and checks the signature a
// URL carries. It models what an S3-style server does with the RAW request line: it percent-DECODES
// each path segment exactly once and re-encodes it with SigV4 `UriEncode` (S3 does not double-encode),
// so a URL whose path differs from the signed key — including by escaping or double-escaping — does
// not verify. Signed headers other than `host` are taken from the headers the request ACTUALLY carries
// (PPC-1 R2): a signed `if-none-match` that is omitted or carries another value does not verify.
//
// The verifier is itself validated against AWS's published presigned-URL example (Amazon S3 API
// Reference, "Authenticating Requests: Using Query Parameters (AWS Signature Version 4)"), see
// AWS_DOC_PRESIGNED_EXAMPLE below.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
import { createHash, createHmac } from 'node:crypto';

/** RFC 3986 strict (SigV4 `UriEncode`), with `/` optionally preserved. */
export function uriEncode(value: string, keepSlash: boolean): string {
  let out = '';
  for (const ch of value) {
    if (/[A-Za-z0-9_.~-]/.test(ch) || (keepSlash && ch === '/')) out += ch;
    else {
      for (const b of Buffer.from(ch, 'utf8'))
        out += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return out;
}

const hmac = (key: Buffer | string, data: string): Buffer =>
  createHmac('sha256', key).update(data, 'utf8').digest();
const sha256Hex = (data: string): string => createHash('sha256').update(data, 'utf8').digest('hex');

/** Splits a raw query string WITHOUT URLSearchParams' `+`-as-space rule (SigV4 has no such rule). */
function rawQueryPairs(search: string): [string, string][] {
  const s = search.startsWith('?') ? search.slice(1) : search;
  if (s === '') return [];
  return s.split('&').map((pair) => {
    const i = pair.indexOf('=');
    const k = i < 0 ? pair : pair.slice(0, i);
    const v = i < 0 ? '' : pair.slice(i + 1);
    return [decodeURIComponent(k), decodeURIComponent(v)];
  });
}

export interface VerifyInput {
  /** The presigned URL exactly as it would be sent. */
  readonly url: string;
  /** The HTTP method the verifying "server" receives. */
  readonly method: string;
  readonly secretAccessKey: string;
  /** The service the server signs for (`s3`). */
  readonly service?: string;
  /** The request headers ACTUALLY sent (besides `host`, which comes from the URL). Names any case. */
  readonly headers?: Readonly<Record<string, string>>;
}

export interface VerifyResult {
  readonly ok: boolean;
  readonly reasons: readonly string[];
  /** Derived facts, for the fidelity assertions. */
  readonly canonicalUri: string;
  readonly decodedPath: string;
  readonly host: string;
  readonly accessKeyId: string | null;
  readonly region: string | null;
  readonly amzDate: string | null;
  readonly expiresIn: number | null;
  /** `X-Amz-Date + X-Amz-Expires`, ISO, or null. */
  readonly expiresAt: string | null;
  readonly canonicalRequest: string;
  /** The `X-Amz-SignedHeaders` list the URL carries. */
  readonly signedHeaders: readonly string[];
}

/**
 * Verifies one query-presigned URL against `secretAccessKey`. `ok` iff the carried signature equals
 * the independently recomputed one AND the presign parameters are well formed.
 */
export function verifySigV4PresignedUrl(input: VerifyInput): VerifyResult {
  const reasons: string[] = [];
  const service = input.service ?? 's3';
  const u = new URL(input.url);
  const rawPath = input.url.slice(input.url.indexOf(u.host) + u.host.length).split('?')[0]!;
  const segments = rawPath.split('/');
  let decodedPath = '';
  try {
    decodedPath = segments.map((s) => decodeURIComponent(s)).join('/');
  } catch {
    reasons.push('PATH_NOT_DECODABLE');
  }
  const canonicalUri = decodedPath
    .split('/')
    .map((s) => uriEncode(s, false))
    .join('/');
  const pairs = rawQueryPairs(
    input.url.includes('?') ? input.url.slice(input.url.indexOf('?')) : '',
  );
  const params = new Map<string, string>();
  for (const [k, v] of pairs) {
    if (params.has(k)) reasons.push(`DUPLICATE_PARAM:${k}`);
    params.set(k, v);
  }
  const get = (k: string): string | null => params.get(k) ?? null;
  if (get('X-Amz-Algorithm') !== 'AWS4-HMAC-SHA256') reasons.push('ALGORITHM');
  const credential = get('X-Amz-Credential');
  const amzDate = get('X-Amz-Date');
  const expiresRaw = get('X-Amz-Expires');
  const signedHeaders = get('X-Amz-SignedHeaders');
  const signature = get('X-Amz-Signature');
  const scope = credential?.split('/') ?? [];
  if (scope.length !== 5 || scope[3] !== service || scope[4] !== 'aws4_request') {
    reasons.push('CREDENTIAL_SCOPE');
  }
  if (amzDate === null || !/^\d{8}T\d{6}Z$/.test(amzDate)) reasons.push('AMZ_DATE');
  if (amzDate !== null && scope[1] !== amzDate.slice(0, 8)) reasons.push('SCOPE_DATE');
  const expiresIn = expiresRaw !== null && /^\d+$/.test(expiresRaw) ? Number(expiresRaw) : null;
  if (expiresIn === null || expiresIn < 1 || expiresIn > 604_800) reasons.push('EXPIRES');
  if (signedHeaders === null) reasons.push('SIGNED_HEADERS');

  const canonicalQuery = [...params.entries()]
    .filter(([k]) => k !== 'X-Amz-Signature')
    .map(([k, v]) => [uriEncode(k, false), uriEncode(v, false)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const headerNames = (signedHeaders ?? '').split(';');
  const sent: Record<string, string> = { host: u.host };
  for (const [k, v] of Object.entries(input.headers ?? {})) {
    if (k.toLowerCase() !== 'host') sent[k.toLowerCase()] = v;
  }
  for (const h of headerNames) if (!(h in sent)) reasons.push(`MISSING_SIGNED_HEADER:${h}`);
  // SigV4 canonical header value: trimmed, inner whitespace runs collapsed.
  const canon = (v: string): string => v.trim().replace(/\s+/g, ' ');
  const canonicalHeaders = headerNames.map((h) => `${h}:${canon(sent[h] ?? '')}\n`).join('');
  const payload = get('X-Amz-Content-Sha256') ?? 'UNSIGNED-PAYLOAD';
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders ?? '',
    payload,
  ].join('\n');
  const credentialScope = scope.slice(1).join('/');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate ?? '',
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const kDate = hmac(`AWS4${input.secretAccessKey}`, scope[1] ?? '');
  const kRegion = hmac(kDate, scope[2] ?? '');
  const kService = hmac(kRegion, scope[3] ?? '');
  const kSigning = hmac(kService, 'aws4_request');
  const expected = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  if (signature !== expected) reasons.push('SIGNATURE_MISMATCH');

  let expiresAt: string | null = null;
  if (amzDate !== null && /^\d{8}T\d{6}Z$/.test(amzDate) && expiresIn !== null) {
    const iso = `${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`;
    expiresAt = new Date(Date.parse(iso) + expiresIn * 1000).toISOString();
  }
  return {
    ok: reasons.length === 0,
    reasons,
    canonicalUri,
    decodedPath,
    host: u.host,
    accessKeyId: scope[0] ?? null,
    region: scope[2] ?? null,
    amzDate,
    expiresIn,
    expiresAt,
    canonicalRequest,
    signedHeaders: headerNames,
  };
}

/**
 * AWS's published presigned-URL example (S3 API Reference, SigV4 query-parameter authentication):
 * GET https://examplebucket.s3.amazonaws.com/test.txt, 2013-05-24T00:00:00Z, 86400 s, us-east-1,
 * with AWS's documented example credentials. Used ONLY to validate this verifier.
 */
export const AWS_DOC_PRESIGNED_EXAMPLE = {
  method: 'GET',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  url:
    'https://examplebucket.s3.amazonaws.com/test.txt' +
    '?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
    '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request' +
    '&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host' +
    '&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
} as const;
