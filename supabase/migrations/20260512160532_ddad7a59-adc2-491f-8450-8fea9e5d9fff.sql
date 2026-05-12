
CREATE TABLE IF NOT EXISTS public.outreach_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  sent_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  bcc_email text,
  status text NOT NULL DEFAULT 'sent',
  provider_id text,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_email_log_sent_by_date
  ON public.outreach_email_log (sent_by, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_email_log_lead
  ON public.outreach_email_log (lead_id, sent_at DESC);

ALTER TABLE public.outreach_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own outreach logs"
ON public.outreach_email_log
FOR SELECT
TO authenticated
USING (sent_by = auth.uid() OR public.is_klose_super_admin(auth.uid()));
