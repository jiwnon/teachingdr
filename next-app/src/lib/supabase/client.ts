/**
 * Supabase 브라우저 클라이언트
 * env 없으면 null 반환 → 페이지에서 "설정 필요" 안내 가능
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.'
    );
  }

  return createBrowserClient(url, anonKey);
}

/** env 존재 여부만 확인 (에러 메시지 표시용) */
export function hasSupabaseEnv(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
