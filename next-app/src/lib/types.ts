/**
 * ReportMate MVP - DB 스키마 타입
 * level: 1/2/3/4 (매우잘함/잘함/보통/노력요함)
 */

export type Level = '1' | '2' | '3' | '4';

/** 1학기 | 2학기 */
export type Semester = 1 | 2;

/** 과목: 국어, 수학, 통합(바생/슬생/즐생) */
export type SubjectCode = '국어' | '수학' | '바생' | '슬생' | '즐생';

/** 통합 과목 선택지 (바른생활, 슬기로운생활, 즐거운생활) */
export const INTEGRATED_SUBJECTS: SubjectCode[] = ['바생', '슬생', '즐생'];

/** 기본 과목 선택지 (국어, 수학, 통합은 UI에서 바생/슬생/즐생으로 세분) */
export const MAIN_SUBJECTS: ('국어' | '수학' | '통합')[] = ['국어', '수학', '통합'];

export const SUBJECT_LABELS: Record<SubjectCode, string> = {
  국어: '국어',
  수학: '수학',
  바생: '바른생활',
  슬생: '슬기로운생활',
  즐생: '즐거운생활',
};

export interface Classroom {
  id: string;
  grade: number;
  class_number: number;
  name: string;
}

export interface Area {
  id: string;
  subject: string;
  name: string;
  order_index: number;
  semester?: number;
}

export interface Template {
  id: string;
  area_id: string;
  level: Level;
  sentence: string;
}

export interface Student {
  id: string;
  number: number;
  name: string;
  classroom_id?: string | null;
}

export interface Rating {
  student_id: string;
  area_id: string;
  level: Level;
}

/** 활동 메모: GPT-4 평어 재작성 시 참고 (classroom_id, semester, subject 범위) */
export interface Activity {
  id: string;
  classroom_id: string;
  semester: Semester;
  subject: string | null;
  description: string;
  created_at?: string;
}

export const SUBJECTS: SubjectCode[] = ['국어', '수학', ...INTEGRATED_SUBJECTS];
