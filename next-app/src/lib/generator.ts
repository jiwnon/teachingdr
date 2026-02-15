/**
 * 평어 생성 로직
 * 템플릿(단원·등급별 문장) + 학생별 등급 → 문장 조합
 * 뼈대만 구성. Supabase templates 조회 및 조합 로직 구현 예정.
 */
import type { Template } from '@/lib/types';

/**
 * 학생별 단원·등급 맵과 템플릿 목록으로 평어 문장 생성
 * @param unitLevels - [{ unit, level }, ...] (해당 학생의 단원별 등급)
 * @param templates - 해당 과목의 단원·등급별 템플릿
 * @returns 조합된 평어 전체 텍스트
 */
export function generateComment(
  unitLevels: Array<{ unit: string; level: string }>,
  templates: Template[]
): string {
  const lines: string[] = [];
  for (const { unit, level } of unitLevels) {
    const t = templates.find(
      (x) => x.unit === unit && x.level === level
    );
    if (t) lines.push(t.sentence);
  }
  return lines.join('\n');
}
