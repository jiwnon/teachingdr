/**
 * 홈 페이지 (next-best-practices: data-patterns)
 *
 * - 읽기: Server Component에서 직접 fetch/DB. 클라이언트 읽기는 Route Handler 또는 props 전달.
 * - 동적 params/searchParams: Next 15+에서는 Promise<...> 타입 및 await 사용 (async-patterns).
 */
export default function HomePage() {
  return (
    <main>
      <h1>성적도우미</h1>
      <p>설정이 완료되었습니다. 페이지와 기능을 추가하세요.</p>
    </main>
  );
}
