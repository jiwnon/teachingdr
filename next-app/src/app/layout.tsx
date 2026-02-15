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
  title: { default: 'ReportMate', template: '%s | ReportMate' },
  description: '생활기록부 평어를 빠르게 작성하는 웹 앱. 학년/학기/과목 선택 후 등급만 입력하면 평어 자동 생성.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'ReportMate' },
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
