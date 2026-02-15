/**
 * 세그먼트 에러 바운더리 (next-best-practices: error-handling)
 *
 * - error.tsx는 반드시 Client Component ('use client').
 * - reset()으로 하위 트리 재시도.
 */
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>문제가 발생했습니다</h2>
      <button type="button" onClick={() => reset()}>
        다시 시도
      </button>
    </div>
  );
}
