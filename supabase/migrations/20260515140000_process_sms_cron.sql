-- Enable pg_cron and pg_net extensions (safe to run if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily SMS sequence processing at 10:00 AM UTC
-- This calls the process-sms-sequences Edge Function via HTTP.
--
-- IMPORTANT: Replace the two placeholders below before running:
--   <YOUR_PROJECT_REF>   → found in Supabase Dashboard → Settings → General
--   <YOUR_SERVICE_ROLE_KEY> → found in Supabase Dashboard → Settings → API
--
-- To confirm the job was created:
--   SELECT * FROM cron.job;
--
-- To delete it later:
--   SELECT cron.unschedule('process-sms-sequences-daily');

SELECT cron.schedule(
  'process-sms-sequences-daily',
  '0 10 * * *',   -- 10:00 AM UTC every day (5 AM ET / 6 AM CT)
  $$
  SELECT net.http_post(
    url     := 'https://nbswprixtajseabjbrre.supabase.co/functions/v1/process-sms-sequences',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
