'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { getClassroomWithAreasAction } from '@/lib/actions/classrooms';
import { useAppStore } from '@/store/app-store';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import type { Area } from '@/lib/types';
import type { Classroom } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';
import type { Semester } from '@/lib/types';
import { SUBJECT_LABELS, INTEGRATED_THEMES, INTEGRATED_LIVES } from '@/lib/types';

/** 통합 area name "학교(바른생활)" → { theme: '학교', life: '바른생활' } */
function parseIntegratedAreaName(name: string): { theme: string; life: string } | null {
  const m = name.match(/^(.+)\((.+)\)$/);
  return m ? { theme: m[1], life: m[2] } : null;
}

function UnitsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const sem = searchParams.get('sem');
  const subjectParam = searchParams.get('subject');
  const semester = (sem === '2' ? 2 : 1) as Semester;
  const subject = (subjectParam ?? '국어') as SubjectCode;

  const { data: session, status } = useSession();
  const { setClassroom, setSemester, setSubject, setSelectedAreaIds, selectedAreaIds } = useAppStore();
  const getGuestClassroom = useGuestStore((s) => s.getClassroom);

  const [classroom, setClassroomState] = useState<Classroom | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedAreaIds));
  /** 통합 전용: 바른생활/슬기로운생활/즐거운생활 각 선택한 테마(학교|사람들|우리나라|탐험) */
  const [selectedByLife, setSelectedByLife] = useState<Record<string, string>>({
    바른생활: '',
    슬기로운생활: '',
    즐거운생활: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (!hasSupabaseEnv()) {
        setLoading(false);
        return;
      }
      createClient()
        .from('areas')
        .select('id, subject, name, order_index, semester')
        .eq('subject', subject)
        .eq('semester', semester)
        .order('order_index')
        .then(({ data, error: err }) => {
          if (err) setError(err.message);
          else {
            const areaList = (data ?? []) as Area[];
            setAreas(areaList);
            setSelected(new Set(areaList.filter((x) => selectedAreaIds.includes(x.id)).map((x) => x.id)));
          }
          setLoading(false);
        });
      return;
    }

    if (!session) {
      setError('권한이 없습니다.');
      setLoading(false);
      return;
    }

    setError(null);
    getClassroomWithAreasAction(id, subject, semester)
      .then((res) => {
        if (res) {
          setClassroomState(res.classroom);
          setClassroom(res.classroom);
          setSemester(semester);
          setSubject(subject);
          setAreas(res.areas);
          setSelected(new Set(res.areas.filter((x) => selectedAreaIds.includes(x.id)).map((x) => x.id)));
        } else setError('학급을 찾을 수 없거나 권한이 없습니다.');
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, semester, subject, session, status, getGuestClassroom, setClassroom, setSemester, setSubject, selectedAreaIds]);

  // 통합: 기존 selectedAreaIds(3개)에서 selectedByLife 복원 (뒤로가기 시)
  useEffect(() => {
    if (subject !== '통합' || areas.length === 0 || selectedAreaIds.length !== 3) return;
    const areaByName = new Map(areas.map((a) => [a.name, a]));
    const next: Record<string, string> = { 바른생활: '', 슬기로운생활: '', 즐거운생활: '' };
    for (const a of areas) {
      if (!selectedAreaIds.includes(a.id)) continue;
      const parsed = parseIntegratedAreaName(a.name);
      if (parsed && (parsed.life === '바른생활' || parsed.life === '슬기로운생활' || parsed.life === '즐거운생활')) next[parsed.life] = parsed.theme;
    }
    setSelectedByLife((prev) => (prev.바른생활 && prev.슬기로운생활 && prev.즐거운생활 ? prev : next));
  }, [subject, areas, selectedAreaIds]);

  const toggle = (areaId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const isIntegrated = subject === '통합';
  const areaByName = isIntegrated ? new Map(areas.map((a) => [a.name, a])) : null;
  const integratedSelectedIds: string[] = isIntegrated && areaByName
    ? INTEGRATED_LIVES.map(({ key: life }) => {
        const theme = selectedByLife[life];
        if (!theme) return null;
        const area = areaByName.get(`${theme}(${life})`);
        return area?.id ?? null;
      }).filter((id): id is string => id != null)
    : [];

  const goNext = () => {
    const ids = isIntegrated ? integratedSelectedIds : Array.from(selected);
    if (ids.length === 0) return;
    if (isIntegrated && ids.length !== 3) return;
    setSelectedAreaIds(ids);
    router.push(`/classes/${id}/level-step?sem=${semester}&subject=${subject}`);
  };

  const canGoNext = isIntegrated ? integratedSelectedIds.length === 3 : selected.size > 0;

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!classroom) return <div className="alert alert-error">학급을 찾을 수 없습니다.</div>;

  const classroomDisplayName = classroom.school_year ? `${classroom.school_year}년 ${classroom.name}` : classroom.name;

  return (
    <div className="card">
      <h1>{classroomDisplayName} · {semester}학기 · {SUBJECT_LABELS[subject]} 단원 선택</h1>
      <p className="sub">
        {isIntegrated ? '바른생활·슬기로운생활·즐거운생활 각각 단원을 하나씩 선택하세요.' : '평가할 단원(한글 놀이, 글자를 만들어요 등)을 선택하세요. (최소 1개) 선택한 단원마다 다음 단계에서 등급(매우잘함/잘함/보통/노력요함)을 입력합니다.'}
      </p>

      <section className="units-section" style={{ marginBottom: 24 }}>
        {isIntegrated ? (
          <div className="integrated-unit-select-list">
            {INTEGRATED_LIVES.map(({ key: life, label }) => (
              <div key={life} className="integrated-unit-select-row">
                <span className="integrated-unit-select-label">{label}</span>
                <select
                  value={selectedByLife[life] ?? ''}
                  onChange={(e) => setSelectedByLife((prev) => ({ ...prev, [life]: e.target.value }))}
                  className="btn btn-secondary integrated-unit-select-dropdown"
                >
                  <option value="">선택하세요</option>
                  {INTEGRATED_THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
                {selectedByLife[life] && (
                  <span className="sub">→ {selectedByLife[life]}({life})</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {areas.map((a) => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggle(a.id)}
                />
                <span>{a.name}</span>
              </label>
            ))}
          </div>
        )}
        {areas.length === 0 && (
          <p className="sub">이 과목·학기에 등록된 단원이 없습니다.</p>
        )}
      </section>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={goNext}
          disabled={!canGoNext}
        >
          다음: 등급 단계 선택
        </button>
        <Link href={`/classes/${id}`} className="btn btn-ghost">
          학급으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function UnitsPage() {
  return (
    <Suspense fallback={<div className="loading">로딩 중...</div>}>
      <UnitsContent />
    </Suspense>
  );
}
