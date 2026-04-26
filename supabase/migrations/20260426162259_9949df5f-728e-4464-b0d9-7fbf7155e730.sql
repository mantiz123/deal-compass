-- Create enum for strategy types
DO $$ BEGIN
  CREATE TYPE public.lead_strategy AS ENUM (
    'cash',
    'sub_to',
    'wrap',
    'seller_finance',
    'hybrid',
    'novation',
    'pass'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add strategy columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS recommended_strategy public.lead_strategy,
  ADD COLUMN IF NOT EXISTS alternative_strategies jsonb,
  ADD COLUMN IF NOT EXISTS strategy_confidence integer,
  ADD COLUMN IF NOT EXISTS strategy_mao numeric,
  ADD COLUMN IF NOT EXISTS strategy_reasons jsonb,
  ADD COLUMN IF NOT EXISTS strategy_disqualifiers jsonb,
  ADD COLUMN IF NOT EXISTS strategy_calculated_at timestamp with time zone;

-- Index for filtering / dashboards
CREATE INDEX IF NOT EXISTS idx_leads_recommended_strategy
  ON public.leads (recommended_strategy)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_strategy_confidence
  ON public.leads (strategy_confidence DESC)
  WHERE archived_at IS NULL;