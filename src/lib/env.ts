// PagaMenos · typed environment validation (Zod).
//
// Separates server-only secrets from public, client-safe values. Server secrets MUST NOT be
// exposed through NEXT_PUBLIC_* — only keys on the public schema may ever reach the client.
// Parsing is explicit (call-site controlled) rather than import-time, so tests and tooling
// can validate arbitrary sources without a live environment.
import { z } from 'zod';

/** Server-only environment. DATABASE_URL becomes required at runtime from M1/M3.5 onward. */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Public, client-safe environment. Only NEXT_PUBLIC_* values belong here. */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('PagaMenos (validation)'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parseServerEnv(source: Record<string, unknown> = process.env): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function parsePublicEnv(source: Record<string, unknown> = process.env): PublicEnv {
  return publicEnvSchema.parse(source);
}
