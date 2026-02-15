/**
 * 초등 평어 도우미 - 공통 타입 정의
 * DB 스키마와 1:1 대응 (templates, projects, students, grades, results)
 */

/** 등급: 상/중/하 */
export type Level = '상' | '중' | '하';

/** 단원별·등급별 평어 문장 템플릿 */
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

/** 평어 작성 프로젝트 (학년/학기/과목) */
export interface Project {
  id: number;
  teacher_name: string | null;
  grade: number;
  semester: number;
  subject: string;
  created_at?: string;
}

/** 프로젝트별 학생 */
export interface Student {
  id: number;
  project_id: number;
  name: string;
  order: number;
}

/** 학생별 단원별 등급 */
export interface Grade {
  id: number;
  student_id: number;
  unit: string;
  level: Level;
}

/** 학생별 생성된 평어 */
export interface Result {
  id: number;
  student_id: number;
  generated_text: string;
  created_at?: string;
}

/** MVP 과목 코드 */
export type SubjectCode = '국어-가' | '국어-나' | '수학' | '통합';

/** MVP: 1학년 2학기 과목 목록 */
export const SUBJECTS: SubjectCode[] = ['국어-가', '국어-나', '수학', '통합'];
