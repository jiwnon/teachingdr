/**
 * 로딩 UI (next-best-practices: file-conventions, suspense-boundaries)
 *
 * - loading.tsx: 해당 세그먼트의 Suspense fallback으로 사용됨.
 * - 데이터 워터폴 방지 시 상위에서 Suspense + loading 또는 이 파일에 의존.
 */
export default function Loading() {
  return (
    <div aria-live="polite" aria-busy="true">
      <p>로딩 중…</p>
    </div>
  );
}
