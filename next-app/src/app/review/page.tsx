'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
import { generateComment } from '@/lib/generator';
import type { Template } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Rating } from '@/lib/types';
import type { Activity } from '@/lib/types';

export default function ReviewPage() {
  const { classroom, semester, subject } = useAppStore();
  const sub = subject ?? '국어';
  const sem = semester ?? 1;

  const [students, setStudents] = useState<Student[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gptTexts, setGptTexts] = useState<Record<string, string>>({});
  const gptTriggeredRef = useRef(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
      setLoading(false);
      return;
    }
    setError(null);
    gptTriggeredRef.current = false;
    const supabase = createClient();

    const studentsQuery = classroom
      ? supabase.from('students').select('id, number, name').eq('classroom_id', classroom.id).order('number')
      : supabase.from('students').select('id, number, name').order('number');

    const areasQuery = supabase
      .from('areas')
      .select('id, subject, name, order_index, semester')
      .eq('subject', sub)
      .eq('semester', sem)
      .order('order_index');

    const activitiesQuery =
      classroom
        ? supabase
            .from('activities')
            .select('id, description')
            .eq('classroom_id', classroom.id)
            .eq('semester', sem)
            .eq('subject', sub)
        : Promise.resolve({ data: [] as Activity[], error: null });

    Promise.all([
      studentsQuery,
      areasQuery,
      supabase.from('ratings').select('student_id, area_id, level'),
      supabase.from('templates').select('id, area_id, level, sentence'),
      activitiesQuery,
    ])
      .then(([s, a, r, t, act]) => {
        if (s.error) setError(s.error.message);
        else if (a.error) setError(a.error.message);
        else if (r.error) setError(r.error.message);
        else if (t.error) setError(t.error.message);
        else if ((act as { error?: { message: string } }).error) setError((act as { error: { message: string } }).error.message);
        else {
          setStudents((s.data ?? []) as Student[]);
          setAreas((a.data ?? []) as Area[]);
          setRatings((r.data ?? []) as Rating[]);
          setTemplates((t.data ?? []) as Template[]);
          setActivities(((act as { data?: Activity[] }).data ?? []) as Activity[]);
          setGptTexts({});
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? '로드 실패');
        setLoading(false);
      });
  }, [sub, sem, classroom?.id]);

  const areaIds = new Set(areas.map((x) => x.id));
  const templatesForSubject = templates.filter((t) => areaIds.has(t.area_id));
  const ratingMap: Record<string, string> = {};
  for (const r of ratings) {
    ratingMap[`${r.student_id}-${r.area_id}`] = r.level;
  }

  const getGeneratedText = (student: Student) => {
    const areaLevels = areas.map((a) => ({
      areaId: a.id,
      level: ratingMap[`${student.id}-${a.id}`] ?? '2',
    }));
    return generateComment(areaLevels, templatesForSubject, {
      studentId: student.id,
    });
  };

  const activityDescriptions = activities.map((a) => a.description);

  useEffect(() => {
    if (loading || activities.length === 0 || students.length === 0 || gptTriggeredRef.current) return;
    gptTriggeredRef.current = true;

    const run = async () => {
      for (const student of students) {
        setGptTexts((prev) => ({ ...prev, [student.id]: '' }));
      }
      for (const student of students) {
        const baseText = getGeneratedText(student);
        const lines = baseText.split('\n').filter(Boolean);
        const results: string[] = [];
        for (const line of lines) {
          try {
            const res = await fetch('/api/generate-comment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                templateSentence: line,
                activities: activityDescriptions,
              }),
            });
            const data = await res.json();
            if (data.error) results.push(line);
            else results.push(data.sentence ?? line);
          } catch {
            results.push(line);
          }
        }
        setGptTexts((prev) => ({ ...prev, [student.id]: results.join('\n') }));
      }
    };
    void run();
  }, [loading, activities.length, students.length, activityDescriptions.join('\n')]);

  const getDisplayText = (student: Student) => {
    if (editedTexts[student.id] != null) return editedTexts[student.id];
    if (activities.length > 0 && student.id in gptTexts) {
      const t = gptTexts[student.id];
      return t === '' ? '평어 생성 중...' : t;
    }
    return getGeneratedText(student);
  };

  const setDisplayText = (studentId: string, text: string) => {
    setEditedTexts((prev) => ({ ...prev, [studentId]: text }));
  };

  const isGptLoading = activities.length > 0 && students.some((st) => gptTexts[st.id] === '');

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <h1>3단계: 평어 생성</h1>
      <p className="sub">생성된 평어를 확인·수정하고 복사할 수 있습니다.</p>
      {activities.length > 0 && (
        <p className="sub" style={{ marginBottom: 12 }}>
          이번 학기 학습 활동이 반영된 문장으로 GPT가 재작성합니다.
        </p>
      )}
      {isGptLoading && (
        <div className="alert" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          평어 생성 중... (활동 반영)
        </div>
      )}
      {students.length === 0 ? (
        <div className="alert alert-error">학생이 없습니다. 학생 명단과 등급을 먼저 입력하세요.</div>
      ) : (
        students.map((st) => (
          <div key={st.id} className="review-item">
            <div className="review-item-header">
              <span className="review-item-title">{st.number}. {st.name}</span>
              <div className="review-item-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setEditingId((id) => (id === st.id ? null : st.id))
                  }
                >
                  {editingId === st.id ? '수정 완료' : '수정'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const t = getDisplayText(st);
                    if (t && t !== '평어 생성 중...') void navigator.clipboard.writeText(t);
                  }}
                  disabled={getDisplayText(st) === '평어 생성 중...'}
                >
                  복사
                </button>
              </div>
            </div>
            <textarea
              readOnly={editingId !== st.id}
              rows={6}
              value={getDisplayText(st)}
              onChange={(e) => setDisplayText(st.id, e.target.value)}
              className={editingId === st.id ? 'review-textarea-editing' : ''}
            />
          </div>
        ))
      )}
      <Link href="/" className="btn btn-ghost">← 처음으로</Link>
    </div>
  );
}
