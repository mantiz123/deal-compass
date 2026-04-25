-- ============= ACADEMY: Tracks =============
CREATE TABLE public.academy_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  level_order integer NOT NULL,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'GraduationCap',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view published tracks"
ON public.academy_tracks FOR SELECT TO authenticated
USING (is_published = true OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Super admins manage tracks"
ON public.academy_tracks FOR ALL TO authenticated
USING (public.is_klose_super_admin(auth.uid()))
WITH CHECK (public.is_klose_super_admin(auth.uid()));

CREATE TRIGGER trg_academy_tracks_updated
BEFORE UPDATE ON public.academy_tracks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= ACADEMY: Lessons =============
CREATE TABLE public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.academy_tracks(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text,
  content_markdown text NOT NULL,
  lesson_order integer NOT NULL,
  estimated_minutes integer DEFAULT 15,
  xp_reward integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, slug),
  UNIQUE (track_id, lesson_order)
);

CREATE INDEX idx_academy_lessons_track ON public.academy_lessons(track_id, lesson_order);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view published lessons"
ON public.academy_lessons FOR SELECT TO authenticated
USING (is_published = true OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Super admins manage lessons"
ON public.academy_lessons FOR ALL TO authenticated
USING (public.is_klose_super_admin(auth.uid()))
WITH CHECK (public.is_klose_super_admin(auth.uid()));

CREATE TRIGGER trg_academy_lessons_updated
BEFORE UPDATE ON public.academy_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= ACADEMY: Quiz Questions =============
CREATE TABLE public.academy_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  explanation text,
  question_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_academy_quiz_lesson ON public.academy_quiz_questions(lesson_id, question_order);

ALTER TABLE public.academy_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view quiz questions"
ON public.academy_quiz_questions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins manage quiz questions"
ON public.academy_quiz_questions FOR ALL TO authenticated
USING (public.is_klose_super_admin(auth.uid()))
WITH CHECK (public.is_klose_super_admin(auth.uid()));

-- ============= ACADEMY: Enrollments =============
CREATE TABLE public.academy_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.academy_tracks(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_xp_earned integer NOT NULL DEFAULT 0,
  current_lesson_id uuid REFERENCES public.academy_lessons(id) ON DELETE SET NULL,
  UNIQUE (user_id, track_id)
);

CREATE INDEX idx_academy_enrollments_user ON public.academy_enrollments(user_id);

ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own enrollments"
ON public.academy_enrollments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Users create own enrollments"
ON public.academy_enrollments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own enrollments"
ON public.academy_enrollments FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins delete enrollments"
ON public.academy_enrollments FOR DELETE TO authenticated
USING (public.is_klose_super_admin(auth.uid()));

-- ============= ACADEMY: Lesson Progress =============
CREATE TABLE public.academy_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  xp_earned integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_academy_lesson_progress_user ON public.academy_lesson_progress(user_id);
CREATE INDEX idx_academy_lesson_progress_lesson ON public.academy_lesson_progress(lesson_id);

ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own lesson progress"
ON public.academy_lesson_progress FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Users insert own lesson progress"
ON public.academy_lesson_progress FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own lesson progress"
ON public.academy_lesson_progress FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- ============= ACADEMY: Quiz Attempts =============
CREATE TABLE public.academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  score_percent numeric(5,2) NOT NULL,
  total_questions integer NOT NULL,
  correct_count integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_academy_quiz_attempts_user_lesson ON public.academy_quiz_attempts(user_id, lesson_id, attempted_at DESC);

ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own quiz attempts"
ON public.academy_quiz_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Users insert own quiz attempts"
ON public.academy_quiz_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============= Function: has_completed_foundations =============
CREATE OR REPLACE FUNCTION public.has_completed_foundations(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.academy_lessons l
    JOIN public.academy_tracks t ON t.id = l.track_id
    LEFT JOIN public.academy_lesson_progress p
      ON p.lesson_id = l.id AND p.user_id = _user_id AND p.status = 'completed'
    WHERE t.slug = 'foundations'
      AND l.is_published = true
      AND p.id IS NULL
  );
$$;

-- ============= Seed: 3 Tracks =============
INSERT INTO public.academy_tracks (slug, name, description, level_order, color, icon) VALUES
  ('foundations', 'Foundations', 'Bases legales, lenguaje del wholesaling y métricas K-Score. Obligatorio antes de pedir KCFY.', 1, '#3b82f6', 'BookOpen'),
  ('closer', 'Closer', 'Scripts, manejo de objeciones, contratos AB/BC y cierre de seller calls.', 2, '#10b981', 'Target'),
  ('scaler', 'Scaler', 'Disposición a buyers, sistemas KCFY, escalamiento y construcción de pipeline predecible.', 3, '#8b5cf6', 'Rocket');