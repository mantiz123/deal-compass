
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_vacant boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS absentee_type text DEFAULT null,
ADD COLUMN IF NOT EXISTS owner_mailing_state text DEFAULT null,
ADD COLUMN IF NOT EXISTS owner_mailing_city text DEFAULT null,
ADD COLUMN IF NOT EXISTS days_on_market integer DEFAULT null;
