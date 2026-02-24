'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getClassroomDataForRatingsAction, upsertRatingAction, addActivityAction, deleteActivityAction } from '@/lib/actions/classrooms';
import { useAppStore } from '@/store/app-store';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import type { Level } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Classroom } from '@/lib/types';
import type { Activity } from '@/lib/types';
import type { LevelStep } from '@/lib/types';
import { SUBJECT_LABELS, LEVEL_STEP_OPTIONS, levelToSelectValue, INTEGRATED_THEMES, INTEGRATED_LIVES } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';

/** 통합 area name "학교(바른생활)" → { theme: '학교', life: '바른생활' } */
function parseIntegratedAreaName(name: string): { theme: string; life: string } | null {
  const m = name.match(/^(.+)\((.+)\)$/);
  return m ? { theme: m[1], life: m[2] } : null;
}

function defaultLevelForStep(step: 2 | 3 | 4): Level {
  if (step === 3) return '3';
  return '2';
}

function ClassRatingsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const sem = searchParams.get('sem');
  const subjectParam = searchParams.get('subject');
  const semester = sem === '2' ? 2 : 1;
  const subject = (subjectParam ?? '국어') as SubjectCode;
  const { data: session, status } = useSession();
  const { setClassroom, setSemester, setSubject, selectedAreaIds, levelStep } = useAppStore();

  const getGuestClassroom = useGuestStore((s) => s.getClassroom);
  const getGuestStudents = useGuestStore((s) => s.getStudents);
  const getGuestRatings = useGuestStore((s) => s.getRatings);
  const setGuestRating = useGuestStore((s) => s.setRating);
  const getGuestActivities = useGuestStore((s) => s.getActivities);
  const addGuestActivity = useGuestStore((s) => s.addActivity);
  const deleteGuestActivity = useGuestStore((s) => s.deleteActivity);

  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ratings, setRatings] = useState<Record<string, Level>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityInput, setActivityInput] = useState('');
  const [activityAreaId, setActivityAreaId] = useState<string>('');
  const [activitySaving, setActivitySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isIntegrated = subject === '통합';
  const [levelStepIntegrated, setLevelStepIntegrated] = useState<2 | 3 | 4>(4);
  /** 통합 전용: studentId -> life -> { theme, level } */
  const [integratedRatings, setIntegratedRatings] = useState<Record<string, Record<string, { theme: string; level: Level }>>>({});
  const intDefaultsSavedRef = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (isGuestId(id)) {
      const c = getGuestClassroom(id);
      if (!c) {
        setError('학급을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setClassroomState(c);
      setClassroom(c);
      setSemester(semester);
      setSubject(subject);
      setStudents(getGuestStudents(id));
      const guestRatings = getGuestRatings();
      setRatings(guestRatings);
      setActivities(getGuestActivities(id, semester, subject).map((a) => ({ ...a, classroom_id: id, semester, subject } as Activity)));
      if (hasSupabaseEnv()) {
        createClient()
          .from('areas')
          .select('id, subject, name, order_index, semester')
          .eq('subject', subject)
          .eq('semester', semester)
          .order('order_index')
          .then(({ data }) => setAreas((data ?? []) as Area[]));
      }
      setLoading(false);
      return;
    }

    if (!session) {
      setError('권한이 없습니다.');
      setLoading(false);
      return;
    }

    setError(null);
    getClassroomDataForRatingsAction(id, semester, subject)
      .then((res) => {
        if (res) {
          setClassroomState(res.classroom);
          setClassroom(res.classroom);
          setSemester(semester);
          setSubject(subject);
          setStudents(res.students);
          setAreas(res.areas);
          setRatings(res.ratings);
          setActivities(res.activities);
        } else setError('학급을 찾을 수 없거나 권한이 없습니다.');
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, semester, subject, session, status, getGuestClassroom, getGuestStudents, getGuestRatings, getGuestActivities, setClassroom, setSemester, setSubject]);

  // 국어/수학만: 단원·레벨단계 없으면 해당 페이지로
  useEffect(() => {
    if (isIntegrated) return;
    if (!loading && !error && selectedAreaIds.length === 0) {
      router.replace(`/classes/${id}/units?sem=${semester}&subject=${subject}`);
      return;
    }
    if (!loading && !error && !levelStep) {
      router.replace(`/classes/${id}/level-step?sem=${semester}&subject=${subject}`);
      return;
    }
  }, [loading, error, isIntegrated, selectedAreaIds.length, levelStep, id, semester, subject, router]);

  // 통합: areas·ratings 로드 후 integratedRatings 초기화 (DB 값 반영, levelToSelectValue 적용)
  useEffect(() => {
    if (!isIntegrated || areas.length === 0 || students.length === 0) return;
    const defaultLev = defaultLevelForStep(levelStepIntegrated);
    const next: Record<string, Record<string, { theme: string; level: Level }>> = {};
    for (const st of students) {
      next[st.id] = { 바른생활: { theme: '학교', level: defaultLev }, 슬기로운생활: { theme: '학교', level: defaultLev }, 즐거운생활: { theme: '학교', level: defaultLev } };
      for (const a of areas) {
        const parsed = parseIntegratedAreaName(a.name);
        if (!parsed || !(parsed.life === '바른생활' || parsed.life === '슬기로운생활' || parsed.life === '즐거운생활')) continue;
        const key = ratingKey(st.id, a.id);
        const dbLevel = ratings[key];
        if (dbLevel) {
          next[st.id][parsed.life] = { theme: parsed.theme, level: levelToSelectValue(dbLevel, levelStepIntegrated) };
        }
      }
    }
    setIntegratedRatings(next);
  }, [isIntegrated, areas, students, ratings, levelStepIntegrated]);

  // 통합: 기본값을 DB에 저장 (최초 1회, 기존 rating이 없는 학생만)
  useEffect(() => {
    if (!isIntegrated || areas.length === 0 || students.length === 0 || intDefaultsSavedRef.current) return;
    intDefaultsSavedRef.current = true;
    const defaultLev = defaultLevelForStep(levelStepIntegrated);
    const areaMap = new Map(areas.map((a) => [a.name, a]));
    for (const st of students) {
      for (const { key: life } of INTEGRATED_LIVES) {
        const area = areaMap.get(`학교(${life})`);
        if (!area) continue;
        const key = ratingKey(st.id, area.id);
        if (ratings[key]) continue;
        setRating(st.id, area.id, defaultLev);
      }
    }
  }, [isIntegrated, areas, students]);

  const areasFiltered = areas.filter((a) => selectedAreaIds.includes(a.id));
  const levelStepForOptions = isIntegrated ? levelStepIntegrated : levelStep;
  const levelOptions = levelStepForOptions ? LEVEL_STEP_OPTIONS[levelStepForOptions] : [];

  const ratingKey = (studentId: string, areaId: string) =>
    isGuestId(id) ? `${studentId}::${areaId}` : `${studentId}-${areaId}`;

  const setRating = async (studentId: string, areaId: string, level: Level | '') => {
    const key = ratingKey(studentId, areaId);
    setRatings((prev) => {
      const next = { ...prev };
      if (level === '') delete next[key];
      else next[key] = level;
      return next;
    });
    if (isGuestId(id)) {
      setGuestRating(key, level === '' ? null : level);
      return;
    }
    const result = await upsertRatingAction(studentId, areaId, level === '' ? null : level);
    if (result.error) setError(result.error);
  };

  const areaByName = isIntegrated ? new Map(areas.map((a) => [a.name, a])) : null;
  const setIntegratedRating = (studentId: string, life: string, field: 'theme' | 'level', value: string) => {
    const cur = integratedRatings[studentId]?.[life] ?? { theme: '학교', level: defaultLevelForStep(levelStepIntegrated) };
    if (field === 'theme') {
      const oldArea = areaByName?.get(`${cur.theme}(${life})`);
      if (oldArea) setRating(studentId, oldArea.id, '');
      const newArea = areaByName?.get(`${value}(${life})`);
      if (newArea) setRating(studentId, newArea.id, (cur.level ?? defaultLevelForStep(levelStepIntegrated)) as Level);
    } else {
      const area = areaByName?.get(`${cur.theme}(${life})`);
      if (area) setRating(studentId, area.id, value as Level);
    }
    setIntegratedRatings((prev) => {
      const c = prev[studentId]?.[life] ?? { theme: '학교', level: defaultLevelForStep(levelStepIntegrated) };
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = { 바른생활: { theme: '학교', level: '2' }, 슬기로운생활: { theme: '학교', level: '2' }, 즐거운생활: { theme: '학교', level: '2' } };
      next[studentId] = { ...next[studentId], [life]: { ...c, [field]: value } };
      return next;
    });
  };

  const addActivity = async () => {
    const desc = activityInput.trim();
    if (!desc || activitySaving) return;
    setActivitySaving(true);
    const areaId = activityAreaId.trim() || null;
    if (isGuestId(id)) {
      addGuestActivity(id, semester, subject, desc, areaId);
      setActivities(
        getGuestActivities(id, semester, subject).map((a) => ({ ...a, classroom_id: id, semester, subject } as Activity))
      );
      setActivityInput('');
      setActivityAreaId('');
      setActivitySaving(false);
      return;
    }
    const result = await addActivityAction(id, semester, subject, desc, areaId);
    setActivitySaving(false);
    if (result.error) setError(result.error);
    else if (result.activity) {
      setActivities((prev) => [...prev, result.activity!]);
      setActivityInput('');
      setActivityAreaId('');
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (isGuestId(id)) {
      deleteGuestActivity(id, activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      return;
    }
    const result = await deleteActivityAction(activityId);
    if (result.error) setError(result.error);
    else setActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!classroom) return <div className="alert alert-error">학급을 찾을 수 없습니다.</div>;
  if (!isIntegrated && (selectedAreaIds.length === 0 || !levelStep)) return <div className="loading">이동 중...</div>;

  const classroomDisplayName = classroom.school_year ? `${classroom.school_year}년 ${classroom.name}` : classroom.name;

  return (
    <div className="card">
      <h1>{classroomDisplayName} · {semester}학기 · {SUBJECT_LABELS[subject]} 등급 입력</h1>
      <p className="sub">
        {isIntegrated
          ? '학생마다 바른생활·슬기로운생활·즐거운생활 단원과 등급(매우잘함/잘함/보통/노력요함)을 선택하세요. (변경 시 자동 저장)'
          : `아래 표: 열은 단원(한글 놀이, 글자를 만들어요 등), 각 셀에서 등급 ${levelOptions.map((o) => o.label).join(' / ')} 선택 (변경 시 자동 저장)`}
        {isGuestId(id) && <span style={{ color: 'var(--color-text-muted)' }}> (체험: 저장되지 않음)</span>}
      </p>

      {isIntegrated && (
        <section style={{ marginBottom: 20 }}>
          <h2 className="section-title">등급 단계</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([2, 3, 4] as const).map((step) => (
              <button
                key={step}
                type="button"
                className={`btn ${levelStepIntegrated === step ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setLevelStepIntegrated(step)}
              >
                {step}단계
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="activities-section" style={{ marginBottom: 24 }}>
        <h2 className="section-title">이번 학기 학습 활동</h2>
        <p className="sub" style={{ marginBottom: 10 }}>
          단원을 고른 뒤, 해당 단원에서 한 활동을 적어 두면 평어 생성 시 GPT가 반영합니다.
        </p>
        <div className="activity-input-row">
          <select
            className="input activity-select"
            value={activityAreaId}
            onChange={(e) => setActivityAreaId(e.target.value)}
            title="단원 선택"
          >
            <option value="">단원 선택 (선택 안 함)</option>
            {(isIntegrated ? areas : areasFiltered).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input
            type="text"
            className="input activity-text"
            placeholder="활동 설명 입력"
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addActivity()}
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
            {activities.map((a) => {
              const areaName = a.area_id ? areas.find((x) => x.id === a.area_id)?.name : null;
              return (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1 }}>
                    {areaName ? <strong>[{areaName}]</strong> : null}
                    {areaName ? ' ' : ''}{a.description}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => deleteActivity(a.id)}
                    aria-label="삭제"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {students.length === 0 ? (
        <div className="alert alert-error">
          이 학급에 학생이 없습니다. <Link href={`/classes/${id}/students`}>학생 명단</Link>에서 먼저 입력하세요.
        </div>
      ) : isIntegrated ? (
        <>
          <div className="integrated-ratings-list">
            {students.map((st) => {
              const row = integratedRatings[st.id] ?? {
                바른생활: { theme: '학교', level: defaultLevelForStep(levelStepIntegrated) },
                슬기로운생활: { theme: '학교', level: defaultLevelForStep(levelStepIntegrated) },
                즐거운생활: { theme: '학교', level: defaultLevelForStep(levelStepIntegrated) },
              };
              return (
                <div key={st.id} className="integrated-student-card">
                  <div className="integrated-student-name">{st.number}. {st.name}</div>
                  <div className="integrated-lives-row">
                    {INTEGRATED_LIVES.map(({ key: life, label }) => (
                      <div key={life} className="integrated-life-cell">
                        <span className="integrated-life-label">{label}</span>
                        <div className="integrated-selects">
                          <select
                            className="input input-level"
                            value={row[life]?.theme ?? '학교'}
                            onChange={(e) => setIntegratedRating(st.id, life, 'theme', e.target.value)}
                          >
                            {INTEGRATED_THEMES.map((theme) => (
                              <option key={theme} value={theme}>{theme}</option>
                            ))}
                          </select>
                          <select
                            className="input input-level"
                            value={row[life]?.level ?? defaultLevelForStep(levelStepIntegrated)}
                            onChange={(e) => setIntegratedRating(st.id, life, 'level', e.target.value)}
                          >
                            {levelOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="action-buttons" style={{ justifyContent: 'space-between' }}>
            <Link href={`/classes/${id}`} className="btn btn-secondary">
              ← 학급으로
            </Link>
            <Link href="/review" className="btn btn-primary">
              평어 생성 →
            </Link>
          </div>
        </>
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
                      const dbLevel = ratings[ratingKey(st.id, a.id)];
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
          <div className="action-buttons" style={{ justifyContent: 'space-between' }}>
            <Link href={`/classes/${id}/level-step?sem=${semester}&subject=${subject}`} className="btn btn-secondary">
              ← 등급 단계
            </Link>
            <Link href="/review" className="btn btn-primary">
              평어 생성 →
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
