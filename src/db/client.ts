// PagaMenos · src/db — Prisma client singleton (application boundary; §29).
//
// The db layer is the only layer permitted to hold a Prisma client and touch PostgreSQL. It reads
// DATABASE_URL from the environment at the boundary (never from the pure engine/corpus). A process
// singleton avoids exhausting connections under Next.js hot-reload.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { pagamenosPrisma?: PrismaClient };

/** The shared Prisma client (lazily reused across hot reloads in development). */
export const prisma: PrismaClient = globalForPrisma.pagamenosPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pagamenosPrisma = prisma;
}
