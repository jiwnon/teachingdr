/**
 * 프로젝트/학생/등급/결과 상태 (Zustand)
 * 뼈대만 구성. create/store/slice 연동 예정.
 */
import { create } from 'zustand';

type ProjectState = {
  projectId: number | null;
  subject: string | null;
  studentNames: string[];
  setProjectId: (id: number | null) => void;
  setSubject: (subject: string | null) => void;
  setStudentNames: (names: string[]) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  subject: null,
  studentNames: [],
  setProjectId: (id) => set({ projectId: id }),
  setSubject: (subject) => set({ subject }),
  setStudentNames: (studentNames) => set({ studentNames }),
}));
