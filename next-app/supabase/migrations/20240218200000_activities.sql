-- 활동 메모(activities): GPT-4 평어 재작성 시 참고용
-- classroom_id, semester, subject 로 범위 지정, description 에 활동 내용 저장

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  semester int not null check (semester in (1, 2)),
  subject text,
  description text not null,
  created_at timestamptz default now()
);

create index if not exists idx_activities_classroom_semester on public.activities(classroom_id, semester);
