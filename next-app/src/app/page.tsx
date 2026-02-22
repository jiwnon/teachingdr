/**
 * 메인: 비로그인 시 랜딩(소개+회원가입/구글), 로그인 시 학급 중심 안내
 */
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import LandingAuth from '@/components/LandingAuth';

type PageProps = { searchParams: Promise<{ error?: string }> };

async function getRequiredRedirectUri() {
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}/api/auth/callback/google`;
}

export default async function HomePage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const requiredRedirectUri = await getRequiredRedirectUri();

  if (!session) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8 }}>ReportMate</h1>
        <LandingAuth
          requiredRedirectUri={requiredRedirectUri}
          error={params.error}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <h1>ReportMate</h1>
      <p className="sub">
        초등 생활기록부 평어를 빠르게 작성합니다. 학급을 등록하고, 학기·과목을 선택한 뒤 등급을 입력하세요.
      </p>
      <p style={{ marginBottom: 16 }}>아래 순서대로 진행하세요.</p>
      <div className="step-links">
        <Link href="/classes">1. 학급 목록 · 등록</Link>
        <Link href="/classes">2. 학급 선택 → 학기(1학기/2학기) · 과목(국어/수학/통합) 선택</Link>
        <Link href="/classes">3. 등급 입력 → 평어 생성</Link>
      </div>
      <p style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        학급 목록에서 시작하세요. 학급 → 학기·과목 → 단원 → 등급 → 평어 순서로 진행됩니다.
      </p>
    </div>
  );
}
