/**
 * 앱 상태 (Zustand) - 학급·학기·과목 선택
 */
import { create } from 'zustand';
import type { Level } from '@/lib/types';
import type { Classroom } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';
import type { Semester } from '@/lib/types';

type AppState = {
  /** 현재 선택한 학급 (학급 흐름에서 사용) */
  classroom: Classroom | null;
  /** 1학기 | 2학기 */
  semester: Semester | null;
  /** 과목: 국어/수학/바생/슬생/즐생 */
  subject: SubjectCode | null;
  studentNames: string[];
  grades: Record<string, Level>;
  setClassroom: (classroom: Classroom | null) => void;
  setSemester: (semester: Semester | null) => void;
  setSubject: (subject: SubjectCode | null) => void;
  setStudentNames: (names: string[]) => void;
  setGrade: (studentId: number, unit: string, level: Level) => void;
};

export const useAppStore = create<AppState>((set) => ({
  classroom: null,
  semester: null,
  subject: null,
  studentNames: [],
  grades: {},
  setClassroom: (classroom) => set({ classroom }),
  setSemester: (semester) => set({ semester }),
  setSubject: (subject) => set({ subject }),
  setStudentNames: (studentNames) => set({ studentNames }),
  setGrade: (studentId, unit, level) =>
    set((state) => ({
      grades: {
        ...state.grades,
        [`${studentId}-${unit}`]: level,
      },
    })),
}));
