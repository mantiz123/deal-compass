-- Kill Fast System: Archive reasons enum and fields
CREATE TYPE public.archive_reason AS ENUM (
  'price_too_high',
  'not_motivated', 
  'legal_issues',
  'no_response',
  'title_problems',
  'property_condition',
  'lost_to_competitor',
  'other'
);

-- Add archive fields to leads
ALTER TABLE public.leads
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN archive_reason public.archive_reason DEFAULT NULL,
ADD COLUMN archive_notes TEXT DEFAULT NULL,
ADD COLUMN days_without_activity INTEGER DEFAULT 0;

-- Buyer Liquidity Index: Add scoring fields to buyers
ALTER TABLE public.buyers
ADD COLUMN liquidity_score INTEGER DEFAULT NULL CHECK (liquidity_score >= 0 AND liquidity_score <= 100),
ADD COLUMN avg_response_time_hours NUMERIC DEFAULT NULL,
ADD COLUMN close_ratio NUMERIC DEFAULT NULL CHECK (close_ratio >= 0 AND close_ratio <= 100),
ADD COLUMN preferred_discount_percent NUMERIC DEFAULT NULL,
ADD COLUMN last_deal_date DATE DEFAULT NULL,
ADD COLUMN total_deals_offered INTEGER DEFAULT 0,
ADD COLUMN deals_responded INTEGER DEFAULT 0,
ADD COLUMN preferred_cities TEXT[] DEFAULT NULL;

-- Create view for dead leads analytics
CREATE OR REPLACE VIEW public.dead_leads_analytics AS
SELECT 
  archive_reason,
  COUNT(*) as count,
  AVG(piw_score) as avg_piw_score,
  AVG(days_without_activity) as avg_days_stale
FROM public.leads
WHERE archived_at IS NOT NULL
GROUP BY archive_reason;

-- Function to calculate days without activity
CREATE OR REPLACE FUNCTION public.update_days_without_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_contact_at IS NOT NULL THEN
    NEW.days_without_activity := EXTRACT(DAY FROM (NOW() - NEW.last_contact_at));
  ELSE
    NEW.days_without_activity := EXTRACT(DAY FROM (NOW() - NEW.created_at));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-update days without activity
CREATE TRIGGER update_lead_staleness
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_days_without_activity();