-- Tabla de compras de tracks
CREATE TABLE public.academy_track_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_slug text NOT NULL CHECK (track_slug IN ('closer', 'scaler', 'creative_finance')),
  source text NOT NULL DEFAULT 'individual' CHECK (source IN ('individual', 'bundle', 'comp')),
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  stripe_session_id text,
  stripe_payment_intent_id text,
  bundle_purchase_id uuid,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_slug)
);

CREATE INDEX idx_academy_track_purchases_user ON public.academy_track_purchases(user_id);
CREATE INDEX idx_academy_track_purchases_session ON public.academy_track_purchases(stripe_session_id);

ALTER TABLE public.academy_track_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own track purchases"
  ON public.academy_track_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Super admins manage track purchases"
  ON public.academy_track_purchases FOR ALL
  TO authenticated
  USING (public.is_klose_super_admin(auth.uid()))
  WITH CHECK (public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Service role manages track purchases"
  ON public.academy_track_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper: ¿tiene el usuario acceso al track?
CREATE OR REPLACE FUNCTION public.has_track_access(_user_id uuid, _track_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Foundations es gratis para todos
    _track_slug = 'foundations'
    -- Super admins acceden a todo
    OR public.is_klose_super_admin(_user_id)
    -- Tiene compra registrada (individual, bundle o comp)
    OR EXISTS (
      SELECT 1 FROM public.academy_track_purchases
      WHERE user_id = _user_id AND track_slug = _track_slug
    );
$$;