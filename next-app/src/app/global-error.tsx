/**
 * 루트 레이아웃 에러 (next-best-practices: error-handling)
 *
 * - root layout 오류 시에만 사용. 반드시 <html>, <body> 포함.
 * - Client Component.
 */
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <h2>앱 오류가 발생했습니다</h2>
        <button type="button" onClick={() => reset()}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
