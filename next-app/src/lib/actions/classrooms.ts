'use server';

import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Classroom } from '@/lib/types';
import type { Student } from '@/lib/types';
import type { Area } from '@/lib/types';
import type { Activity } from '@/lib/types';
import type { Level } from '@/lib/types';
import type { Rating } from '@/lib/types';
import type { Template } from '@/lib/types';

/** 현재 사용자 ID (없으면 null) */
async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** 해당 학급이 현재 사용자 소유인지 확인. 아니면 null */
async function getOwnedClassroom(supabase: Awaited<ReturnType<typeof createClient>>, classroomId: string): Promise<Classroom | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, grade, class_number, name, school_year')
    .eq('id', classroomId)
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data as Classroom;
}

/** 로그인한 사용자의 학급 목록 (user_id 필터) */
export async function getClassroomsAction(): Promise<Classroom[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, grade, class_number, name, school_year')
    .eq('user_id', userId)
    .order('school_year', { ascending: false, nullsFirst: false })
    .order('grade')
    .order('class_number');

  if (error) throw new Error(error.message);
  return (data ?? []) as Classroom[];
}

/** 학급 생성 (user_id 자동 설정). 로그인 필요. */
export async function createClassroomAction(
  grade: number,
  classNumber: number,
  name: string,
  schoolYear?: number | null
): Promise<{ id: string } | { error: string }> {
  const userId = await getUserId();
  if (!userId) return { error: '로그인이 필요합니다.' };

  const supabase = await createClient();
  const payload: Record<string, unknown> = { grade, class_number: classNumber, name, user_id: userId };
  if (schoolYear != null) payload.school_year = schoolYear;
  const { data, error } = await supabase
    .from('classrooms')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

/** 해당 학급이 현재 사용자 소유인지 확인 후 반환. 아니면 null */
export async function getClassroomIfOwnedAction(classroomId: string): Promise<Classroom | null> {
  const supabase = await createClient();
  return getOwnedClassroom(supabase, classroomId);
}

/** 소유 확인 후 해당 학급의 학생 목록 반환 */
export async function getStudentsForClassroomAction(classroomId: string): Promise<{ classroom: Classroom; students: Student[] } | null> {
  const supabase = await createClient();
  const classroom = await getOwnedClassroom(supabase, classroomId);
  if (!classroom) return null;
  const { data, error } = await supabase
    .from('students')
    .select('id, number, name')
    .eq('classroom_id', classroomId)
    .order('number');
  if (error) throw new Error(error.message);
  return { classroom, students: (data ?? []) as Student[] };
}

/** 소유 확인 후 학생 upsert (기존 행 update, 새 행 insert) */
export async function upsertStudentsForClassroomAction(
  classroomId: string,
  rows: Array<{ id?: string; number: number; name: string }>
): Promise<{ students: Student[] } | { error: string }> {
  const supabase = await createClient();
  const classroom = await getOwnedClassroom(supabase, classroomId);
  if (!classroom) return { error: '권한이 없습니다.' };

  for (const row of rows) {
    if (row.id) {
      await supabase.from('students').update({ number: row.number, name: row.name }).eq('id', row.id);
    } else {
      await supabase.from('students').insert({ number: row.number, name: row.name, classroom_id: classroomId }).select('id').single();
    }
  }
  const { data, error } = await supabase
    .from('students')
    .select('id, number, name')
    .eq('classroom_id', classroomId)
    .order('number');
  if (error) return { error: error.message };
  return { students: (data ?? []) as Student[] };
}

/** 소유 확인 후 학급 + areas 반환 (areas는 과목/학기 공용). subject=통합이면 subject='통합' areas. */
export async function getClassroomWithAreasAction(
  classroomId: string,
  subject: string,
  semester: number
): Promise<{ classroom: Classroom; areas: Area[] } | null> {
  const supabase = await createClient();
  const classroom = await getOwnedClassroom(supabase, classroomId);
  if (!classroom) return null;
  const { data: areasData, error } = await supabase
    .from('areas')
    .select('id, subject, name, order_index, semester')
    .eq('subject', subject)
    .eq('semester', semester)
    .order('order_index');
  if (error) throw new Error(error.message);
  return { classroom, areas: (areasData ?? []) as Area[] };
}

/** 소유 확인 후 등급·활동 포함 전체 데이터 (ratings 페이지용) */
export async function getClassroomDataForRatingsAction(
  classroomId: string,
  semester: number,
  subject: string
): Promise<{
  classroom: Classroom;
  students: Student[];
  areas: Area[];
  ratings: Record<string, Level>;
  activities: Activity[];
} | null> {
  const supabase = await createClient();
  const classroom = await getOwnedClassroom(supabase, classroomId);
  if (!classroom) return null;

  const [studentsRes, areasRes, ratingsRes, activitiesRes] = await Promise.all([
    supabase.from('students').select('id, number, name').eq('classroom_id', classroomId).order('number'),
    supabase.from('areas').select('id, subject, name, order_index, semester').eq('subject', subject).eq('semester', semester).order('order_index'),
    supabase.from('ratings').select('student_id, area_id, level'),
    supabase.from('activities').select('id, classroom_id, semester, subject, description, area_id, created_at').eq('classroom_id', classroomId).eq('semester', semester).eq('subject', subject).order('created_at', { ascending: true }),
  ]);

  if (studentsRes.error) throw new Error(studentsRes.error.message);
  if (areasRes.error) throw new Error(areasRes.error.message);
  if (ratingsRes.error) throw new Error(ratingsRes.error.message);
  if (activitiesRes.error) throw new Error(activitiesRes.error.message);

  const students = (studentsRes.data ?? []) as Student[];
  const areas = (areasRes.data ?? []) as Area[];
  const ratingsMap: Record<string, Level> = {};
  for (const r of ratingsRes.data ?? []) {
    ratingsMap[`${r.student_id}-${r.area_id}`] = r.level as Level;
  }
  const activities = (activitiesRes.data ?? []) as Activity[];

  return { classroom, students, areas, ratings: ratingsMap, activities };
}

/** 소유 확인 후 등급 upsert */
export async function upsertRatingAction(studentId: string, areaId: string, level: Level | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: student } = await supabase.from('students').select('classroom_id').eq('id', studentId).single();
  if (!student?.classroom_id) return { error: '권한이 없습니다.' };
  const classroom = await getOwnedClassroom(supabase, student.classroom_id);
  if (!classroom) return { error: '권한이 없습니다.' };

  if (level === null) {
    await supabase.from('ratings').delete().eq('student_id', studentId).eq('area_id', areaId);
  } else {
    await supabase.from('ratings').upsert(
      { student_id: studentId, area_id: areaId, level },
      { onConflict: 'student_id,area_id' }
    );
  }
  return {};
}

