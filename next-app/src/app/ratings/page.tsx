/**
 * 단원별 등급 입력 (행=학생, 열=단원, 셀=상/중/하)
 */
'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/app-store';
import GradeTable from '@/components/GradeTable';
import type { Level } from '@/lib/types';

// MVP: 1학년 1학기 국어/수학 단원 예시 (실제는 DB templates에서 단원 목록 조회)
const UNITS_BY_SUBJECT: Record<string, string[]> = {
  국어: ['1. 바른 자세로 읽고 쓰기', '2. 바른 말', '3. 소리와 글자'],
  수학: ['1. 9까지의 수', '2. 덧셈과 뺄셈', '3. 여러 가지 도형'],
};

export default function RatingsPage() {
  const { subject, studentNames, grades, setGrade } = useAppStore();
  const units = subject ? UNITS_BY_SUBJECT[subject] ?? [] : [];
  const students = studentNames.map((name, i) => ({ id: i + 1, name }));

  const handleGradeChange = (studentId: number, unit: string, level: Level) => {
    setGrade(studentId, unit, level);
  };

  const gradesRecord: Record<string, Level> = { ...grades };

  return (
    <main>
      <h1>등급 입력</h1>
      <p>과목: {subject ?? '-'}</p>
      {students.length === 0 ? (
        <p>학생 명단이 없습니다. <Link href="/students">학생 명단</Link>에서 먼저 입력하세요.</p>
      ) : (
        <>
          <GradeTable
            students={students}
            units={units}
            grades={gradesRecord}
            onGradeChange={handleGradeChange}
          />
          <Link href="/review">다음: 결과 확인</Link>
        </>
      )}
    </main>
  );
}
