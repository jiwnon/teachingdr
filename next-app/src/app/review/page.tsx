'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useAppStore } from '@/store/app-store';
import { generateComment } from '@/lib/generator';
import type { Template } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Rating } from '@/lib/types';

export default function ReviewPage() {
  const { subject } = useAppStore();
  const sub = subject ?? '국어';
  const [students, setStudents] = useState<Student[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      supabase.from('areas').select('id, subject, name, order_index').eq('subject', sub).order('order_index'),
      supabase.from('ratings').select('student_id, area_id, level'),
      supabase.from('templates').select('id, area_id, level, sentence'),
    ])
      .then(([s, a, r, t]) => {
        if (s.error) setError(s.error.message);
        else if (a.error) setError(a.error.message);
        else if (r.error) setError(r.error.message);
        else if (t.error) setError(t.error.message);
        else {
          setStudents((s.data ?? []) as Student[]);
          setAreas((a.data ?? []) as Area[]);
          setRatings((r.data ?? []) as Rating[]);
          setTemplates((t.data ?? []) as Template[]);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? '로드 실패');
        setLoading(false);
      });
  }, [sub]);

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

  const getDisplayText = (student: Student) =>
    editedTexts[student.id] ?? getGeneratedText(student);

  const setDisplayText = (studentId: string, text: string) => {
    setEditedTexts((prev) => ({ ...prev, [studentId]: text }));
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <h1>3단계: 평어 생성</h1>
      <p className="sub">생성된 평어를 확인·수정하고 복사할 수 있습니다.</p>
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
                    if (t) void navigator.clipboard.writeText(t);
                  }}
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
