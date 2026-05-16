-- SMS outreach log: mirrors outreach_email_log but for Twilio SMS
CREATE TABLE IF NOT EXISTS public.sms_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('queued', 'sent', 'delivered', 'undelivered', 'failed')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),
  twilio_sid text,
  enrollment_id uuid REFERENCES public.campaign_enrollments(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES public.campaign_sequences(id) ON DELETE SET NULL,
  dnc_checked_at timestamptz,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_outreach_log_lead
  ON public.sms_outreach_log (lead_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_outreach_log_sent_by
  ON public.sms_outreach_log (sent_by, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_outreach_log_twilio_sid
  ON public.sms_outreach_log (twilio_sid) WHERE twilio_sid IS NOT NULL;

ALTER TABLE public.sms_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS logs"
ON public.sms_outreach_log
FOR SELECT TO authenticated
USING (sent_by = auth.uid() OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Users can insert their own SMS logs"
ON public.sms_outreach_log
FOR INSERT TO authenticated
WITH CHECK (sent_by = auth.uid() OR public.is_klose_super_admin(auth.uid()));

-- Service role (Edge Functions) can update status after Twilio delivery callback
CREATE POLICY "Super admins can update SMS logs"
ON public.sms_outreach_log
FOR UPDATE TO authenticated
USING (public.is_klose_super_admin(auth.uid()));
