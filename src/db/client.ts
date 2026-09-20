// PagaMenos · src/db — Prisma client singleton (application boundary; §29).
//
// The db layer is the only layer permitted to hold a Prisma client and touch PostgreSQL. It reads
// DATABASE_URL from the environment at the boundary (never from the pure engine/corpus). A process
// singleton avoids exhausting connections under Next.js hot-reload.
//
// CCA Amendment 01 §29/§35/§40: the shared client's `$transaction` is registered with the
// application-wide DatabaseExecutionContext HERE, once, so every accepted transaction owner is
// observable without editing any owner. The registration is transparent: same arguments, same
// isolation, same result; it only marks "an application transaction is active" for the callback.
import { PrismaClient } from '@prisma/client';

import { installTransactionGovernance } from '@/cca/execution-context';

const globalForPrisma = globalThis as unknown as { pagamenosPrisma?: PrismaClient };

/** The shared Prisma client (lazily reused across hot reloads in development). */
export const prisma: PrismaClient = installTransactionGovernance(
  globalForPrisma.pagamenosPrisma ?? new PrismaClient(),
);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pagamenosPrisma = prisma;
}
