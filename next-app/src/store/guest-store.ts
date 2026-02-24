/**
 * 비로그인 사용자용 임시 데이터 (저장되지 않음, 메모리만)
 * - 학급·학생·등급·활동은 세션 동안만 유지
 */
import { create } from 'zustand';
import type { Classroom } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Level } from '@/lib/types';
import type { Activity } from '@/lib/types';

const GUEST_PREFIX = 'guest-';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isGuestId(id: string): boolean {
  return id.startsWith(GUEST_PREFIX);
}

export function newGuestId(): string {
  return GUEST_PREFIX + uuid();
}

type GuestStudent = Student & { id: string };

type GuestState = {
  classrooms: Classroom[];
  /** classroomId -> students */
  studentsByClass: Record<string, GuestStudent[]>;
  /** "studentId-areaId" -> level */
  ratings: Record<string, Level>;
  /** classroomId -> activities */
  activitiesByClass: Record<string, Array<{ id: string; semester: number; subject: string | null; description: string; area_id?: string | null }>>;
  addClassroom: (c: Omit<Classroom, 'id'>) => Classroom;
  getClassroom: (id: string) => Classroom | null;
  setStudents: (classroomId: string, students: GuestStudent[]) => void;
  getStudents: (classroomId: string) => GuestStudent[];
  setRating: (key: string, level: Level | null) => void;
  getRatings: () => Record<string, Level>;
  addActivity: (classroomId: string, semester: number, subject: string | null, description: string, areaId?: string | null) => void;
  getActivities: (classroomId: string, semester: number, subject: string) => Array<{ id: string; description: string; area_id?: string | null }>;
  deleteActivity: (classroomId: string, activityId: string) => void;
  clear: () => void;
};

export const useGuestStore = create<GuestState>((set, get) => ({
  classrooms: [],
  studentsByClass: {},
  ratings: {},
  activitiesByClass: {},

  addClassroom: (c) => {
    const id = newGuestId();
    const classroom: Classroom = { ...c, id };
    set((s) => ({ classrooms: [...s.classrooms, classroom] }));
    return classroom;
  },

  getClassroom: (id) => {
    if (!isGuestId(id)) return null;
    return get().classrooms.find((c) => c.id === id) ?? null;
  },

  setStudents: (classroomId, students) => {
    set((s) => ({
      studentsByClass: { ...s.studentsByClass, [classroomId]: students },
    }));
  },

  getStudents: (classroomId) => {
    return get().studentsByClass[classroomId] ?? [];
  },

  setRating: (key, level) => {
    set((s) => {
      const next = { ...s.ratings };
      if (level === null) delete next[key];
      else next[key] = level;
      return { ratings: next };
    });
  },

  getRatings: () => get().ratings,

  addActivity: (classroomId, semester, subject, description, areaId) => {
    const id = GUEST_PREFIX + 'act-' + uuid();
    set((s) => {
      const list = s.activitiesByClass[classroomId] ?? [];
      const next = { ...s.activitiesByClass, [classroomId]: [...list, { id, semester, subject, description, area_id: areaId ?? null }] };
      return { activitiesByClass: next };
    });
  },

  getActivities: (classroomId, semester, subject) => {
    const list = get().activitiesByClass[classroomId] ?? [];
    return list
      .filter((a) => a.semester === semester && a.subject === subject)
      .map((a) => ({ id: a.id, description: a.description, area_id: a.area_id ?? null }));
  },

  deleteActivity: (classroomId, activityId) => {
    set((s) => {
      const list = s.activitiesByClass[classroomId] ?? [];
      const next = { ...s.activitiesByClass, [classroomId]: list.filter((a) => a.id !== activityId) };
      return { activitiesByClass: next };
    });
  },

  clear: () =>
    set({
      classrooms: [],
      studentsByClass: {},
      ratings: {},
      activitiesByClass: {},
    }),
}));
