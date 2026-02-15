/**
 * 404 UI (next-best-practices: error-handling, file-conventions)
 *
 * - notFound() 호출 시 가장 가까운 not-found.tsx 렌더.
 * - Server Component 가능 (기본).
 */
export default function NotFound() {
  return (
    <div>
      <h2>페이지를 찾을 수 없습니다</h2>
      <p>요청한 리소스가 없습니다.</p>
    </div>
  );
}
