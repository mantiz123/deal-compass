-- Drop the security definer view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.property_comps_summary;

CREATE VIEW public.property_comps_summary 
WITH (security_invoker = true) AS
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