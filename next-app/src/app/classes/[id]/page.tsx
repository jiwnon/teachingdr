'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getClassroomIfOwnedAction } from '@/lib/actions/classrooms';
import { useAppStore } from '@/store/app-store';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import type { Classroom } from '@/lib/types';
import type { Semester } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';
import { MAIN_SUBJECTS, SUBJECT_LABELS } from '@/lib/types';

export default function ClassDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const { setClassroom, setSemester, setSubject } = useAppStore();
  const getGuestClassroom = useGuestStore((s) => s.getClassroom);

  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedMainSubject, setSelectedMainSubject] = useState<'국어' | '수학' | '통합' | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (isGuestId(id)) {
      const c = getGuestClassroom(id);
      if (c) {
        setClassroomState(c);
        setClassroom(c);
      }
      setLoading(false);
      return;
    }

    if (!session) {
      setError('학급을 찾을 수 없습니다. 로그인하면 저장된 학급을 볼 수 있습니다.');
      setLoading(false);
      return;
    }

    setError(null);
    getClassroomIfOwnedAction(id)
      .then((c) => {
        if (c) {
          setClassroomState(c);
          setClassroom(c);
        } else setError('학급을 찾을 수 없거나 접근 권한이 없습니다.');
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, session, status, getGuestClassroom, setClassroom]);

  const currentSubject = (): SubjectCode | null => {
    if (!selectedMainSubject) return null;
    return selectedMainSubject;
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error || !classroom) return <div className="alert alert-error">{error ?? '학급을 찾을 수 없습니다.'}</div>;

  const classroomDisplayName = classroom.school_year ? `${classroom.school_year}년 ${classroom.name}` : classroom.name;

  return (
    <div className="card">
      <h1>{classroomDisplayName}</h1>
      <p className="sub">학기를 고른 뒤 과목을 선택하고, 해당 과목의 등급을 입력하세요.</p>

      <section className="subject-section" style={{ marginBottom: 24 }}>
        <h2 className="section-title">1. 학기 선택</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${selectedSemester === 1 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedSemester(1)}
          >
            1학기
          </button>
          <button
            type="button"
            className={`btn ${selectedSemester === 2 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedSemester(2)}
          >
            2학기
          </button>
        </div>
      </section>

      {selectedSemester && (
        <section className="subject-section" style={{ marginBottom: 24 }}>
          <h2 className="section-title">2. 과목 선택</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            국어(5단원), 수학(5단원), 통합(바른생활·슬기로운생활·즐거운생활) 중 선택하세요.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {MAIN_SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn ${selectedMainSubject === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedMainSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {currentSubject() && (
            <div style={{ marginTop: 16 }}>
              <Link
                href={
                  currentSubject() === '통합'
                    ? `/classes/${id}/ratings?sem=${selectedSemester}&subject=통합`
                    : `/classes/${id}/units?sem=${selectedSemester}&subject=${currentSubject()}`
                }
                className="btn btn-primary"
              >
                {currentSubject() === '통합'
                  ? `등급 입력 (${selectedSemester}학기 · 통합)`
                  : `단원 선택 후 등급 입력 (${selectedSemester}학기 · ${SUBJECT_LABELS[currentSubject()!]})`}
              </Link>
            </div>
          )}
        </section>
      )}

      <hr style={{ margin: '24px 0' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link href={`/classes/${id}/students`} className="btn btn-secondary">
          학생 명단
        </Link>
        <Link href="/classes" className="btn btn-ghost">
          학급 목록으로
        </Link>
      </div>
    </div>
  );
}
