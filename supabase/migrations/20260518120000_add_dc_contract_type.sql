-- Add DC (Double Close) to contract_type enum
ALTER TYPE public.contract_type ADD VALUE IF NOT EXISTS 'DC';
