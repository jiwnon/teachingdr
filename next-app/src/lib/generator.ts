/**
 * 평어 생성 로직 (deterministic, 순수 함수)
 * - Math.random() / LLM 미사용. 템플릿 테이블에서만 문장 선택.
 * - seed = hash(studentId + areaId + level) + regenerateCount
 * - index = seed % templates.length → 해당 템플릿 반환
 */
import type { Template } from '@/lib/types';

/** deterministic string hash (signed 32-bit). side-effect 없음. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * (area_id, level)에 해당하는 템플릿 목록에서 deterministic 하게 하나 선택
 * @param templates - unit(areaId) + level 로 이미 필터된 템플릿 배열
 * @param studentId - 학생 식별자
 * @param areaId - 영역(단원) 식별자 (현재 스키마에서는 unit 사용)
 * @param level - 등급 (상/중/하)
 * @param regenerateCount - 재생성 시 seed에 더할 값 (기본 0)
 * @returns 선택된 템플릿의 sentence, 없으면 null
 */
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

export type GenerateCommentOptions = {
  studentId: string | number;
  regenerateCount?: number;
};

/**
 * 학생별 단원·등급 목록과 전체 템플릿으로 평어 문장 조합 (순수 함수)
 * @param unitLevels - 해당 학생의 단원별 등급 [{ unit, level }, ...]
 * @param templates - 해당 과목의 전체 템플릿 (DB 조회 결과)
 * @param options - studentId, regenerateCount(선택)
 * @returns 조합된 평어 전체 텍스트
 */
export function generateComment(
  unitLevels: Array<{ unit: string; level: string }>,
  templates: Template[],
  options: GenerateCommentOptions
): string {
  const { studentId, regenerateCount = 0 } = options;
  const lines: string[] = [];

  for (const { unit, level } of unitLevels) {
    const filtered = templates.filter(
      (t) => t.unit === unit && t.level === level
    );
    const sentence = pickSentence(
      filtered,
      studentId,
      unit,
      level,
      regenerateCount
    );
    if (sentence) lines.push(sentence);
  }

  return lines.join('\n');
}
