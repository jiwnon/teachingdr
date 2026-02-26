-- 기존 unique(grade, class_number)는 시스템 전체에서 중복을 막아
-- 다른 사용자나 다른 연도의 동일 학급 생성을 차단하는 문제가 있었음.
-- user_id + school_year를 포함한 유니크 제약으로 변경.

ALTER TABLE public.classrooms
  DROP CONSTRAINT IF EXISTS classrooms_grade_class_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS classrooms_user_year_grade_class_uniq
  ON public.classrooms (user_id, school_year, grade, class_number);
