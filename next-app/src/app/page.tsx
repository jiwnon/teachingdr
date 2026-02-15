/**
 * 메인: 과목 선택 후 생성 페이지로 이동
 * 초등 평어 도우미 MVP: 1학년 2학기, 국어-가/국어-나/수학/통합
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>초등 평어 도우미</h1>
      <p>학년/학기/과목을 선택하면 평가 기준 템플릿이 자동으로 제공됩니다.</p>
      <Link href="/create">평어 작성 시작</Link>
    </main>
  );
}
