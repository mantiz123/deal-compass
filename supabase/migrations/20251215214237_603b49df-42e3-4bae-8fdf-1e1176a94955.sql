-- Add new fields to properties table for the 20 PIW-Score variables

-- I. Seller Motivation Variables
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_tenure_years INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_type TEXT CHECK (owner_type IN ('individual', 'corporation', 'trust', 'estate'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS mailing_address_different BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_probate BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_foreclosure BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS eviction_count INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS last_refinance_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS mortgage_age_years INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tax_delinquent BOOLEAN DEFAULT false;

-- II. Financial Viability Variables
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS neighborhood_vacancy_rate NUMERIC(5,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price_growth_3yr NUMERIC(5,2);

-- III. Closing Difficulty Variables  
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS active_liens_count INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS last_sale_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS last_sale_price NUMERIC(12,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS proximity_to_development TEXT CHECK (proximity_to_development IN ('high', 'medium', 'low', 'none'));

-- Add data source tracking
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS data_fetched_at TIMESTAMP WITH TIME ZONE;