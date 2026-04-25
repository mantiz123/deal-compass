
-- Tabla para guardar demos generados de agentes (audición)
CREATE TABLE public.agent_demos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_persona TEXT NOT NULL,           -- 'sarah' | 'mike' | 'alex_discovery'
  seller_persona TEXT NOT NULL,          -- 'motivated' | 'hostile' | 'undecided' | 'foreclosure' | 'absentee'
  language TEXT NOT NULL DEFAULT 'en',   -- 'en' | 'es'
  scenario_summary TEXT,                 -- Contexto: dirección ficticia, situación
  transcript JSONB NOT NULL,             -- [{ speaker: 'agent'|'seller', text: '...' }]
  audio_path TEXT,                       -- Ruta en storage
  audio_url TEXT,                        -- URL pública firmada
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'generating' | 'ready' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own demos"
  ON public.agent_demos FOR SELECT
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own demos"
  ON public.agent_demos FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users update their own demos"
  ON public.agent_demos FOR UPDATE
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete their own demos"
  ON public.agent_demos FOR DELETE
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_agent_demos_user ON public.agent_demos(created_by, created_at DESC);

CREATE TRIGGER update_agent_demos_updated_at
  BEFORE UPDATE ON public.agent_demos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket para audios de demos (privado, requiere URL firmada)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-demos', 'agent-demos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view their own demo audios"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-demos'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Service role uploads demo audios"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agent-demos');
