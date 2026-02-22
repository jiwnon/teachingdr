'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { getReviewDataAction } from '@/lib/actions/classrooms';
import { useAppStore } from '@/store/app-store';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import { generateComment, buildSentenceAssignment } from '@/lib/generator';
import type { Template } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Rating } from '@/lib/types';
import type { Activity } from '@/lib/types';

export default function ReviewPage() {
  const { data: session, status } = useSession();
  const { classroom, semester, subject, selectedAreaIds } = useAppStore();
  const sub = subject ?? '국어';
  const sem = semester ?? 1;

  const getGuestStudents = useGuestStore((s) => s.getStudents);
  const getGuestRatings = useGuestStore((s) => s.getRatings);
  const getGuestActivities = useGuestStore((s) => s.getActivities);

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
    if (status === 'loading') return;

    if (classroom && isGuestId(classroom.id)) {
      setError(null);
      gptTriggeredRef.current = false;
      setStudents(getGuestStudents(classroom.id));
      const ratingMap = getGuestRatings();
      setRatings(
        Object.entries(ratingMap).map(([key, level]) => {
          const [student_id, area_id] = key.split('::');
          return { student_id, area_id, level };
        })
      );
      setActivities(
        getGuestActivities(classroom.id, sem, sub).map((a) => ({
          ...a,
          classroom_id: classroom.id,
          semester: sem,
          subject: sub,
        })) as Activity[]
      );
      if (hasSupabaseEnv()) {
        const supabase = createClient();
        Promise.all([
          supabase.from('areas').select('id, subject, name, order_index, semester').eq('subject', sub).eq('semester', sem).order('order_index'),
          supabase.from('templates').select('id, area_id, level, sentence'),
        ]).then(([aRes, tRes]) => {
          setAreas((aRes.data ?? []) as Area[]);
          setTemplates((tRes.data ?? []) as Template[]);
        });
      }
      setLoading(false);
      return;
    }

    if (classroom && session) {
      setError(null);
      gptTriggeredRef.current = false;
      getReviewDataAction(classroom.id, sem, sub)
        .then((data) => {
          if (data) {
            setStudents(data.students);
            setAreas(data.areas);
            setRatings(data.ratings);
            setTemplates(data.templates);
            setActivities(data.activities);
          } else setError('권한이 없거나 데이터를 불러올 수 없습니다.');
        })
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
      return;
    }

    setError('학급을 먼저 선택하세요. 학급 목록에서 학급 → 학기 → 과목 → 등급 입력 후 평어를 생성할 수 있습니다.');
    setLoading(false);
  }, [sub, sem, classroom?.id, session, status, getGuestStudents, getGuestRatings, getGuestActivities]);

  const isIntegrated = sub === '통합';
  const areaIds = useMemo(() => {
    if (isIntegrated) return new Set(ratings.map((r) => r.area_id));
    const filtered =
      selectedAreaIds.length > 0 ? areas.filter((a) => selectedAreaIds.includes(a.id)) : areas;
    return new Set(filtered.map((x) => x.id));
  }, [isIntegrated, ratings, selectedAreaIds, areas]);
  const areasFiltered = areas.filter((a) => areaIds.has(a.id));
  const templatesForSubject = templates.filter((t) => areaIds.has(t.area_id));
  const ratingMap: Record<string, string> = {};
  for (const r of ratings) {
    ratingMap[`${r.student_id}-${r.area_id}`] = r.level;
  }

  const lifeOrder: Record<string, number> = { 바른생활: 0, 슬기로운생활: 1, 즐거운생활: 2 };
  const areaIdToLife = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of areas) {
      const match = a.name.match(/^(.+)\((.+)\)$/);
      if (match) m.set(a.id, match[2]);
    }
    return m;
  }, [areas]);

  const sentenceAssignment = useMemo(() => {
    const ids = areaIds;
    const templatesFiltered = templates.filter((t) => ids.has(t.area_id));
    if (students.length === 0 || templatesFiltered.length === 0) return new Map<string, Map<string, number>>();
    const ratingsArray = ratings.map((r) => ({
      student_id: r.student_id,
      area_id: r.area_id,
      level: r.level,
    }));
    return buildSentenceAssignment(students, ratingsArray, templatesFiltered, ids);
  }, [students, ratings, templates, areaIds]);

  const getGeneratedText = (student: Student) => {
    const areaLevels = isIntegrated
      ? (() => {
          const list = ratings
            .filter((r) => r.student_id === student.id)
            .map((r) => ({ areaId: r.area_id, level: r.level as '1' | '2' | '3' | '4' }));
          list.sort((a, b) => (lifeOrder[areaIdToLife.get(a.areaId) ?? ''] ?? 0) - (lifeOrder[areaIdToLife.get(b.areaId) ?? ''] ?? 0));
          return list;
        })()
      : areasFiltered.map((a) => ({
          areaId: a.id,
          level: (ratingMap[`${student.id}-${a.id}`] ?? '2') as '1' | '2' | '3' | '4',
        }));
    return generateComment(areaLevels, templatesForSubject, {
      studentId: student.id,
      sentenceIndexMap: sentenceAssignment.get(student.id) ?? undefined,
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