/** 소유 확인 후 활동 추가 */
export async function addActivityAction(
  classroomId: string,
  semester: number,
  subject: string | null,
  description: string,
  areaId?: string | null
): Promise<{ activity?: Activity; error?: string }> {
  const supabase = await createClient();
  const classroom = await getOwnedClassroom(supabase, classroomId);
  if (!classroom) return { error: '권한이 없습니다.' };
  const payload: Record<string, unknown> = { classroom_id: classroomId, semester, subject, description };
  if (areaId != null && areaId !== '') payload.area_id = areaId;
  const { data, error } = await supabase
    .from('activities')
    .insert(payload)
    .select('id, classroom_id, semester, subject, description, area_id, created_at')
    .single();
  if (error) return { error: error.message };
  return { activity: data as Activity };
}

/** 소유 확인 후 활동 삭제 */
export async function deleteActivityAction(activityId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: act } = await supabase.from('activities').select('classroom_id').eq('id', activityId).single();
  if (!act?.classroom_id) return { error: '권한이 없습니다.' };
  const classroom = await getOwnedClassroom(supabase, act.classroom_id);
  if (!classroom) return { error: '권한이 없습니다.' };
  await supabase.from('activities').delete().eq('id', activityId);
  return {};
}

/** review 페이지용: 소유 확인 후 학생·areas·ratings·templates·activities 반환 */
export async function getReviewDataAction(
  classroomId: string,
  semester: number,
  subject: string
): Promise<{
  students: Student[];
  areas: Area[];
  ratings: Rating[];
  templates: Template[];
  activities: Activity[];
} | null> {
  const supabase = await createClient();
  const classroom = await getOwnedClassroom(supabase, classroomId);
  if (!classroom) return null;

  const [studentsRes, areasRes, ratingsRes, templatesRes, activitiesRes] = await Promise.all([
    supabase.from('students').select('id, number, name').eq('classroom_id', classroomId).order('number'),
    supabase.from('areas').select('id, subject, name, order_index, semester').eq('subject', subject).eq('semester', semester).order('order_index'),
    supabase.from('ratings').select('student_id, area_id, level'),
    supabase.from('templates').select('id, area_id, level, sentence'),
    supabase.from('activities').select('id, description').eq('classroom_id', classroomId).eq('semester', semester).eq('subject', subject).order('created_at', { ascending: true }),
  ]);

  if (studentsRes.error || areasRes.error || ratingsRes.error || templatesRes.error || activitiesRes.error) return null;

  return {
    students: (studentsRes.data ?? []) as Student[],
    areas: (areasRes.data ?? []) as Area[],
    ratings: (ratingsRes.data ?? []) as Rating[],
    templates: (templatesRes.data ?? []) as Template[],
    activities: (activitiesRes.data ?? []) as Activity[],
  };
}
