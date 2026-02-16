/**
 * 앱 상태 (Zustand) - 엑셀 대체 도구, 단일 세션
 * 프로젝트/멀티테넌트 없음.
 */
import { create } from 'zustand';
import type { Level } from '@/lib/types';

type AppState = {
  subject: string | null;
  studentNames: string[];
  /** key: `${studentId}-${unit}`, value: 상/중/하 */
  grades: Record<string, Level>;
  setSubject: (subject: string | null) => void;
  setStudentNames: (names: string[]) => void;
  setGrade: (studentId: number, unit: string, level: Level) => void;
};

export const useAppStore = create<AppState>((set) => ({
  subject: null,
  studentNames: [],
  grades: {},
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
