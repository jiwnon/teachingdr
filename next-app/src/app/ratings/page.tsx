'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
import type { Level } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';

export default function RatingsPage() {
  const { subject, setSubject } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ratings, setRatings] = useState<Record<string, Level>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sub = subject ?? '국어';
  const sem = 1; // 기존 단일 페이지는 1학기 기준 (학급 흐름에서는 /classes/[id]/ratings 사용)

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
      setLoading(false);
      return;
    }
    setError(null);
    const supabase = createClient();
    Promise.all([
      supabase.from('students').select('id, number, name').order('number'),
      supabase.from('areas').select('id, subject, name, order_index, semester').eq('subject', sub).eq('semester', sem).order('order_index'),
      supabase.from('ratings').select('student_id, area_id, level'),
    ])
      .then(([s, a, r]) => {
        if (s.error) setError(s.error.message);
        else if (a.error) setError(a.error.message);
        else if (r.error) setError(r.error.message);
        else {
          setStudents((s.data ?? []) as Student[]);
          setAreas((a.data ?? []) as Area[]);
          const map: Record<string, Level> = {};
          for (const x of r.data ?? []) {
            map[`${x.student_id}-${x.area_id}`] = x.level as Level;
          }
          setRatings(map);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? '로드 실패');
        setLoading(false);
      });
  }, [sub]);

  const setRating = async (studentId: string, areaId: string, level: Level | '') => {
    setRatings((prev: Record<string, Level>) => {
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

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <h1>2단계: 과목·등급 입력</h1>
      <p className="sub">
        과목을 선택한 뒤, 학생별·단원별로 매우잘함/잘함/보통/노력요함을 선택하세요. (변경 시 자동 저장)
      </p>

      <section className="subject-section">
        <label htmlFor="subject-select">과목</label>
        <select
          id="subject-select"
          className="input input-subject"
          value={sub}
          onChange={(e) => setSubject(e.target.value as SubjectCode)}
        >
          <option value="국어">국어</option>
          <option value="수학">수학</option>
          <option value="바생">바른생활</option>
          <option value="슬생">슬기로운생활</option>
          <option value="즐생">즐거운생활</option>
        </select>
      </section>

      <section className="ratings-section">
        <h2 className="section-title">등급 입력</h2>
        {students.length === 0 ? (
          <div className="alert alert-error">
            학생이 없습니다. <Link href="/students">학생 명단</Link>에서 먼저 입력하세요.
          </div>
        ) : (
          <>
            <div className="table-wrap ratings-table">
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>이름</th>
                    {areas.length > 0
                      ? areas.map((a) => <th key={a.id}>{a.name}</th>)
                      : <th>등급</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.id}>
                      <td>{st.number}</td>
                      <td>{st.name}</td>
                      {areas.length > 0 ? (
                        areas.map((a) => (
                          <td key={a.id}>
                            <select
                              className="input input-level"
                              value={ratings[`${st.id}-${a.id}`] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setRating(st.id, a.id, v === '' ? '' : (v as Level));
                              }}
                            >
                              <option value="">선택</option>
                              <option value="1">매우잘함</option>
                              <option value="2">잘함</option>
                              <option value="3">보통</option>
                              <option value="4">노력요함</option>
                            </select>
                          </td>
                        ))
                      ) : (
                        <td>
                          <select
                            className="input input-level"
                            value={ratings[`${st.id}-default`] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRatings((prev) => {
                                const next = { ...prev };
                                if (v === '') delete next[`${st.id}-default`];
                                else next[`${st.id}-default`] = v as Level;
                                return next;
                              });
                            }}
                          >
                            <option value="">선택</option>
                            <option value="1">매우잘함</option>
                            <option value="2">잘함</option>
                            <option value="3">보통</option>
                            <option value="4">노력요함</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {areas.length === 0 && (
              <p className="sub" style={{ marginTop: 8 }}>
                Supabase의 areas 테이블에 단원을 넣으면 단원별로 등급을 저장할 수 있습니다.
              </p>
            )}
            <Link href="/review" className="btn btn-primary">3단계: 평어 생성 →</Link>
          </>
        )}
      </section>
    </div>
  );
}
