-- 학습 활동에 단원(area) 연결: 몇 단원에서 한 활동인지 저장
alter table public.activities
  add column if not exists area_id uuid references public.areas(id) on delete set null;

comment on column public.activities.area_id is '해당 활동을 한 단원(area). null이면 단원 미지정.';
