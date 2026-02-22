/**
 * Next.js 미들웨어
 * - www → non-www 리다이렉트 (OAuth 쿠키 도메인 불일치 방지)
 * - 비로그인 사용자도 체험 가능하므로 라우트 차단 없음.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host') ?? url.host;
  if (host.startsWith('www.')) {
    const target = new URL(url.pathname + url.search, `https://${host.replace(/^www\./, '')}`);
    return NextResponse.redirect(target, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
