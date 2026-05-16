-- Table to track each Propwire CSV import run.
-- Prevents reprocessing the same file and gives Sergio a full history.

CREATE TABLE IF NOT EXISTS public.propwire_import_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name           TEXT        NOT NULL,
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_in_csv        INT         NOT NULL DEFAULT 0,
  passed_filters      INT         NOT NULL DEFAULT 0,
  duplicates_skipped  INT         NOT NULL DEFAULT 0,
  imported_count      INT         NOT NULL DEFAULT 0,
  top_leads           JSONB       NOT NULL DEFAULT '[]',
  email_sent          BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propwire_import_log_file
  ON public.propwire_import_log (file_name, imported_at DESC);

ALTER TABLE public.propwire_import_log ENABLE ROW LEVEL SECURITY;

-- Only service role (cron) and super admins can read/write
CREATE POLICY "service_role_access" ON public.propwire_import_log
  USING (true) WITH CHECK (true);
