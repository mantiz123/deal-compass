-- ============================================================
-- FASE 0: MULTI-TENANT FOUNDATION
-- ============================================================

-- 1. ENUM para tiers de organización
CREATE TYPE public.organization_tier AS ENUM ('internal', 'free', 'pro', 'elite');

-- 2. ENUM para roles dentro de una organización
CREATE TYPE public.org_member_role AS ENUM ('owner', 'admin', 'agent', 'viewer');

-- 3. Tabla de organizaciones
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tier organization_tier NOT NULL DEFAULT 'free',
  is_klose_internal boolean NOT NULL DEFAULT false,
  logo_url text,
  primary_color text,
  country text,
  city text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Solo puede haber UNA org marcada como Klose Internal
CREATE UNIQUE INDEX idx_only_one_klose_internal 
  ON public.organizations (is_klose_internal) 
  WHERE is_klose_internal = true;

-- 4. Tabla de miembros
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role org_member_role NOT NULL DEFAULT 'agent',
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id) WHERE is_active = true;
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id) WHERE is_active = true;

-- 5. Trigger updated_at en organizations
CREATE TRIGGER trg_orgs_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 7. FUNCIONES HELPER (SECURITY DEFINER para evitar recursión RLS)

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_klose_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = _user_id 
      AND om.is_active = true
      AND o.is_klose_internal = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_belongs_to_org(_user_id, _org_id) 
      OR public.is_klose_super_admin(_user_id);
$$;

-- 8. RLS para organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), id)
    OR public.is_klose_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can insert organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Owners and super admins can update organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    public.is_klose_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

CREATE POLICY "Super admins can delete organizations"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_klose_super_admin(auth.uid()) AND is_klose_internal = false);

-- 9. RLS para organization_members
CREATE POLICY "Users see their own memberships and super admins see all"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_klose_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
        AND om2.user_id = auth.uid()
        AND om2.role IN ('owner', 'admin')
        AND om2.is_active = true
    )
  );

CREATE POLICY "Owners and super admins can add members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_klose_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
        AND om2.user_id = auth.uid()
        AND om2.role IN ('owner', 'admin')
        AND om2.is_active = true
    )
  );

CREATE POLICY "Owners and super admins can update members"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (
    public.is_klose_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
        AND om2.user_id = auth.uid()
        AND om2.role IN ('owner', 'admin')
        AND om2.is_active = true
    )
  );

CREATE POLICY "Owners and super admins can remove members"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (
    public.is_klose_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
        AND om2.user_id = auth.uid()
        AND om2.role = 'owner'
        AND om2.is_active = true
    )
  );

-- ============================================================
-- 10. CREAR ORG KLOSE INTERNAL Y ASIGNAR DUEÑOS
-- ============================================================

DO $$
DECLARE
  v_klose_org_id uuid;
  v_admin_user_id uuid;
BEGIN
  -- Crear Klose Internal
  INSERT INTO public.organizations (name, slug, tier, is_klose_internal, country, city)
  VALUES ('Klose Internal', 'klose-internal', 'internal', true, 'USA', 'Alabama')
  RETURNING id INTO v_klose_org_id;

  -- Asignar TODOS los usuarios admin existentes como owners de Klose Internal
  FOR v_admin_user_id IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_klose_org_id, v_admin_user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END LOOP;

  -- Asignar el resto de usuarios approved como agents de Klose Internal
  FOR v_admin_user_id IN 
    SELECT p.user_id 
    FROM public.profiles p
    WHERE p.is_approved = true
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.user_id = p.user_id AND om.organization_id = v_klose_org_id
      )
  LOOP
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_klose_org_id, v_admin_user_id, 'agent')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 11. AGREGAR organization_id A TODAS LAS TABLAS DE NEGOCIO
--     y poblarla con la org Klose Internal
-- ============================================================

DO $$
DECLARE
  v_klose_org_id uuid;
  v_table text;
  v_business_tables text[] := ARRAY[
    'leads', 'properties', 'buyers', 'contracts', 'contract_signatures',
    'payments', 'payment_links', 'deal_packages', 'interactions',
    'seller_conversations', 'property_analyses', 'property_comps',
    'lead_documents', 'property_images', 'realtors',
    'agent_demos', 'training_sessions',
    'drip_campaigns', 'lead_cleanup_log'
  ];
BEGIN
  SELECT id INTO v_klose_org_id FROM public.organizations WHERE is_klose_internal = true;

  FOREACH v_table IN ARRAY v_business_tables LOOP
    -- Agregar columna nullable primero
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid', v_table);
    -- Poblar con Klose Internal
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', v_table, v_klose_org_id);
    -- Hacer NOT NULL
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', v_table);
    -- Agregar FK
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE', v_table, v_table || '_organization_id_fkey');
    -- Index para performance
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', 'idx_' || v_table || '_org', v_table);
  END LOOP;
END $$;

