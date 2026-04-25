
-- ============================================
-- 1. Catálogo de estados disponibles
-- ============================================
CREATE TABLE public.academy_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- 'AL', 'TX', 'SC', 'FL', 'GA'
  name text NOT NULL,
  flag_emoji text,
  is_live boolean NOT NULL DEFAULT false, -- true = se puede activar
  kcfy_available boolean NOT NULL DEFAULT false, -- true = Klose responde KCFY
  partner_org_id uuid REFERENCES public.organizations(id),
  unlock_method text NOT NULL DEFAULT 'free', -- 'free' | 'paid' | 'deals_milestone' | 'admin_only'
  unlock_price_cents integer,
  unlock_deals_required integer,
  display_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view states"
ON public.academy_states FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins manage states"
ON public.academy_states FOR ALL TO authenticated
USING (is_klose_super_admin(auth.uid()))
WITH CHECK (is_klose_super_admin(auth.uid()));

CREATE TRIGGER update_academy_states_updated_at
BEFORE UPDATE ON public.academy_states
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. State Packs (lecciones específicas por estado)
-- ============================================
CREATE TABLE public.academy_state_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES public.academy_states(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text,
  content_markdown text NOT NULL,
  pack_section text NOT NULL DEFAULT 'legal', -- 'legal' | 'contracts' | 'disclosures' | 'timing' | 'special_cases'
  lesson_order integer NOT NULL,
  estimated_minutes integer DEFAULT 15,
  xp_reward integer NOT NULL DEFAULT 150,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (state_id, slug)
);

ALTER TABLE public.academy_state_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published state pack lessons"
ON public.academy_state_packs FOR SELECT TO authenticated
USING (is_published = true OR is_klose_super_admin(auth.uid()));

CREATE POLICY "Super admins manage state pack lessons"
ON public.academy_state_packs FOR ALL TO authenticated
USING (is_klose_super_admin(auth.uid()))
WITH CHECK (is_klose_super_admin(auth.uid()));

CREATE TRIGGER update_academy_state_packs_updated_at
BEFORE UPDATE ON public.academy_state_packs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_state_packs_state_section ON public.academy_state_packs(state_id, pack_section, lesson_order);

-- ============================================
-- 3. Especializaciones del usuario (qué estados tiene activos)
-- ============================================
CREATE TABLE public.user_state_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state_id uuid NOT NULL REFERENCES public.academy_states(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  unlock_source text NOT NULL DEFAULT 'free', -- 'free' | 'paid' | 'deals_milestone' | 'admin_grant'
  is_primary boolean NOT NULL DEFAULT false,
  pack_completed_at timestamp with time zone,
  total_xp_earned integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, state_id)
);

ALTER TABLE public.user_state_specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own specializations"
ON public.user_state_specializations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_klose_super_admin(auth.uid()));

CREATE POLICY "Users create own specializations"
ON public.user_state_specializations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own specializations"
ON public.user_state_specializations FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_klose_super_admin(auth.uid()));

CREATE POLICY "Super admins delete specializations"
ON public.user_state_specializations FOR DELETE TO authenticated
USING (is_klose_super_admin(auth.uid()));

CREATE INDEX idx_user_specializations_user ON public.user_state_specializations(user_id);

-- ============================================
-- 4. Waitlist para estados Coming Soon
-- ============================================
CREATE TABLE public.state_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state_id uuid NOT NULL REFERENCES public.academy_states(id) ON DELETE CASCADE,
  signed_up_at timestamp with time zone NOT NULL DEFAULT now(),
  notified_at timestamp with time zone,
  notes text,
  UNIQUE (user_id, state_id)
);

ALTER TABLE public.state_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own waitlist entries"
ON public.state_waitlist FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_klose_super_admin(auth.uid()));

CREATE POLICY "Users join waitlist"
ON public.state_waitlist FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users leave waitlist"
ON public.state_waitlist FOR DELETE TO authenticated
USING (user_id = auth.uid() OR is_klose_super_admin(auth.uid()));

-- ============================================
-- 5. Routing en KCFY por estado
-- ============================================
ALTER TABLE public.kcfy_requests
ADD COLUMN state_code text;

CREATE INDEX idx_kcfy_requests_state_code ON public.kcfy_requests(state_code);

-- ============================================
-- 6. Función: ¿usuario puede operar en este estado?
-- ============================================
CREATE OR REPLACE FUNCTION public.can_access_state(_user_id uuid, _state_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_state_specializations uss
    JOIN public.academy_states s ON s.id = uss.state_id
    WHERE uss.user_id = _user_id
      AND s.code = _state_code
      AND s.is_live = true
  );
$$;
