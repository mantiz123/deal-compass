-- 1) HUD FMR table (county / metro area level) FY2026
CREATE TABLE public.hud_fmr_alabama_fy2026 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hud_area_code TEXT NOT NULL,
  area_name TEXT NOT NULL,
  county_name TEXT,
  county_fips TEXT,
  is_metro BOOLEAN NOT NULL DEFAULT false,
  fmr_0br INTEGER NOT NULL,
  fmr_1br INTEGER NOT NULL,
  fmr_2br INTEGER NOT NULL,
  fmr_3br INTEGER NOT NULL,
  fmr_4br INTEGER NOT NULL,
  payment_standard_0br INTEGER,
  payment_standard_1br INTEGER,
  payment_standard_2br INTEGER,
  payment_standard_3br INTEGER,
  payment_standard_4br INTEGER,
  payment_standard_source TEXT NOT NULL DEFAULT 'estimated_110pct_fmr',
  payment_standard_pha_name TEXT,
  payment_standard_updated_at DATE,
  has_may_2026_revision BOOLEAN NOT NULL DEFAULT false,
  fiscal_year INTEGER NOT NULL DEFAULT 2026,
  effective_date DATE NOT NULL DEFAULT '2025-10-01',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hud_area_code, county_fips)
);

CREATE INDEX idx_hud_fmr_county_fips ON public.hud_fmr_alabama_fy2026 (county_fips);
CREATE INDEX idx_hud_fmr_area_code ON public.hud_fmr_alabama_fy2026 (hud_area_code);

GRANT SELECT ON public.hud_fmr_alabama_fy2026 TO anon, authenticated;
GRANT ALL ON public.hud_fmr_alabama_fy2026 TO service_role;

ALTER TABLE public.hud_fmr_alabama_fy2026 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HUD FMR is public reference data"
  ON public.hud_fmr_alabama_fy2026 FOR SELECT
  USING (true);

CREATE TRIGGER update_hud_fmr_alabama_fy2026_updated_at
  BEFORE UPDATE ON public.hud_fmr_alabama_fy2026
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) SAFMR by ZIP (for Birmingham-Hoover and any other SAFMR area)
CREATE TABLE public.hud_fmr_safmr_zip (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zip_code TEXT NOT NULL,
  hud_area_code TEXT NOT NULL,
  area_name TEXT NOT NULL,
  safmr_0br INTEGER NOT NULL,
  safmr_1br INTEGER NOT NULL,
  safmr_2br INTEGER NOT NULL,
  safmr_3br INTEGER NOT NULL,
  safmr_4br INTEGER NOT NULL,
  fiscal_year INTEGER NOT NULL DEFAULT 2026,
  effective_date DATE NOT NULL DEFAULT '2025-10-01',
  has_may_2026_revision BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zip_code, fiscal_year)
);

CREATE INDEX idx_safmr_zip ON public.hud_fmr_safmr_zip (zip_code);

GRANT SELECT ON public.hud_fmr_safmr_zip TO anon, authenticated;
GRANT ALL ON public.hud_fmr_safmr_zip TO service_role;

ALTER TABLE public.hud_fmr_safmr_zip ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SAFMR is public reference data"
  ON public.hud_fmr_safmr_zip FOR SELECT
  USING (true);

CREATE TRIGGER update_hud_fmr_safmr_zip_updated_at
  BEFORE UPDATE ON public.hud_fmr_safmr_zip
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) Persisted underwriting analyses per property
CREATE TABLE public.property_underwriting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  scenario_name TEXT NOT NULL DEFAULT 'Base',

  -- Inputs
  purchase_price NUMERIC NOT NULL,
  rehab_cost NUMERIC NOT NULL DEFAULT 0,
  closing_cost_pct NUMERIC NOT NULL DEFAULT 3,
  monthly_rent NUMERIC NOT NULL,
  rent_source TEXT,             -- 'hud_fmr' | 'hud_safmr' | 'manual' | 'market'
  hud_area_code TEXT,

  -- Financing
  down_payment_pct NUMERIC NOT NULL DEFAULT 25,
  interest_rate NUMERIC NOT NULL DEFAULT 7.5,
  amortization_years INTEGER NOT NULL DEFAULT 30,

  -- Operating
  property_tax_rate_pct NUMERIC NOT NULL DEFAULT 0.9,
  insurance_annual NUMERIC NOT NULL DEFAULT 1400,
  hoa_monthly NUMERIC NOT NULL DEFAULT 0,
  property_mgmt_pct NUMERIC NOT NULL DEFAULT 10,
  vacancy_pct NUMERIC NOT NULL DEFAULT 5,
  repairs_pct NUMERIC NOT NULL DEFAULT 5,
  capex_pct NUMERIC NOT NULL DEFAULT 5,

  -- Computed snapshot
  monthly_cashflow NUMERIC,
  dscr NUMERIC,
  cap_rate NUMERIC,
  coc_return NUMERIC,
  noi_annual NUMERIC,
  cash_invested NUMERIC,
  traffic_light TEXT,           -- 'green' | 'yellow' | 'red'

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_underwriting_property ON public.property_underwriting (property_id);
CREATE INDEX idx_property_underwriting_user ON public.property_underwriting (user_id);
CREATE INDEX idx_property_underwriting_org ON public.property_underwriting (organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_underwriting TO authenticated;
GRANT ALL ON public.property_underwriting TO service_role;

ALTER TABLE public.property_underwriting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own underwriting"
  ON public.property_underwriting FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_property_underwriting_updated_at
  BEFORE UPDATE ON public.property_underwriting
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();