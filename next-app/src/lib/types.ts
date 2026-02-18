/**
 * ReportMate MVP - DB 스키마 타입
 * level: 1/2/3/4 (매우잘함/잘함/보통/노력요함)
 */

export type Level = '1' | '2' | '3' | '4';

export interface Area {
  id: string;
  subject: string;
  name: string;
  order_index: number;
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
}

export interface Rating {
  student_id: string;
  area_id: string;
  level: Level;
}

export type SubjectCode = '국어' | '수학';
export const SUBJECTS: SubjectCode[] = ['국어', '수학'];
