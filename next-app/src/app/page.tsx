/**
 * 메인: 학급 선택 후 학기·과목·등급 입력 (초등 평어 도우미)
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="card">
      <h1>ReportMate</h1>
      <p className="sub">초등 생활기록부 평어를 빠르게 작성합니다. 학급을 등록하고, 학기·과목을 선택한 뒤 등급을 입력하세요.</p>
      <p style={{ marginBottom: 16 }}>아래 순서대로 진행하세요.</p>
      <div className="step-links">
        <Link href="/classes">1. 학급 목록 · 등록</Link>
        <Link href="/classes">2. 학급 선택 → 학기(1학기/2학기) · 과목(국어/수학/통합) 선택</Link>
        <Link href="/classes">3. 등급 입력 → 평어 생성</Link>
      </div>
      <p style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        기존 방식: <Link href="/students" className="link">학생 명단</Link> · <Link href="/ratings" className="link">과목·등급</Link> · <Link href="/review" className="link">평어 생성</Link>
      </p>
    </div>
  );
}
