/**
 * 메인: 1학년 1학기 국어/수학 평어 도우미 (엑셀 대체)
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>초등 평어 도우미</h1>
      <p>1학년 1학기 국어·수학 평어를 빠르게 작성합니다. (엑셀 대체)</p>
      <nav>
        <Link href="/students">1. 학생 명단</Link>
        <span> → </span>
        <Link href="/ratings">2. 등급 입력</Link>
        <span> → </span>
        <Link href="/review">3. 결과 확인</Link>
      </nav>
    </main>
  );
}
