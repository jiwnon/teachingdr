/**
 * 생성된 평어 확인: 개별 복사 / 전체 엑셀 다운로드
 * 뼈대만 구성. xlsx 연동 예정.
 */
'use client';

type ResultRow = { studentName: string; generatedText: string };

type Props = {
  results: ResultRow[];
  onCopy?: (index: number) => void;
  onDownloadExcel?: () => void;
};

export default function ResultViewer({
  results,
  onCopy,
  onDownloadExcel,
}: Props) {
  return (
    <div>
      <h2>생성된 평어</h2>
      <button type="button" onClick={onDownloadExcel}>
        전체 엑셀 다운로드
      </button>
      <ul>
        {results.map((r, i) => (
          <li key={i}>
            <strong>{r.studentName}</strong>
            <p>{r.generatedText}</p>
            <button type="button" onClick={() => onCopy?.(i)}>
              복사
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
