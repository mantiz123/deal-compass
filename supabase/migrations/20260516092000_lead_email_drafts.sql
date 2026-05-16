-- Stores AI-generated email drafts for TC review before sending.
-- Agente 2 — Email Outreach Asistido

CREATE TABLE IF NOT EXISTS public.lead_email_drafts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  to_email     TEXT,
  to_name      TEXT,
  subject      TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  draft_type   TEXT        NOT NULL DEFAULT 'general'
                           CHECK (draft_type IN ('general','foreclosure','tax_delinquent','absentee_owner','vacant')),
  status       TEXT        NOT NULL DEFAULT 'pending_review'
                           CHECK (status IN ('pending_review','sent','archived')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at      TIMESTAMPTZ,
  sent_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  send_result  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_email_drafts_lead   ON public.lead_email_drafts (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_email_drafts_status ON public.lead_email_drafts (status, generated_at DESC);

ALTER TABLE public.lead_email_drafts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and update drafts (TC + admin)
CREATE POLICY "auth_read_drafts"   ON public.lead_email_drafts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_update_drafts" ON public.lead_email_drafts FOR UPDATE TO authenticated USING (true);
-- Service role (cron) can insert
CREATE POLICY "service_insert_drafts" ON public.lead_email_drafts FOR INSERT USING (true) WITH CHECK (true);