-- ============================================================
-- 12. REESCRIBIR RLS POLICIES PARA FILTRAR POR ORGANIZACIÓN
-- ============================================================

-- LEADS
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own archived leads" ON public.leads;

CREATE POLICY "Members view leads in their orgs"
  ON public.leads FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert leads in their orgs"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update leads in their orgs"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Org admins or super admins delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (
    public.is_klose_super_admin(auth.uid())
    OR (archived_at IS NOT NULL AND assigned_agent_id = auth.uid())
  );

-- PROPERTIES
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;

CREATE POLICY "Members view properties in their orgs"
  ON public.properties FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert properties in their orgs"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update properties in their orgs"
  ON public.properties FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins delete properties"
  ON public.properties FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- BUYERS
DROP POLICY IF EXISTS "Authenticated users can view active buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can insert buyers" ON public.buyers;
DROP POLICY IF EXISTS "Admins can manage buyers" ON public.buyers;

CREATE POLICY "Members view buyers in their orgs"
  ON public.buyers FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert buyers in their orgs"
  ON public.buyers FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update buyers in their orgs"
  ON public.buyers FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins delete buyers"
  ON public.buyers FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- CONTRACTS
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contracts;

CREATE POLICY "Members view contracts in their orgs"
  ON public.contracts FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Public view contracts by signing token"
  ON public.contracts FOR SELECT TO anon
  USING (signing_token IS NOT NULL);

CREATE POLICY "Members insert contracts in their orgs"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update contracts in their orgs"
  ON public.contracts FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Anon update contract status for signing"
  ON public.contracts FOR UPDATE TO anon
  USING (signing_token IS NOT NULL);

CREATE POLICY "Super admins delete contracts"
  ON public.contracts FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- CONTRACT_SIGNATURES
DROP POLICY IF EXISTS "Anyone can insert signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Public can view signatures by contract" ON public.contract_signatures;

CREATE POLICY "Members view signatures in their orgs"
  ON public.contract_signatures FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Public view signatures by contract"
  ON public.contract_signatures FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert signatures"
  ON public.contract_signatures FOR INSERT TO public WITH CHECK (true);

-- PAYMENTS
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Members view payments in their orgs"
  ON public.payments FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert payments in their orgs"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update payments in their orgs"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- PAYMENT_LINKS
DROP POLICY IF EXISTS "Authenticated users can view payment links" ON public.payment_links;
DROP POLICY IF EXISTS "Authenticated users can create payment links" ON public.payment_links;
DROP POLICY IF EXISTS "Authenticated users can update payment links" ON public.payment_links;
DROP POLICY IF EXISTS "Admins can delete payment links" ON public.payment_links;
DROP POLICY IF EXISTS "Public can view payment link by token" ON public.payment_links;
DROP POLICY IF EXISTS "Service role manages payment links" ON public.payment_links;

CREATE POLICY "Members view payment links in their orgs"
  ON public.payment_links FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Public view payment link by token"
  ON public.payment_links FOR SELECT TO anon USING (true);

CREATE POLICY "Members create payment links in their orgs"
  ON public.payment_links FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_org(auth.uid(), organization_id) 
    AND auth.uid() = created_by
  );

CREATE POLICY "Members update payment links in their orgs"
  ON public.payment_links FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins delete payment links"
  ON public.payment_links FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Service role manages payment links"
  ON public.payment_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- DEAL_PACKAGES
DROP POLICY IF EXISTS "Authenticated users can view deal packages" ON public.deal_packages;
DROP POLICY IF EXISTS "Agents can create deal packages" ON public.deal_packages;
DROP POLICY IF EXISTS "Agents can update deal packages" ON public.deal_packages;

CREATE POLICY "Members view deal packages in their orgs"
  ON public.deal_packages FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members create deal packages in their orgs"
  ON public.deal_packages FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update deal packages in their orgs"
  ON public.deal_packages FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- INTERACTIONS
DROP POLICY IF EXISTS "Authenticated users can view interactions" ON public.interactions;
DROP POLICY IF EXISTS "Authenticated users can create interactions" ON public.interactions;

CREATE POLICY "Members view interactions in their orgs"
  ON public.interactions FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members create interactions in their orgs"
  ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

-- SELLER_CONVERSATIONS
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.seller_conversations;
DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON public.seller_conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.seller_conversations;

CREATE POLICY "Members view conversations in their orgs"
  ON public.seller_conversations FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert conversations in their orgs"
  ON public.seller_conversations FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update conversations in their orgs"
  ON public.seller_conversations FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- PROPERTY_ANALYSES
DROP POLICY IF EXISTS "Authenticated users can view analyses" ON public.property_analyses;
DROP POLICY IF EXISTS "Authenticated users can insert analyses" ON public.property_analyses;
DROP POLICY IF EXISTS "Admins can delete analyses" ON public.property_analyses;

