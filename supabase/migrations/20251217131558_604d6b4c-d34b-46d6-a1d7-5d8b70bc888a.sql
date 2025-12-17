-- Fix security definer view by recreating with security invoker
DROP VIEW IF EXISTS public.dead_leads_analytics;

CREATE VIEW public.dead_leads_analytics 
WITH (security_invoker = true) AS
SELECT 
  archive_reason,
  COUNT(*) as count,
  AVG(piw_score) as avg_piw_score,
  AVG(days_without_activity) as avg_days_stale
FROM public.leads
WHERE archived_at IS NOT NULL
GROUP BY archive_reason;