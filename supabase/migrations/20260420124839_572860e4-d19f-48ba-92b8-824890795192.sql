-- Tabla para sesiones de entrenamiento del Voice Agent
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL CHECK (persona IN ('DESPERATE_FORECLOSURE', 'SKEPTICAL_PROBATE', 'TIRE_KICKER_GREEDY', 'CONFUSED_ELDERLY', 'UNKNOWN')),
  outcome TEXT,
  agent_score INTEGER CHECK (agent_score >= 0 AND agent_score <= 100),
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  final_offer NUMERIC,
  would_close BOOLEAN,
  duration_seconds INTEGER DEFAULT 0,
  transcript JSONB DEFAULT '[]'::jsonb,
  elevenlabs_conversation_id TEXT,
  raw_result_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_training_sessions_user_id ON public.training_sessions(user_id);
CREATE INDEX idx_training_sessions_created_at ON public.training_sessions(created_at DESC);
CREATE INDEX idx_training_sessions_score ON public.training_sessions(agent_score DESC);

-- Habilitar RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuario ve sus propias sesiones
CREATE POLICY "Users can view their own training sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions"
  ON public.training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training sessions"
  ON public.training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins pueden ver todas (para leaderboard)
CREATE POLICY "Admins can view all training sessions"
  ON public.training_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));