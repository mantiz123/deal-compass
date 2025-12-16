-- Add enrichment fields to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS estimated_monthly_rent NUMERIC,
ADD COLUMN IF NOT EXISTS walkability_score INTEGER,
ADD COLUMN IF NOT EXISTS school_rating NUMERIC,
ADD COLUMN IF NOT EXISTS median_household_income NUMERIC,
ADD COLUMN IF NOT EXISTS population_growth_5yr NUMERIC,
ADD COLUMN IF NOT EXISTS crime_index NUMERIC,
ADD COLUMN IF NOT EXISTS days_on_market_avg INTEGER;

-- Create table for comparable sales
CREATE TABLE public.property_comps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  sale_price NUMERIC NOT NULL,
  sale_date DATE,
  sqft INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  distance_miles NUMERIC,
  price_per_sqft NUMERIC GENERATED ALWAYS AS (
    CASE WHEN sqft > 0 THEN ROUND(sale_price / sqft, 2) ELSE NULL END
  ) STORED,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_property_comps_property_id ON public.property_comps(property_id);

-- Enable Row Level Security
ALTER TABLE public.property_comps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view comps"
ON public.property_comps
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert comps"
ON public.property_comps
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update comps"
ON public.property_comps
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete comps"
ON public.property_comps
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create view for property with calculated ARV from comps
CREATE OR REPLACE VIEW public.property_comps_summary AS
SELECT 
  property_id,
  COUNT(*) as comp_count,
  ROUND(AVG(sale_price), 0) as avg_sale_price,
  ROUND(AVG(price_per_sqft), 2) as avg_price_per_sqft,
  ROUND(MIN(sale_price), 0) as min_sale_price,
  ROUND(MAX(sale_price), 0) as max_sale_price
FROM public.property_comps
WHERE sale_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY property_id;