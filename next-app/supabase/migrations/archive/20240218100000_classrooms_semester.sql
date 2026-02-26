-- 학급(classrooms) 및 학기(semester) 지원
-- 1) 학급 테이블
-- 2) students에 classroom_id 추가
-- 3) areas에 semester 추가 (1학기/2학기)

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  grade int not null check (grade >= 1 and grade <= 6),
  class_number int not null check (class_number >= 1),
  name text not null,
  unique(grade, class_number)
);

alter table public.students
  add column if not exists classroom_id uuid references public.classrooms(id) on delete set null;

create index if not exists idx_students_classroom_id on public.students(classroom_id);

alter table public.areas
  add column if not exists semester int not null default 1 check (semester in (1, 2));

create index if not exists idx_areas_subject_semester on public.areas(subject, semester);
