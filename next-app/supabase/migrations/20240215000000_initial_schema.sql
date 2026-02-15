-- =============================================================================
-- 성적도우미 초기 스키마 (supabase-postgres-best-practices 반영)
-- =============================================================================
-- 참고 스킬: schema-lowercase-identifiers, schema-primary-keys,
--            schema-data-types, schema-foreign-key-indexes, security-rls-basics
--
-- 규칙: 식별자 소문자 snake_case, PK는 bigint identity, FK 컬럼 인덱스, RLS 준비
-- =============================================================================

-- -----------------------------------------------------------------------------
-- templates: 문장 템플릿 (영역, 등급, 문장)
-- schema-primary-keys: bigint generated always as identity
-- schema-data-types: text, timestamptz
-- -----------------------------------------------------------------------------
create table if not exists public.templates (
  id bigint generated always as identity primary key,
  area text not null,
  grade_level text not null,
  sentence_template text not null,
  created_at timestamptz not null default now()
);

comment on table public.templates is '문장 템플릿 (영역, 등급, 문장)';

-- -----------------------------------------------------------------------------
-- projects: 작업 프로젝트 (학년, 학기, 과목)
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id bigint generated always as identity primary key,
  name text not null,
  grade text,
  semester text,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- 인증 사용 시: owner_id uuid references auth.users(id)
);

comment on table public.projects is '작업 프로젝트 (학년, 학기, 과목)';

-- -----------------------------------------------------------------------------
-- students: 학생 정보 (프로젝트별)
-- schema-foreign-key-indexes: FK 컬럼에 인덱스 필수 (JOIN/CASCADE 성능)
-- -----------------------------------------------------------------------------
create table if not exists public.students (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  name text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_students_project_id on public.students(project_id);
comment on table public.students is '학생 정보 (프로젝트별)';

-- -----------------------------------------------------------------------------
-- results: 생성 결과
-- -----------------------------------------------------------------------------
create table if not exists public.results (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  student_id bigint references public.students(id) on delete set null,
  template_id bigint references public.templates(id) on delete set null,
  content text,
  created_at timestamptz not null default now()
);

create index if not exists idx_results_project_id on public.results(project_id);
create index if not exists idx_results_student_id on public.results(student_id);
create index if not exists idx_results_template_id on public.results(template_id);
comment on table public.results is '문장 생성 결과';

-- -----------------------------------------------------------------------------
-- RLS (security-rls-basics): 다중 테넌트 시 DB 수준 격리
-- 인증 사용 시 아래 주석 해제 후 owner_id 등으로 정책 작성
-- -----------------------------------------------------------------------------
-- alter table public.projects enable row level security;
-- alter table public.students enable row level security;
-- alter table public.results enable row level security;
-- create policy projects_owner on public.projects for all to authenticated
--   using (owner_id = auth.uid());
-- create policy students_via_project on public.students for all to authenticated
--   using (exists (select 1 from public.projects p where p.id = students.project_id and p.owner_id = auth.uid()));
-- create policy results_via_project on public.results for all to authenticated
--   using (exists (select 1 from public.projects p where p.id = results.project_id and p.owner_id = auth.uid()));
