-- Daily cron: run Propwire import at 8:00 AM UTC (3 AM ET / 2 AM CT)
-- Gives Sergio fresh leads in his inbox before the workday starts.
--
-- BEFORE RUNNING THIS MIGRATION, replace:
--   <YOUR_SERVICE_ROLE_KEY>  →  Supabase Dashboard → Settings → API → service_role key
--
-- To verify the job was created:
--   SELECT jobname, schedule, command FROM cron.job;
--
-- To disable it temporarily:
--   SELECT cron.unschedule('propwire-import-daily');
--
-- To run it manually right now (test):
--   SELECT net.http_post(
--     url := 'https://nbswprixtajseabjbrre.supabase.co/functions/v1/process-propwire-import',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <YOUR_SERVICE_ROLE_KEY>'),
--     body := '{}'::jsonb
--   );

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'propwire-import-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nbswprixtajseabjbrre.supabase.co/functions/v1/process-propwire-import',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"triggered_by":"cron"}'::jsonb
  ) AS request_id;
  $$
);
