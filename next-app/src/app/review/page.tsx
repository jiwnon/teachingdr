/**
 * 생성된 평어 확인: 복사 / 엑셀 다운로드
 */
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import ResultViewer from '@/components/ResultViewer';
import { generateComment } from '@/lib/generator';
import type { Template } from '@/lib/types';

// MVP: 실제로는 Supabase templates 테이블에서 1학년 1학기 해당 과목 조회
const MOCK_TEMPLATES: Template[] = [];

function useResults() {
  const { subject, studentNames, grades } = useAppStore();
  return useMemo(() => {
    const templates = MOCK_TEMPLATES; // TODO: fetch by grade=1, semester=1, subject
    const units = Array.from(
      new Set(
        Object.keys(grades)
          .map((k) => {
            const i = k.indexOf('-');
            return i >= 0 ? k.slice(i + 1) : '';
          })
          .filter(Boolean)
      )
    );
    return studentNames.map((name, i) => {
      const studentId = i + 1;
      const unitLevels = units.map((unit) => ({
        unit,
        level: grades[`${studentId}-${unit}`] ?? '중',
      }));
      const generatedText = generateComment(unitLevels, templates, {
        studentId,
      });
      return { studentName: name, generatedText };
    });
  }, [subject, studentNames, grades]);
}

export default function ReviewPage() {
  const results = useResults();

  const handleCopy = (index: number) => {
    const text = results[index]?.generatedText;
    if (text) void navigator.clipboard.writeText(text);
  };
  const handleDownloadExcel = () => {
    // TODO: xlsx로 다운로드
  };

  return (
    <main>
      <h1>결과 확인</h1>
      <ResultViewer
        results={results}
        onCopy={handleCopy}
        onDownloadExcel={handleDownloadExcel}
      />
      <Link href="/">처음으로</Link>
    </main>
  );
}
