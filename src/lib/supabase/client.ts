import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para Client Components.
 * Solo usa la anon key: todo lo sensible pasa por Server Actions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