CREATE POLICY "Members view analyses in their orgs"
  ON public.property_analyses FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert analyses in their orgs"
  ON public.property_analyses FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins delete analyses"
  ON public.property_analyses FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- PROPERTY_COMPS
DROP POLICY IF EXISTS "Authenticated users can view comps" ON public.property_comps;
DROP POLICY IF EXISTS "Authenticated users can insert comps" ON public.property_comps;
DROP POLICY IF EXISTS "Authenticated users can update comps" ON public.property_comps;
DROP POLICY IF EXISTS "Authenticated users can delete comps" ON public.property_comps;

CREATE POLICY "Members view comps in their orgs"
  ON public.property_comps FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert comps in their orgs"
  ON public.property_comps FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update comps in their orgs"
  ON public.property_comps FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members delete comps in their orgs"
  ON public.property_comps FOR DELETE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- LEAD_DOCUMENTS
DROP POLICY IF EXISTS "Authenticated users can view lead documents table" ON public.lead_documents;
DROP POLICY IF EXISTS "Authenticated users can insert lead documents" ON public.lead_documents;
DROP POLICY IF EXISTS "Authenticated users can delete their documents" ON public.lead_documents;

CREATE POLICY "Members view lead documents in their orgs"
  ON public.lead_documents FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert lead documents in their orgs"
  ON public.lead_documents FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members delete lead documents in their orgs"
  ON public.lead_documents FOR DELETE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- PROPERTY_IMAGES
DROP POLICY IF EXISTS "Property images are viewable by authenticated users" ON public.property_images;
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON public.property_images;
DROP POLICY IF EXISTS "Authenticated users can update property images" ON public.property_images;
DROP POLICY IF EXISTS "Authenticated users can delete property images" ON public.property_images;

CREATE POLICY "Members view property images in their orgs"
  ON public.property_images FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members upload property images in their orgs"
  ON public.property_images FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update property images in their orgs"
  ON public.property_images FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members delete property images in their orgs"
  ON public.property_images FOR DELETE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- REALTORS
DROP POLICY IF EXISTS "Authenticated users can view realtors" ON public.realtors;
DROP POLICY IF EXISTS "Authenticated users can insert realtors" ON public.realtors;
DROP POLICY IF EXISTS "Authenticated users can update realtors" ON public.realtors;

CREATE POLICY "Members view realtors in their orgs"
  ON public.realtors FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert realtors in their orgs"
  ON public.realtors FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update realtors in their orgs"
  ON public.realtors FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- AGENT_DEMOS
DROP POLICY IF EXISTS "Users see their own demos" ON public.agent_demos;
DROP POLICY IF EXISTS "Users create their own demos" ON public.agent_demos;
DROP POLICY IF EXISTS "Users update their own demos" ON public.agent_demos;
DROP POLICY IF EXISTS "Users delete their own demos" ON public.agent_demos;

CREATE POLICY "Members view demos in their orgs"
  ON public.agent_demos FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members create demos in their orgs"
  ON public.agent_demos FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id) AND auth.uid() = created_by);

CREATE POLICY "Members update demos in their orgs"
  ON public.agent_demos FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members delete demos in their orgs"
  ON public.agent_demos FOR DELETE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

-- TRAINING_SESSIONS
DROP POLICY IF EXISTS "Users can view their own training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can insert their own training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can update their own training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can delete their own training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Admins can view all training sessions" ON public.training_sessions;

CREATE POLICY "Members view training in their orgs"
  ON public.training_sessions FOR SELECT TO authenticated
  USING (
    public.user_can_access_org(auth.uid(), organization_id)
    AND (auth.uid() = user_id OR public.is_klose_super_admin(auth.uid()))
  );

CREATE POLICY "Members insert their training in their orgs"
  ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_access_org(auth.uid(), organization_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "Members update their own training"
  ON public.training_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members delete their own training"
  ON public.training_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- DRIP_CAMPAIGNS
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.drip_campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.drip_campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.drip_campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.drip_campaigns;

CREATE POLICY "Members view campaigns in their orgs"
  ON public.drip_campaigns FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members create campaigns in their orgs"
  ON public.drip_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members update campaigns in their orgs"
  ON public.drip_campaigns FOR UPDATE TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins delete campaigns"
  ON public.drip_campaigns FOR DELETE TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- LEAD_CLEANUP_LOG
DROP POLICY IF EXISTS "Users can view their own cleanup logs" ON public.lead_cleanup_log;
DROP POLICY IF EXISTS "Admins can view all cleanup logs" ON public.lead_cleanup_log;
DROP POLICY IF EXISTS "Service role can insert cleanup logs" ON public.lead_cleanup_log;

CREATE POLICY "Members view cleanup logs in their orgs"
  ON public.lead_cleanup_log FOR SELECT TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members insert cleanup logs in their orgs"
  ON public.lead_cleanup_log FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));