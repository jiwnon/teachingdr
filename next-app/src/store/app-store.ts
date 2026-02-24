/**
 * 앱 상태 (Zustand) - 학급·학기·과목·단원·레벨단계 선택
 */
import { create } from 'zustand';
import type { Level } from '@/lib/types';
import type { LevelStep } from '@/lib/types';
import type { Classroom } from '@/lib/types';
import type { SubjectCode } from '@/lib/types';
import type { Semester } from '@/lib/types';

type CachedReview = {
  classroomId: string;
  semester: number;
  subject: string;
  areaIds: string[];
  /** studentId -> 최종 평어 텍스트 */
  texts: Record<string, string>;
  /** studentId -> 사용자가 수정한 텍스트 */
  edited: Record<string, string>;
};

type AppState = {
  /** 현재 선택한 학급 (학급 흐름에서 사용) */
  classroom: Classroom | null;
  /** 1학기 | 2학기 */
  semester: Semester | null;
  /** 과목: 국어/수학/바생/슬생/즐생 */
  subject: SubjectCode | null;
  /** 선택한 단원 area id 목록 (세션만, DB 미저장) */
  selectedAreaIds: string[];
  /** 평어 레벨 단계: 2 / 3 / 4 (세션만, DB 미저장) */
  levelStep: LevelStep | null;
  studentNames: string[];
  grades: Record<string, Level>;
  /** 평어 생성 결과 캐시 (뒤로갔다 돌아와도 유지) */
  cachedReview: CachedReview | null;
  setClassroom: (classroom: Classroom | null) => void;
  setSemester: (semester: Semester | null) => void;
  setSubject: (subject: SubjectCode | null) => void;
  setSelectedAreaIds: (ids: string[]) => void;
  setLevelStep: (step: LevelStep | null) => void;
  setStudentNames: (names: string[]) => void;
  setGrade: (studentId: number, unit: string, level: Level) => void;
  setCachedReview: (cache: CachedReview | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  classroom: null,
  semester: null,
  subject: null,
  selectedAreaIds: [],
  levelStep: null,
  studentNames: [],
  grades: {},
  cachedReview: null,
  setClassroom: (classroom) => set({ classroom }),
  setSemester: (semester) => set({ semester }),
  setSubject: (subject) => set({ subject }),
  setSelectedAreaIds: (selectedAreaIds) => set({ selectedAreaIds }),
  setLevelStep: (levelStep) => set({ levelStep }),
  setStudentNames: (studentNames) => set({ studentNames }),
  setGrade: (studentId, unit, level) =>
    set((state) => ({
      grades: {
        ...state.grades,
        [`${studentId}-${unit}`]: level,
      },
    })),
  setCachedReview: (cachedReview) => set({ cachedReview }),
}));
