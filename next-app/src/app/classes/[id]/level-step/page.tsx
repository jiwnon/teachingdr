'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getClassroomIfOwnedAction } from '@/lib/actions/classrooms';
import { useAppStore } from '@/store/app-store';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import type { Classroom } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';
import type { Semester } from '@/lib/types';
import type { LevelStep } from '@/lib/types';
import { SUBJECT_LABELS, LEVEL_STEP_OPTIONS } from '@/lib/types';

const STEP_LABELS: Record<LevelStep, string> = {
  2: '2단계: 잘함 / 노력요함',
  3: '3단계: 잘함 / 보통 / 노력요함',
  4: '4단계: 매우잘함 / 잘함 / 보통 / 노력요함',
};

function LevelStepContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const sem = searchParams.get('sem');
  const subjectParam = searchParams.get('subject');
  const semester = (sem === '2' ? 2 : 1) as Semester;
  const subject = (subjectParam ?? '국어') as SubjectCode;

  const { data: session, status } = useSession();
  const { setClassroom, setSemester, setSubject, setLevelStep, selectedAreaIds } = useAppStore();
  const getGuestClassroom = useGuestStore((s) => s.getClassroom);

  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [selectedStep, setSelectedStep] = useState<LevelStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (isGuestId(id)) {
      const c = getGuestClassroom(id);
      if (c) {
        setClassroomState(c);
        setClassroom(c);
      }
      setSemester(semester);
      setSubject(subject);
      setLoading(false);
      return;
    }

    if (!session) {
      setError('권한이 없습니다.');
      setLoading(false);
      return;
    }

    setError(null);
    getClassroomIfOwnedAction(id)
      .then((c) => {
        if (c) {
          setClassroomState(c);
          setClassroom(c);
        } else setError('학급을 찾을 수 없거나 권한이 없습니다.');
        setSemester(semester);
        setSubject(subject);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, semester, subject, session, status, getGuestClassroom, setClassroom, setSemester, setSubject]);

  const goNext = (step: LevelStep) => {
    setLevelStep(step);
    router.push(`/classes/${id}/ratings?sem=${semester}&subject=${subject}`);
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!classroom) return <div className="alert alert-error">학급을 찾을 수 없습니다.</div>;
  if (selectedAreaIds.length === 0) {
    return (
      <div className="alert alert-error">
        단원을 먼저 선택해 주세요. <Link href={`/classes/${id}/units?sem=${semester}&subject=${subject}`}>단원 선택</Link>
      </div>
    );
  }

  const classroomDisplayName = classroom.school_year ? `${classroom.school_year}년 ${classroom.name}` : classroom.name;

  return (
    <div className="card">
      <h1>{classroomDisplayName} · {semester}학기 · {SUBJECT_LABELS[subject]} 등급 단계</h1>
      <p className="sub">등급(매우잘함 / 잘함 / 보통 / 노력요함)을 몇 단계로 나눌지 선택하세요.</p>

      <section className="level-step-section" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {( [2, 3, 4] as LevelStep[] ).map((step) => (
            <div key={step}>
              <button
                type="button"
                className={`btn ${selectedStep === step ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => setSelectedStep(step)}
              >
                {STEP_LABELS[step]}
              </button>
              {selectedStep === step && (
                <p className="sub" style={{ marginTop: 6, marginLeft: 4 }}>
                  {LEVEL_STEP_OPTIONS[step].map((o) => o.label).join(' / ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="action-buttons" style={{ justifyContent: 'space-between' }}>
        <Link href={`/classes/${id}/units?sem=${semester}&subject=${subject}`} className="btn btn-secondary">
          ← 단원 선택
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => selectedStep && goNext(selectedStep)}
          disabled={!selectedStep}
        >
          등급 입력 →
        </button>
      </div>
    </div>
  );
}

export default function LevelStepPage() {
  return (
    <Suspense fallback={<div className="loading">로딩 중...</div>}>
      <LevelStepContent />
    </Suspense>
  );
}
