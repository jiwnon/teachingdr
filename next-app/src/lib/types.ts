/**
 * 초등 평어 도우미 - 공통 타입 정의
 * MVP: 1학년 1학기 국어·수학. DB는 templates만 사용.
 */

/** 등급: 상/중/하 */
export type Level = '상' | '중' | '하';

/** 단원별·등급별 평어 문장 템플릿 (DB templates) */
export interface Template {
  id: number;
  grade: number;
  semester: number;
  subject: string;
  unit: string;
  level: Level;
  sentence: string;
  created_at?: string;
}

/** MVP: 1학년 1학기 과목 */
export type SubjectCode = '국어' | '수학';

/** 1학년 1학기 과목 목록 */
export const SUBJECTS: SubjectCode[] = ['국어', '수학'];
