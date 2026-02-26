-- ReportMate MVP: areas, templates, students, ratings

drop table if exists public.ratings;
drop table if exists public.templates;
drop table if exists public.students;
drop table if exists public.areas;

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  name text not null,
  order_index int not null
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  level text not null check (level in ('1','2','3')),
  sentence text not null
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  number int not null,
  name text not null
);

create table public.ratings (
  student_id uuid not null references public.students(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  level text not null check (level in ('1','2','3')),
  primary key (student_id, area_id)
);

create index idx_templates_area_level on public.templates(area_id, level);
