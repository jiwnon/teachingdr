/**
 * 학생 명단 입력 (한 줄에 한 명 또는 엑셀 붙여넣기)
 */
'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/app-store';
import SubjectSelector from '@/components/SubjectSelector';
import StudentInput from '@/components/StudentInput';
import type { SubjectCode } from '@/lib/types';

export default function StudentsPage() {
  const { subject, studentNames, setSubject, setStudentNames } = useAppStore();

  const handleSubjectChange = (s: SubjectCode) => setSubject(s);
  const handleTextChange = (text: string) => {
    const names = text
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    setStudentNames(names);
  };

  return (
    <main>
      <h1>학생 명단</h1>
      <SubjectSelector
        value={subject ?? undefined}
        onChange={handleSubjectChange}
      />
      <StudentInput
        value={studentNames.join('\n')}
        onChange={handleTextChange}
        placeholder="한 줄에 한 명씩 입력하거나 엑셀에서 붙여넣기"
      />
      <Link href="/ratings">다음: 등급 입력</Link>
    </main>
  );
}
