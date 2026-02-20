/**
 * Supabase 서버 클라이언트 (Supabase SSR, next-best-practices async cookies)
 *
 * - Server Components, Route Handlers에서 사용. 쿠키로 세션 유지.
 * - Next 15+: cookies() 비동기. Next 14에서는 동기일 수 있음.
 * - RLS: supabase-postgres-best-practices (security-rls-basics) 적용 시
 *   auth.uid() 기반 정책으로 테넌트 격리.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component에서는 set 무시될 수 있음
        }
      },
    },
  });
}
