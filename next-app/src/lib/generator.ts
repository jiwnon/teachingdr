/**
 * 평어 생성
 * - 학급 단위 배정 시: 같은 (area_id, level)이면 학생마다 서로 다른 문장 배정 (랜덤, 중복 방지, 부족 시 순환)
 * - 그 외: deterministic (pickSentence, hash 기반)
 */
import type { Template } from '@/lib/types';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Fisher–Yates shuffle (mutates array) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickSentence(
  templates: Template[],
  studentId: string | number,
  areaId: string,
  level: string,
  regenerateCount: number = 0
): string | null {
  if (templates.length === 0) return null;
  const seed =
    hash([String(studentId), areaId, level].join('.')) + regenerateCount;
  const index = ((seed % templates.length) + templates.length) % templates.length;
  return templates[index]?.sentence ?? null;
}

/**
 * 학급 내 (area_id, level)별로 문장 인덱스를 배정.
 * 같은 단원·같은 레벨인 학생들끼리는 서로 다른 문장(인덱스) 배정, 문장 수 부족 시 순환.
 * 반환: studentId -> ( `${areaId}:${level}` -> template index )
 */
export function buildSentenceAssignment(
  students: Array<{ id: string; number: number }>,
  ratings: Array<{ student_id: string; area_id: string; level: string }>,
  templates: Template[],
  areaIds: Set<string>
): Map<string, Map<string, number>> {
  const assignment = new Map<string, Map<string, number>>();
  const studentOrder = new Map(students.map((s) => [s.id, s.number]));

  const areaLevels = new Map<string, string[]>();
  for (const r of ratings) {
    if (!areaIds.has(r.area_id)) continue;
    const key = `${r.area_id}:${r.level}`;
    if (!areaLevels.has(key)) areaLevels.set(key, []);
    if (!areaLevels.get(key)!.includes(r.student_id)) {
      areaLevels.get(key)!.push(r.student_id);
    }
  }

  for (const [key, studentIds] of areaLevels) {
    const colonAt = key.indexOf(':');
    const areaId = key.slice(0, colonAt);
    const level = key.slice(colonAt + 1);
    const filtered = templates.filter(
      (t) => t.area_id === areaId && t.level === level
    );
    if (filtered.length === 0) continue;

    const sortedIds = [...studentIds].sort(
      (a, b) => (studentOrder.get(a) ?? 0) - (studentOrder.get(b) ?? 0)
    );
    const indices = shuffle(
      filtered.map((_, i) => i)
    );
    const M = indices.length;
    sortedIds.forEach((studentId, i) => {
      if (!assignment.has(studentId)) assignment.set(studentId, new Map());
      assignment.get(studentId)!.set(key, indices[i % M]);
    });
  }

  return assignment;
}

export type GenerateCommentOptions = {
  studentId: string | number;
  regenerateCount?: number;
  /** 학급 단위 배정 시: (areaId:level) -> template index (buildSentenceAssignment 결과의 한 학생분) */
  sentenceIndexMap?: Map<string, number>;
};

/**
 * 단원별로 { areaId, level, sentence } 배열을 반환.
 * GPT 호출 시 어느 단원/등급의 문장인지 알 수 있어 단원별 활동 필터링·예시 조회가 가능.
 */
export function generateCommentLines(
  areaLevels: Array<{ areaId: string; level: string }>,
  templates: Template[],
  options: GenerateCommentOptions
): Array<{ areaId: string; level: string; sentence: string }> {
  const { studentId, regenerateCount = 0, sentenceIndexMap } = options;
  const result: Array<{ areaId: string; level: string; sentence: string }> = [];
  for (const { areaId, level } of areaLevels) {
    const filtered = templates.filter(
      (t) => t.area_id === areaId && t.level === level
    );
    let sentence: string | null = null;
    if (sentenceIndexMap && filtered.length > 0) {
      const index = sentenceIndexMap.get(`${areaId}:${level}`);
      if (index != null && filtered[index] != null) {
        sentence = filtered[index].sentence;
      }
    }
    if (sentence == null) {
      sentence = pickSentence(
        filtered,
        studentId,
        areaId,
        level,
        regenerateCount
      );
    }
    if (sentence) result.push({ areaId, level, sentence });
  }
  return result;
}

export function generateComment(
  areaLevels: Array<{ areaId: string; level: string }>,
  templates: Template[],
  options: GenerateCommentOptions
): string {
  return generateCommentLines(areaLevels, templates, options)
    .map((l) => l.sentence)
    .join('\n');
}
