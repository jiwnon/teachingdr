'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
import type { Classroom } from '@/lib/types';
import type { Semester } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';
import { MAIN_SUBJECTS, INTEGRATED_SUBJECTS, SUBJECT_LABELS } from '@/lib/types';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setClassroom, setSemester, setSubject } = useAppStore();
  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedMainSubject, setSelectedMainSubject] = useState<'국어' | '수학' | '통합' | null>(null);
  const [selectedSubSubject, setSelectedSubSubject] = useState<SubjectCode | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
      setLoading(false);
      return;
    }
    setError(null);
    createClient()
      .from('classrooms')
      .select('id, grade, class_number, name')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else {
          const c = data as Classroom;
          setClassroomState(c);
          setClassroom(c);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? '로드 실패');
        setLoading(false);
      });
  }, [id, setClassroom]);

  const goToRatings = (sem: Semester, subject: SubjectCode) => {
    setSemester(sem);
    setSubject(subject);
    router.push(`/classes/${id}/ratings?sem=${sem}&subject=${subject}`);
  };

  const currentSubject = (): SubjectCode | null => {
    if (selectedMainSubject === '국어') return '국어';
    if (selectedMainSubject === '수학') return '수학';
    if (selectedMainSubject === '통합') return selectedSubSubject;
    return null;
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error || !classroom) return <div className="alert alert-error">{error ?? '학급을 찾을 수 없습니다.'}</div>;

  return (
    <div className="card">
      <h1>{classroom.name}</h1>
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
                onClick={() => {
                  setSelectedMainSubject(s);
                  if (s !== '통합') setSelectedSubSubject(null);
                }}
              >
                {s === '통합' ? '통합' : s}
              </button>
            ))}
          </div>
          {selectedMainSubject === '통합' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {INTEGRATED_SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn ${selectedSubSubject === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSelectedSubSubject(s)}
                >
                  {SUBJECT_LABELS[s]}
                </button>
              ))}
            </div>
          )}
          {currentSubject() && (
            <div style={{ marginTop: 16 }}>
              <Link
                href={`/classes/${id}/ratings?sem=${selectedSemester}&subject=${currentSubject()}`}
                className="btn btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  goToRatings(selectedSemester!, currentSubject()!);
                }}
              >
                등급 입력하기 ({selectedSemester}학기 · {SUBJECT_LABELS[currentSubject()!]})
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
