
CREATE TABLE public.lead_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  property_address text,
  property_city text,
  action text NOT NULL,
  reason text NOT NULL,
  notes text,
  lead_data jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_cleanup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cleanup logs"
  ON public.lead_cleanup_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Service role can insert cleanup logs"
  ON public.lead_cleanup_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all cleanup logs"
  ON public.lead_cleanup_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_cleanup_log_created_at ON public.lead_cleanup_log(created_at DESC);
CREATE INDEX idx_cleanup_log_action ON public.lead_cleanup_log(action);
CREATE INDEX idx_cleanup_log_user_id ON public.lead_cleanup_log(user_id);
