'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
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

  const { setClassroom, setSemester, setSubject, setLevelStep, selectedAreaIds } = useAppStore();
  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [selectedStep, setSelectedStep] = useState<LevelStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
      setLoading(false);
      return;
    }
    setError(null);
    const run = async () => {
      try {
        const { data, error: err } = await createClient()
          .from('classrooms')
          .select('id, grade, class_number, name')
          .eq('id', id)
          .single();
        if (err) setError(err.message);
        else if (data) {
          setClassroomState(data as Classroom);
          setClassroom(data as Classroom);
        }
        setSemester(semester);
        setSubject(subject);
      } catch (e) {
        setError((e as Error)?.message ?? '로드 실패');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id, semester, subject, setClassroom, setSemester, setSubject]);

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

  return (
    <div className="card">
      <h1>{classroom.name} · {semester}학기 · {SUBJECT_LABELS[subject]} 레벨 단계</h1>
      <p className="sub">등급을 몇 단계로 나눌지 선택하세요.</p>

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

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => selectedStep && goNext(selectedStep)}
          disabled={!selectedStep}
        >
          다음: 학생별 평가 입력
        </button>
        <Link href={`/classes/${id}/units?sem=${semester}&subject=${subject}`} className="btn btn-ghost">
          단원 선택으로
        </Link>
        <Link href={`/classes/${id}`} className="btn btn-ghost">
          학급으로
        </Link>
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
