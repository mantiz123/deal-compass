-- Daily cron: generate email outreach drafts at 9:00 AM UTC (4 AM ET / 3 AM CT)
-- TC wakes up to fresh drafts ready to review and send.
--
-- BEFORE RUNNING THIS MIGRATION, replace:
--   <YOUR_SERVICE_ROLE_KEY>  →  Supabase Dashboard → Settings → API → service_role key
--
-- Required secrets (set in Supabase → Edge Functions → Secrets):
--   ANTHROPIC_API_KEY     — for Claude Haiku draft generation
--   TC_NOTIFY_EMAIL       — TC email address (e.g. wife@example.com)
--   RESEND_API_KEY        — already configured for Propwire email
--
-- To verify the job was created:
--   SELECT jobname, schedule, command FROM cron.job;
--
-- To run manually right now (test):
--   SELECT net.http_post(
--     url := 'https://nbswprixtajseabjbrre.supabase.co/functions/v1/generate-outreach-drafts',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <YOUR_SERVICE_ROLE_KEY>'),
--     body := '{}'::jsonb
--   );

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'generate-outreach-drafts-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nbswprixtajseabjbrre.supabase.co/functions/v1/generate-outreach-drafts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"triggered_by":"cron"}'::jsonb
  ) AS request_id;
  $$
);
