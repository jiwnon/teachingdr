/**
 * 메인: 1학년 1학기 국어/수학 평어 도우미 (엑셀 대체)
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="card">
      <h1>초등 평어 도우미</h1>
      <p className="sub">1학년 1학기 국어·수학 평어를 빠르게 작성합니다. (엑셀 대체)</p>
      <p style={{ marginBottom: 16 }}>아래 순서대로 진행하세요.</p>
      <div className="step-links">
        <Link href="/students">1. 학생 명단</Link>
        <Link href="/ratings">2. 과목·등급 입력</Link>
        <Link href="/review">3. 평어 생성</Link>
      </div>
    </div>
  );
}
