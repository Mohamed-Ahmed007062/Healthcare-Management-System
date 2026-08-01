/**
 * PostgreSQL connection lifecycle management via Prisma Client and pg driver adapter.
 *
 * - Instantiates PrismaClient with PrismaPg driver adapter.
 * - Manages $connect and $disconnect.
 * - Hooks SIGINT/SIGTERM to close the connection gracefully before process exits.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';
import { logger, logBoot, logShutdown } from './logger';

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export async function connectDB(): Promise<PrismaClient> {
  try {
    await prisma.$connect();
    logBoot('PostgreSQL connected via Prisma Client & pg driver adapter');
    return prisma;
  } catch (err) {
    logger.error({ err }, 'PostgreSQL connection error via Prisma');
    logShutdown('PostgreSQL unreachable — aborting boot');
    throw err;
  }
}

export async function closeDB(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
    logShutdown('PostgreSQL connection closed gracefully');
  } catch (err) {
    logger.error({ err }, 'Error while disconnecting Prisma Client');
  }
}

/** Register graceful-shutdown hooks for SIGINT/SIGTERM. Call after boot. */
export function registerShutdownHooks(server: { close: (cb?: () => void) => void }): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logShutdown(`Received ${signal}, shutting down...`);

    server.close(() => {
      closeDB().finally(() => process.exit(0));
    });

    // Hard exit if graceful shutdown stalls
    setTimeout(() => {
      logShutdown('Forcing exit after shutdown timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/** Quick ping used by `/health/db`. */
export async function pingDB(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
