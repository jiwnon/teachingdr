/**
 * 루트 레이아웃 (next-best-practices: file-conventions, metadata)
 *
 * - metadata / viewport: Server Component 전용. generateMetadata는 동적 메타용.
 * - PWA: manifest, themeColor, appleWebApp
 * - ui-ux-pro-max: 터치 타겟, 접근성은 하위 컴포넌트/globals.css에서 적용
 */
import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: '성적도우미', template: '%s | 성적도우미' },
  description: '엑셀 기반 문장 생성 및 성적 관리',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: '성적도우미' },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
