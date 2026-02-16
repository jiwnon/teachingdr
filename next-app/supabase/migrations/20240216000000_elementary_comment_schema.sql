-- =============================================================================
-- 초등 평어 도우미 MVP 스키마 (엑셀 대체 도구, 인증/멀티테넌트 없음)
-- =============================================================================
-- 1학년 1학기 국어·수학. templates만 DB 사용. 학생/등급/결과는 앱 상태(메모리).
-- 규칙: lowercase snake_case, bigint identity PK
-- =============================================================================

drop table if exists public.results;
drop table if exists public.grades;
drop table if exists public.students;
drop table if exists public.projects;
drop table if exists public.templates;

-- -----------------------------------------------------------------------------
-- templates: 단원별·등급별 평어 문장 템플릿
-- MVP: 1학년 1학기, 국어 / 수학
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
comment on table public.templates is '단원별·등급별 평어 문장 템플릿 (1학년 1학기 국어/수학)';
