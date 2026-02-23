-- 학급에 학년도(연도) 추가 (예: 2025년 1학년 1반)
alter table public.classrooms
  add column if not exists school_year int;

comment on column public.classrooms.school_year is '학년도 (예: 2025). null이면 기존 데이터.';
