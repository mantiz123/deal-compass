CREATE TYPE public.deal_stage AS ENUM ('under_analysis','offer','under_contract','rehab','listed','sold','passed');
CREATE TYPE public.deal_decision AS ENUM ('buy','negotiate','pass','undecided');
CREATE TYPE public.comp_status AS ENUM ('closed','pending','active','unknown');

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid,
  address text NOT NULL,
  city text,
  state text DEFAULT 'AL',
  zip_code text,
  county text,
  mls_id text,
  apn text,
  property_type text,
  bedrooms numeric,
  bathrooms numeric,
  sqft integer,
  lot_size_acres numeric,
  year_built integer,
  list_price numeric,
  cma_recommended_offer numeric,
  rvm_value numeric,
  rvm_range_low numeric,
  rvm_range_high numeric,
  assessed_value numeric,
  annual_taxes numeric,
  zoning text,
  listing_description text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_path text,
  pdf_filename text,
  stage public.deal_stage NOT NULL DEFAULT 'under_analysis',
  decision public.deal_decision NOT NULL DEFAULT 'undecided',
  investment_score integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deal_comps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address text NOT NULL,
  price numeric,
  status public.comp_status NOT NULL DEFAULT 'unknown',
  closed_date date,
  distance_miles numeric,
  similarity_score numeric,
  bedrooms numeric,
  bathrooms numeric,
  sqft integer,
  lot_size_acres numeric,
  year_built integer,
  days_on_market integer,
  notes text,
  included boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deal_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Base',
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deal_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_done boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_comps TO authenticated;
GRANT ALL ON public.deal_comps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_scenarios TO authenticated;
GRANT ALL ON public.deal_scenarios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_checklist_items TO authenticated;
GRANT ALL ON public.deal_checklist_items TO service_role;

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_comps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage deals" ON public.deals FOR ALL TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id))
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "org members manage deal comps" ON public.deal_comps FOR ALL TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id))
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "org members manage deal scenarios" ON public.deal_scenarios FOR ALL TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id))
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "org members manage deal checklist" ON public.deal_checklist_items FOR ALL TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id))
  WITH CHECK (public.user_can_access_org(auth.uid(), organization_id));

CREATE INDEX idx_deals_org ON public.deals(organization_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deal_comps_deal ON public.deal_comps(deal_id);
CREATE INDEX idx_deal_scenarios_deal ON public.deal_scenarios(deal_id);
CREATE INDEX idx_deal_checklist_deal ON public.deal_checklist_items(deal_id);

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deal_scenarios_updated_at BEFORE UPDATE ON public.deal_scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deal_checklist_updated_at BEFORE UPDATE ON public.deal_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();