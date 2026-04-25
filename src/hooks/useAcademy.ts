import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============= Tracks =============
export function useAcademyTracks() {
  return useQuery({
    queryKey: ['academy-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_tracks')
        .select('*')
        .eq('is_published', true)
        .order('level_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ============= Lessons (universal track) =============
export function useTrackLessons(trackId: string | undefined) {
  return useQuery({
    queryKey: ['academy-lessons', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .eq('track_id', trackId)
        .eq('is_published', true)
        .order('lesson_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!trackId,
  });
}

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['academy-lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });
}

// ============= Quiz =============
export function useLessonQuiz(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['academy-quiz', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from('academy_quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('question_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });
}

// ============= States =============
export function useAcademyStates() {
  return useQuery({
    queryKey: ['academy-states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_states')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ============= State Pack lessons =============
export function useStatePackLessons(stateId: string | undefined) {
  return useQuery({
    queryKey: ['academy-state-pack', stateId],
    queryFn: async () => {
      if (!stateId) return [];
      const { data, error } = await supabase
        .from('academy_state_packs')
        .select('*')
        .eq('state_id', stateId)
        .eq('is_published', true)
        .order('lesson_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!stateId,
  });
}

// ============= User specializations =============
export function useUserSpecializations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-specializations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_state_specializations')
        .select('*, state:academy_states(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// ============= User progress =============
export function useUserProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-academy-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('academy_lesson_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// ============= Quiz attempts =============
export function useUserQuizAttempts(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['quiz-attempts', user?.id, lessonId],
    queryFn: async () => {
      if (!user?.id || !lessonId) return [];
      const { data, error } = await supabase
        .from('academy_quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .order('attempted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!lessonId,
  });
}

// ============= Mutations =============
export function useStartLesson() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) throw new Error('No user');
      // Check if already exists
      const { data: existing } = await supabase
        .from('academy_lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (existing) return existing;
      const { data, error } = await supabase
        .from('academy_lesson_progress')
        .insert({ user_id: user.id, lesson_id: lessonId, status: 'started' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-academy-progress'] }),
  });
}

export function useSubmitQuiz() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lessonId,
      answers,
      questions,
      xpReward,
    }: {
      lessonId: string;
      answers: number[];
      questions: { id: string; correct_index: number }[];
      xpReward: number;
    }) => {
      if (!user?.id) throw new Error('No user');
      const correct_count = answers.filter((a, i) => a === questions[i].correct_index).length;
      const total_questions = questions.length;
      const score_percent = Math.round((correct_count / total_questions) * 100);
      const passed = score_percent >= 80;

      const { error: attemptErr } = await supabase.from('academy_quiz_attempts').insert({
        user_id: user.id,
        lesson_id: lessonId,
        total_questions,
        correct_count,
        score_percent,
        passed,
        answers: answers as any,
      });
      if (attemptErr) throw attemptErr;

      // If passed, mark lesson as completed
      if (passed) {
        await supabase
          .from('academy_lesson_progress')
          .upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              status: 'completed',
              completed_at: new Date().toISOString(),
              xp_earned: xpReward,
            },
            { onConflict: 'user_id,lesson_id' as any }
          );
      }

      return { passed, score_percent, correct_count, total_questions, xp: passed ? xpReward : 0 };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['user-academy-progress'] });
      qc.invalidateQueries({ queryKey: ['quiz-attempts'] });
      if (result.passed) {
        toast.success(`¡Aprobado! ${result.score_percent}% · +${result.xp} XP`);
      } else {
        toast.error(`No alcanzaste el 80%. Tu score: ${result.score_percent}%`);
      }
    },
  });
}

export function useActivateState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stateId, source = 'free' }: { stateId: string; source?: string }) => {
      if (!user?.id) throw new Error('No user');
      const { data, error } = await supabase
        .from('user_state_specializations')
        .insert({
          user_id: user.id,
          state_id: stateId,
          unlock_source: source,
          is_primary: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-specializations'] });
      toast.success('Estado activado. ¡Comienza tu State Pack!');
    },
    onError: (err: any) => toast.error(err.message ?? 'Error al activar estado'),
  });
}

export function useJoinWaitlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stateId: string) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('state_waitlist')
        .insert({ user_id: user.id, state_id: stateId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['state-waitlist'] });
      toast.success('Te avisaremos cuando este estado abra');
    },
  });
}

export function useUserWaitlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['state-waitlist', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('state_waitlist')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// ============= Helpers =============
export function calculateTrackProgress(
  lessons: { id: string }[],
  progress: { lesson_id: string; status: string }[]
) {
  if (lessons.length === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = lessons.filter((l) =>
    progress.some((p) => p.lesson_id === l.id && p.status === 'completed')
  ).length;
  return {
    completed,
    total: lessons.length,
    percent: Math.round((completed / lessons.length) * 100),
  };
}

export function isLessonUnlocked(
  lessonOrder: number,
  allLessons: { id: string; lesson_order: number }[],
  progress: { lesson_id: string; status: string }[]
): boolean {
  if (lessonOrder === 1) return true;
  // Need previous lesson completed
  const previous = allLessons.find((l) => l.lesson_order === lessonOrder - 1);
  if (!previous) return true;
  return progress.some((p) => p.lesson_id === previous.id && p.status === 'completed');
}
