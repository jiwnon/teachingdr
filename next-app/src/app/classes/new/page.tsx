'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createClassroomAction } from '@/lib/actions/classrooms';
import { useGuestStore } from '@/store/guest-store';

export default function NewClassPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const addClassroom = useGuestStore((s) => s.addClassroom);

  const currentYear = new Date().getFullYear();
  const [schoolYear, setSchoolYear] = useState<number>(currentYear);
  const [grade, setGrade] = useState<number>(1);
  const [classNumber, setClassNumber] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = `${grade}학년 ${classNumber}반`;
  const displayName = schoolYear ? `${schoolYear}년 ${name}` : name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (session?.user) {
        const result = await createClassroomAction(grade, classNumber, name, schoolYear);
        if ('error' in result) {
          setError(result.error);
          setSaving(false);
          return;
        }
        setSuccess(true);
        setSaving(false);
        setTimeout(() => router.push(`/classes/${result.id}/students`), 1200);
        return;
      }

      const classroom = addClassroom({ grade, class_number: classNumber, name, school_year: schoolYear });
      setSuccess(true);
      setSaving(false);
      setTimeout(() => router.push(`/classes/${classroom.id}/students`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '학급 생성 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  if (status === 'loading') return <div className="loading">로딩 중...</div>;

  return (
    <div className="card">
      <h1>학급 등록</h1>
      <p className="sub">
        연도·학년·반을 선택하면 학급 이름이 자동으로 만들어집니다. (예: 2025년 1학년 1반)
        {!session && (
          <span style={{ display: 'block', marginTop: 4, color: 'var(--color-text-muted)' }}>
            체험 모드: 저장되지 않습니다.
          </span>
        )}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="schoolYear">연도</label>
          <select
            id="schoolYear"
            className="input"
            value={schoolYear}
            onChange={(e) => setSchoolYear(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => currentYear - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="grade">학년</label>
          <select
            id="grade"
            className="input"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="class">반</label>
          <select
            id="class"
            className="input"
            value={classNumber}
            onChange={(e) => setClassNumber(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}반
              </option>
            ))}
          </select>
        </div>
        <p style={{ marginBottom: 16 }}>
          <strong>학급:</strong> {displayName}
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            저장 완료! 학생 목록으로 이동합니다...
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving || success}>
            {saving ? '저장 중...' : session ? '등록' : '학생 추가'}
          </button>
          <Link href="/classes" className="btn btn-ghost">
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
