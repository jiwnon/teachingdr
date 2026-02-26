'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { getReviewDataAction } from '@/lib/actions/classrooms';
import { useAppStore } from '@/store/app-store';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import { generateComment, generateCommentLines, buildSentenceAssignment } from '@/lib/generator';
import { downloadReviewXlsx } from '@/lib/xlsx-export';
import type { Template } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Rating } from '@/lib/types';
import type { Activity } from '@/lib/types';

export default function ReviewPage() {
  const { data: session, status } = useSession();
  const { classroom, semester, subject, selectedAreaIds, cachedReview, setCachedReview } = useAppStore();
  const sub = subject ?? '국어';
  const sem = semester ?? 1;

  const getGuestStudents = useGuestStore((s) => s.getStudents);
  const getGuestRatings = useGuestStore((s) => s.getRatings);
  const getGuestActivities = useGuestStore((s) => s.getActivities);

  const cacheKey = useMemo(() => {
    if (!classroom) return '';
    const ids = [...selectedAreaIds].sort().join(',');
    return `${classroom.id}:${sem}:${sub}:${ids}`;
  }, [classroom, sem, sub, selectedAreaIds]);

  const matchesCache = useMemo(() => {
    if (!cachedReview || !classroom) return false;
    const cachedIds = [...cachedReview.areaIds].sort().join(',');
    const currentIds = [...selectedAreaIds].sort().join(',');
    return (
      cachedReview.classroomId === classroom.id &&
      cachedReview.semester === sem &&
      cachedReview.subject === sub &&
      cachedIds === currentIds
    );
  }, [cachedReview, classroom, sem, sub, selectedAreaIds]);

  const [students, setStudents] = useState<Student[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>(matchesCache ? cachedReview!.edited : {});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gptTexts, setGptTexts] = useState<Record<string, string>>(matchesCache ? cachedReview!.texts : {});
  const [gptError, setGptError] = useState<string | null>(null);
  const [allowLineBreak, setAllowLineBreak] = useState(true);
  const gptTriggeredRef = useRef(matchesCache);

  useEffect(() => {
    if (status === 'loading') return;

    if (classroom && isGuestId(classroom.id)) {
      setError(null);
      if (!matchesCache) gptTriggeredRef.current = false;
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
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      return;
    }

    if (classroom && session) {
      setError(null);
      if (!matchesCache) gptTriggeredRef.current = false;
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

  /** 평어 최대 줄 수 (초과 시 앞쪽만 사용) */
  const MAX_COMMENT_LINES = 3;
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

  const getAreaLevels = (student: Student) => {
    if (isIntegrated) {
      const list = ratings
        .filter((r) => r.student_id === student.id)
        .map((r) => ({ areaId: r.area_id, level: r.level as '1' | '2' | '3' | '4' }));
      list.sort((a, b) => (lifeOrder[areaIdToLife.get(a.areaId) ?? ''] ?? 0) - (lifeOrder[areaIdToLife.get(b.areaId) ?? ''] ?? 0));
      return list;
    }
    return areasFiltered.map((a) => ({
      areaId: a.id,
      level: (ratingMap[`${student.id}-${a.id}`] ?? '2') as '1' | '2' | '3' | '4',
    }));
  };

  const limitToLines = (text: string) => {
    const lines = text.split('\n').filter(Boolean);
    return lines.slice(0, MAX_COMMENT_LINES).join('\n');
  };

  const getGeneratedText = (student: Student) => {
    const full = generateComment(getAreaLevels(student), templatesForSubject, {
      studentId: student.id,
      sentenceIndexMap: sentenceAssignment.get(student.id) ?? undefined,
    });
    return limitToLines(full);
  };

  const hasAnyActivity = activities.length > 0;

  useEffect(() => {
    if (loading || !hasAnyActivity || students.length === 0 || gptTriggeredRef.current) return;
    gptTriggeredRef.current = true;
    setGptError(null);

    const activitiesByAreaId = new Map<string, string[]>();
    for (const a of activities) {
      if (!a.area_id || !a.description) continue;
      if (!activitiesByAreaId.has(a.area_id)) activitiesByAreaId.set(a.area_id, []);
      activitiesByAreaId.get(a.area_id)!.push(a.description);
    }

    if (activitiesByAreaId.size === 0) {
      return;
    }

    const run = async () => {
      for (const student of students) {
        setGptTexts((prev) => ({ ...prev, [student.id]: '' }));
      }
      let hadError = false;
      let firstErrorMessage: string | null = null;
      for (const student of students) {
        const commentLines = generateCommentLines(getAreaLevels(student), templatesForSubject, {
          studentId: student.id,
          sentenceIndexMap: sentenceAssignment.get(student.id) ?? undefined,
        });
        if (commentLines.length === 0) {
          setGptTexts((prev) => ({ ...prev, [student.id]: '(등급에 해당하는 평어 문장이 없습니다. 단원·등급·시드 데이터를 확인하세요.)' }));
          continue;
        }
        const results: string[] = [];
        for (const line of commentLines) {
          const areaActivities = activitiesByAreaId.get(line.areaId);
          if (!areaActivities || areaActivities.length === 0) {
            results.push(line.sentence);
            continue;
          }
          try {
            const res = await fetch('/api/generate-comment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                templateSentence: line.sentence,
                activities: areaActivities,
                areaId: line.areaId,
                level: line.level,
              }),
            });
            const text = await res.text();
            const data = (() => { try { return JSON.parse(text); } catch { return {}; } })();
            if (!res.ok || data.error) {
              hadError = true;
              const errMsg = typeof data?.error === 'string' ? data.error : (res.status === 500 && text && text.length < 200 ? text : null);
              if (errMsg && !firstErrorMessage) firstErrorMessage = errMsg;
              results.push(line.sentence);
            } else {
              results.push(data.sentence ?? line.sentence);
            }
          } catch (e) {
            hadError = true;
            if (!firstErrorMessage) firstErrorMessage = e instanceof Error ? e.message : '네트워크 오류';
            results.push(line.sentence);
          }
        }
        const joined = results.join('\n');
        const lines = joined.split('\n').filter(Boolean);
        const limited = lines.slice(0, MAX_COMMENT_LINES).join('\n');
        setGptTexts((prev) => ({ ...prev, [student.id]: limited }));
      }
      if (hadError) {
        const friendly =
          firstErrorMessage &&
          /Internal Server Error|500|timeout|ETIMEDOUT/i.test(firstErrorMessage)
            ? 'OpenAI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.'
            : firstErrorMessage;
        const msg = friendly
          ? `학습 활동 반영 실패: ${friendly}`
          : '일부 문장은 학습 활동 반영에 실패했습니다. API 키와 네트워크를 확인해 주세요.';
        setGptError(msg);
      }
    };
    void run();
  }, [loading, hasAnyActivity, students.length, activities]);

  // 평어가 변경될 때마다 캐시에 저장
  useEffect(() => {
    if (!classroom || loading) return;
    const hasTexts = Object.keys(gptTexts).length > 0 || Object.keys(editedTexts).length > 0;
    if (!hasTexts) return;
    setCachedReview({
      classroomId: classroom.id,
      semester: sem,
      subject: sub,
      areaIds: selectedAreaIds,
      texts: gptTexts,
      edited: editedTexts,
    });
  }, [gptTexts, editedTexts]);

  const getRawText = (student: Student) => {
    if (editedTexts[student.id] != null) return editedTexts[student.id];
    if (student.id in gptTexts) {
      const t = gptTexts[student.id];
      return t === '' ? '평어 생성 중...' : limitToLines(t);
    }
    return getGeneratedText(student);
  };

  const getDisplayText = (student: Student) => {
    const raw = getRawText(student);
    if (raw === '평어 생성 중...') return raw;
    if (editingId === student.id) return raw;
    return allowLineBreak ? raw : raw.replace(/\n/g, ' ');
  };

  const getTextForCopy = (student: Student) => {
    const raw = getRawText(student);
    if (raw === '평어 생성 중...') return '';
    return allowLineBreak ? raw : raw.replace(/\n/g, ' ');
  };

  const setDisplayText = (studentId: string, text: string) => {
    setEditedTexts((prev) => ({ ...prev, [studentId]: text }));
  };

  const isGptLoading = students.some((st) => st.id in gptTexts && gptTexts[st.id] === '');

  const handleDownloadXlsx = () => {
    const rows = students.map((st) => {
      const raw = getRawText(st);
      const text = raw === '평어 생성 중...' ? '' : raw;

      let areaNames: string;
      if (isIntegrated) {
        const studentAreaIds = ratings
          .filter((r) => r.student_id === st.id)
          .map((r) => r.area_id);
        areaNames = areas
          .filter((a) => studentAreaIds.includes(a.id))
          .sort((a, b) => (lifeOrder[areaIdToLife.get(a.id) ?? ''] ?? 0) - (lifeOrder[areaIdToLife.get(b.id) ?? ''] ?? 0))
          .map((a) => a.name)
          .join(', ');
      } else {
        areaNames = areasFiltered.map((a) => a.name).join(', ');
      }

      return {
        과목: sub,
        단원: areaNames,
        이름: `${st.number}. ${st.name}`,
        평어: text,
      };
    });

    const classInfo = classroom
      ? `${classroom.school_year ?? ''}년_${classroom.grade}학년${classroom.class_number}반`
      : '';
    const filename = classInfo
      ? `${classInfo}_${sub}_평어.xlsx`
      : `${sub}_평어.xlsx`;

    downloadReviewXlsx(rows, filename);
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <h1>3단계: 평어 생성</h1>
      <p className="sub">생성된 평어를 확인·수정하고 복사할 수 있습니다.</p>
      {activities.some((a) => a.area_id) && (
        <p className="sub" style={{ marginBottom: 12 }}>
          단원에 연결된 학습 활동이 있는 줄만 GPT가 재작성합니다. (단원 미지정 활동은 무시)
        </p>
      )}
      {isGptLoading && (
        <div className="alert" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          평어 생성 중... (활동 반영)
        </div>
      )}
      {gptError && (
        <div className="alert alert-error" style={{ marginTop: 8 }}>
          {gptError}
        </div>
      )}
      <div className="review-toolbar">
        <label className="review-linebreak-option">
          <input
            type="checkbox"
            checked={allowLineBreak}
            onChange={(e) => setAllowLineBreak(e.target.checked)}
          />
          <span>줄바꿈 허용 (해제 시 한 줄로 붙여서 보기·복사 — 성적서 붙여넣기용)</span>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDownloadXlsx}
          disabled={isGptLoading || students.length === 0}
        >
          엑셀 다운로드
        </button>
      </div>
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
                    const t = getTextForCopy(st);
                    if (t) void navigator.clipboard.writeText(t);
                  }}
                  disabled={getRawText(st) === '평어 생성 중...'}
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
      <div className="action-buttons" style={{ justifyContent: 'space-between' }}>
        {classroom ? (
          <Link href={`/classes/${classroom.id}/ratings?sem=${sem}&subject=${sub}`} className="btn btn-secondary">
            ← 등급 입력
          </Link>
        ) : (
          <Link href="/" className="btn btn-secondary">
            ← 처음으로
          </Link>
        )}
      </div>
    </div>
  );
}
