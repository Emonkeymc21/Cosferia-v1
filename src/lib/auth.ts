import { cache } from 'react';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';
import { createClient } from './supabase/server';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  storeId: string | null;
  storeName: string | null;
}

/**
 * Usuario actual, o null.
 *
 * cache() de React deduplica la llamada dentro del mismo render de
 * servidor: podes usarla en el layout y en la pagina sin pegarle dos
 * veces a la base.
 *
 * Si el usuario existe en auth.users pero todavia no en nuestra tabla
 * (primer login), lo creamos aca. Es mas robusto que depender solo del
 * trigger de Supabase, que puede fallar en silencio.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const metadata = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string };
  const displayName = metadata.full_name ?? metadata.name ?? user.email.split('@')[0] ?? 'Usuario';

  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: displayName,
      avatarUrl: metadata.avatar_url ?? null,
    },
    update: {},
    include: { store: { select: { id: true, name: true } } },
  });

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    avatarUrl: dbUser.avatarUrl,
    storeId: dbUser.store?.id ?? null,
    storeName: dbUser.store?.name ?? null,
  };
});

/** Para acciones que exigen sesion. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Necesitas iniciar sesion.');
  return user;
}

/** Para acciones de vendedor. */
export async function requireStore(): Promise<SessionUser & { storeId: string }> {
  const user = await requireUser();
  if (!user.storeId) throw new Error('Necesitas activar tu tienda para hacer esto.');
  return user as SessionUser & { storeId: string };
}
