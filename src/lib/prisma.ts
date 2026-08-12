import { PrismaClient } from '@prisma/client';

/**
 * Cliente unico de Prisma.
 * En desarrollo Next.js recarga los modulos en cada cambio: sin este
 * singleton se abririan decenas de conexiones hasta agotar el pool
 * de Supabase (que en el plan gratuito es chico).
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
