-- areas
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  name text NOT NULL,
  order_index int NOT NULL,
  semester int NOT NULL DEFAULT 1 CHECK (semester IN (1, 2)),
  grade int NOT NULL DEFAULT 1 CHECK (grade >= 1 AND grade <= 6)
);
CREATE INDEX idx_areas_subject_semester ON public.areas(subject, semester);
CREATE INDEX idx_areas_grade_subject_semester ON public.areas(grade, subject, semester);

-- templates
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('1','2','3','4')),
  sentence text NOT NULL,
  grade int NOT NULL DEFAULT 1 CHECK (grade >= 1 AND grade <= 6)
);
CREATE INDEX idx_templates_area_level ON public.templates(area_id, level);

-- classrooms
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade int NOT NULL CHECK (grade >= 1 AND grade <= 6),
  class_number int NOT NULL CHECK (class_number >= 1),
  name text NOT NULL,
  user_id text,
  school_year int
);
CREATE UNIQUE INDEX classrooms_user_year_grade_class_uniq
  ON public.classrooms(user_id, school_year, grade, class_number);
CREATE INDEX idx_classrooms_user_id ON public.classrooms(user_id);

-- students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL,
  name text NOT NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL
);
CREATE INDEX idx_students_classroom_id ON public.students(classroom_id);

-- ratings
CREATE TABLE public.ratings (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('1','2','3','4')),
  PRIMARY KEY (student_id, area_id)
);

-- activities
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  semester int NOT NULL CHECK (semester IN (1, 2)),
  subject text,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL
);
CREATE INDEX idx_activities_classroom_semester ON public.activities(classroom_id, semester);

-- feedback
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
