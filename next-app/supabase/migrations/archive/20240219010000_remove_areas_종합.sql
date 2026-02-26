-- areas에서 '국어 종합', '수학 종합' 삭제 (templates는 area_id FK on delete cascade로 함께 삭제)

delete from public.areas
where name in ('국어 종합', '수학 종합');
