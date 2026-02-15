/**
 * Supabase 브라우저 클라이언트 (supabase-postgres-best-practices, Supabase Docs)
 *
 * - 클라이언트 컴포넌트 / Route Handlers / Server Actions 등에서 사용.
 * - 연결: Supabase는 Connection Pooling(PgBouncer) 제공. 이 URL은 대시보드에서
 *   "Connection pooling" (Transaction mode) 사용 권장 (conn-pooling).
 * - Auth: 비회원 사용 가능 시 초기화만 하고 사용처에서 분기.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient(url, anonKey);
}
