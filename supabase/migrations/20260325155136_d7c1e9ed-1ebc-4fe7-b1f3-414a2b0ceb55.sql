ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS auction_date date,
ADD COLUMN IF NOT EXISTS mortgage_balance numeric;