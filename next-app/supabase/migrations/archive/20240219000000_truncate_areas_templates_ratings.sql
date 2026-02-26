-- 평어 문장 관련 테이블 데이터 전부 비우기 (areas, templates, ratings)
-- ratings·templates가 areas FK 참조 → areas CASCADE로 한 번에 비움

truncate table public.areas cascade;
