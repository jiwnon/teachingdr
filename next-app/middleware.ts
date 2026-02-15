/**
 * Next.js 미들웨어 (next-best-practices: file-conventions)
 *
 * - v14–15: middleware.ts, export config.matcher
 * - Supabase 세션 갱신: 아래 주석 해제 시 적용
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // return await updateSession(request);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
