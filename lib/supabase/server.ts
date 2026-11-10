import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Supabase client acting as the signed-in visitor (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'not-configured', {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}
