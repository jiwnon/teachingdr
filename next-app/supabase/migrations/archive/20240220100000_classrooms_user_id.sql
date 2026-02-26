-- 학급을 로그인 사용자에게 귀속 (데이터 격리)
-- user_id: NextAuth Google OAuth sub (문자열)
-- 기존 행(user_id NULL)은 로그인 사용자 목록에 안 나옴. 필요 시 수동 backfill.

alter table public.classrooms
  add column if not exists user_id text;

comment on column public.classrooms.user_id is 'NextAuth session user id (e.g. Google sub). NULL = legacy row, no access for logged-in users.';

create index if not exists idx_classrooms_user_id on public.classrooms(user_id);
