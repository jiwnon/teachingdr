-- =============================================================================
-- 초등 평어 도우미 스키마 (supabase-postgres-best-practices 반영)
-- =============================================================================
-- 학년/학기/과목별 평가 기준 템플릿 → 학생별 등급 입력 → 평어 자동 생성
-- 규칙: lowercase snake_case, bigint identity PK, FK 인덱스
-- =============================================================================

-- 기존 테이블 제거 (초등 평어 도우미 스키마로 전환 시)
drop table if exists public.results;
drop table if exists public.grades;
drop table if exists public.students;
drop table if exists public.projects;
drop table if exists public.templates;

-- -----------------------------------------------------------------------------
-- templates: 단원별·등급별 평어 문장 템플릿
-- MVP: 1학년 2학기, 국어-가/국어-나/수학/통합
-- -----------------------------------------------------------------------------
create table public.templates (
  id bigint generated always as identity primary key,
  grade smallint not null,
  semester smallint not null,
  subject text not null,
  unit text not null,
  level text not null check (level in ('상', '중', '하')),
  sentence text not null,
  created_at timestamptz not null default now()
);

create index idx_templates_grade_semester_subject
  on public.templates(grade, semester, subject);
comment on table public.templates is '단원별·등급별 평어 문장 템플릿';

-- -----------------------------------------------------------------------------
-- projects: 작업 프로젝트 (선생님별, 학년/학기/과목)
-- -----------------------------------------------------------------------------
create table public.projects (
  id bigint generated always as identity primary key,
  teacher_name text,
  grade smallint not null,
  semester smallint not null,
  subject text not null,
  created_at timestamptz not null default now()
);

comment on table public.projects is '평어 작성 프로젝트 (학년/학기/과목)';

-- -----------------------------------------------------------------------------
-- students: 프로젝트별 학생 명단
-- -----------------------------------------------------------------------------
create table public.students (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  name text not null,
  "order" smallint not null default 0
);

create index idx_students_project_id on public.students(project_id);
comment on table public.students is '프로젝트별 학생 명단 (order: 표시 순서)';

-- -----------------------------------------------------------------------------
-- grades: 학생별 단원별 등급 (상/중/하)
-- 학생·단원당 1개 등급
-- -----------------------------------------------------------------------------
create table public.grades (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  unit text not null,
  level text not null check (level in ('상', '중', '하')),
  unique (student_id, unit)
);

create index idx_grades_student_id on public.grades(student_id);
comment on table public.grades is '학생별 단원별 등급';

-- -----------------------------------------------------------------------------
-- results: 학생별 생성된 평어 전체 텍스트
-- -----------------------------------------------------------------------------
create table public.results (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  generated_text text not null,
  created_at timestamptz not null default now()
);

create index idx_results_student_id on public.results(student_id);
comment on table public.results is '학생별 생성된 평어 전체';
