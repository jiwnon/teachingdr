'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
import type { Level } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Classroom } from '@/lib/types';
import type { Activity } from '@/lib/types';
import type { LevelStep } from '@/lib/types';
import { SUBJECT_LABELS, LEVEL_STEP_OPTIONS, levelToSelectValue } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';

function ClassRatingsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const sem = searchParams.get('sem');
  const subjectParam = searchParams.get('subject');
  const semester = sem === '2' ? 2 : 1;
  const subject = (subjectParam ?? '국어') as SubjectCode;
  const { setClassroom, setSemester, setSubject, selectedAreaIds, levelStep } = useAppStore();

  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ratings, setRatings] = useState<Record<string, Level>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityInput, setActivityInput] = useState('');
  const [activitySaving, setActivitySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
      setLoading(false);
      return;
    }
    setError(null);
    setClassroom(null);
    setStudents([]);
    setAreas([]);
    setRatings({});
    const supabase = createClient();
    const run = async () => {
      try {
        const [c, s, a, r, act] = await Promise.all([
          supabase.from('classrooms').select('id, grade, class_number, name').eq('id', id).single(),
          supabase.from('students').select('id, number, name').eq('classroom_id', id).order('number'),
          supabase.from('areas').select('id, subject, name, order_index, semester').eq('subject', subject).eq('semester', semester).order('order_index'),
          supabase.from('ratings').select('student_id, area_id, level'),
          supabase.from('activities').select('id, classroom_id, semester, subject, description, created_at').eq('classroom_id', id).eq('semester', semester).eq('subject', subject).order('created_at', { ascending: true }),
        ]);
        if (c.error) setError(c.error.message);
        else if (c.data) {
          setClassroomState(c.data as Classroom);
          setClassroom(c.data as Classroom);
        }
        setSemester(semester);
        setSubject(subject);
        if (!c.error && s.error) setError(s.error.message);
        else if (!c.error) setStudents((s.data ?? []) as Student[]);
        if (!c.error && a.error) setError(a.error.message);
        else if (!c.error) {
          const allAreas = (a.data ?? []) as Area[];
          setAreas(allAreas);
        }
        if (!c.error && r.error) setError(r.error.message);
        else if (!c.error && r.data) {
          const map: Record<string, Level> = {};
          for (const x of r.data) {
            map[`${x.student_id}-${x.area_id}`] = x.level as Level;
          }
          setRatings(map);
        }
        if (!c.error && act.error) setError(act.error.message);
        else if (!c.error) setActivities((act.data ?? []) as Activity[]);
      } catch (e) {
        setError((e as Error)?.message ?? '로드 실패');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id, semester, subject, setClassroom, setSemester, setSubject]);

  // 단원/레벨단계는 세션만 유지 → 없으면 단원 선택으로
  useEffect(() => {
    if (!loading && !error && selectedAreaIds.length === 0) {
      router.replace(`/classes/${id}/units?sem=${semester}&subject=${subject}`);
      return;
    }
    if (!loading && !error && !levelStep) {
      router.replace(`/classes/${id}/level-step?sem=${semester}&subject=${subject}`);
      return;
    }
  }, [loading, error, selectedAreaIds.length, levelStep, id, semester, subject, router]);

  const areasFiltered = areas.filter((a) => selectedAreaIds.includes(a.id));
  const levelOptions = levelStep ? LEVEL_STEP_OPTIONS[levelStep] : [];

  const setRating = async (studentId: string, areaId: string, level: Level | '') => {
    setRatings((prev) => {
      const next = { ...prev };
      if (level === '') delete next[`${studentId}-${areaId}`];
      else next[`${studentId}-${areaId}`] = level;
      return next;
    });
    const supabase = createClient();
    if (level === '') {
      await supabase.from('ratings').delete().eq('student_id', studentId).eq('area_id', areaId);
    } else {
      await supabase.from('ratings').upsert(
        { student_id: studentId, area_id: areaId, level },
        { onConflict: 'student_id,area_id' }
      );
    }
  };

  const addActivity = async () => {
    const desc = activityInput.trim();
    if (!desc || activitySaving) return;
    setActivitySaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('activities')
      .insert({ classroom_id: id, semester, subject, description: desc })
      .select('id, classroom_id, semester, subject, description, created_at')
      .single();
    setActivitySaving(false);
    if (err) setError(err.message);
    else if (data) {
      setActivities((prev) => [...prev, data as Activity]);
      setActivityInput('');
    }
  };

  const deleteActivity = async (activityId: string) => {
    const supabase = createClient();
    await supabase.from('activities').delete().eq('id', activityId);
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!classroom) return <div className="alert alert-error">학급을 찾을 수 없습니다.</div>;
  if (selectedAreaIds.length === 0 || !levelStep) return <div className="loading">이동 중...</div>;

  return (
    <div className="card">
      <h1>{classroom.name} · {semester}학기 · {SUBJECT_LABELS[subject]} 등급</h1>
      <p className="sub">
        학생별·선택 단원별로 {levelOptions.map((o) => o.label).join(' / ')} 선택 (변경 시 자동 저장)
      </p>

      <section className="activities-section" style={{ marginBottom: 24 }}>
        <h2 className="section-title">이번 학기 학습 활동</h2>
        <p className="sub" style={{ marginBottom: 10 }}>
          이 과목·학기의 대표 활동을 적어 두면 평어 생성 시 GPT가 반영합니다.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
          <input
            type="text"
            className="input"
            placeholder="활동 설명 입력"
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addActivity()}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={addActivity}
            disabled={activitySaving || !activityInput.trim()}
          >
            {activitySaving ? '추가 중...' : '추가'}
          </button>
        </div>
        {activities.length > 0 && (
          <ul className="activities-list" style={{ margin: 0, paddingLeft: 20 }}>
            {activities.map((a) => (
              <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ flex: 1 }}>{a.description}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => deleteActivity(a.id)}
                  aria-label="삭제"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {students.length === 0 ? (
        <div className="alert alert-error">
          이 학급에 학생이 없습니다. <Link href={`/classes/${id}/students`}>학생 명단</Link>에서 먼저 입력하세요.
        </div>
      ) : (
        <>
          <div className="table-wrap ratings-table">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이름</th>
                  {areasFiltered.map((a) => <th key={a.id}>{a.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td>{st.number}</td>
                    <td>{st.name}</td>
                    {areasFiltered.map((a) => {
                      const dbLevel = ratings[`${st.id}-${a.id}`];
                      const selectValue = dbLevel ? levelToSelectValue(dbLevel, levelStep!) : '';
                      return (
                        <td key={a.id}>
                          <select
                            className="input input-level"
                            value={selectValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRating(st.id, a.id, v === '' ? '' : (v as Level));
                            }}
                          >
                            <option value="">선택</option>
                            {levelOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/review" className="btn btn-primary">
              평어 생성
            </Link>
            <Link href={`/classes/${id}/level-step?sem=${semester}&subject=${subject}`} className="btn btn-ghost">
              레벨 단계 변경
            </Link>
            <Link href={`/classes/${id}/units?sem=${semester}&subject=${subject}`} className="btn btn-ghost">
              단원 다시 선택
            </Link>
            <Link href={`/classes/${id}`} className="btn btn-ghost">
              학급으로
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClassRatingsPage() {
  return (
    <Suspense fallback={<div className="loading">로딩 중...</div>}>
      <ClassRatingsContent />
    </Suspense>
  );
}
