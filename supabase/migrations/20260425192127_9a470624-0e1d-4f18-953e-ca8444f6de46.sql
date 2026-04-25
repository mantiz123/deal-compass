-- Add skill scores and difficulty to training sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS skill_scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coaching_summary text,
  ADD COLUMN IF NOT EXISTS audio_url text;

COMMENT ON COLUMN public.training_sessions.skill_scores IS 'JSON con scores 0-100 por skill: rapport, discovery, objection_handling, pricing, closing';
COMMENT ON COLUMN public.training_sessions.difficulty IS 'easy | medium | hard';
COMMENT ON COLUMN public.training_sessions.coaching_summary IS 'Resumen accionable de coaching generado por AI';
COMMENT ON COLUMN public.training_sessions.audio_url IS 'URL del audio MP3 de la conversación (cacheada de ElevenLabs)';