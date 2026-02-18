-- 등급 4단계: 매우잘함(1)/잘함(2)/보통(3)/노력요함(4)

do $$
declare _con text;
begin
  select conname into _con from pg_constraint
  where conrelid = 'public.templates'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%level%';
  if _con is not null then
    execute 'alter table public.templates drop constraint ' || quote_ident(_con);
  end if;
end $$;
alter table public.templates add constraint templates_level_check check (level in ('1','2','3','4'));

do $$
declare _con text;
begin
  select conname into _con from pg_constraint
  where conrelid = 'public.ratings'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%level%';
  if _con is not null then
    execute 'alter table public.ratings drop constraint ' || quote_ident(_con);
  end if;
end $$;
alter table public.ratings add constraint ratings_level_check check (level in ('1','2','3','4'));
