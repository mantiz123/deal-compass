
-- Add multi-phone support, DNC flags, property condition, litigator, county, APN
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS phone_2 text,
  ADD COLUMN IF NOT EXISTS phone_3 text,
  ADD COLUMN IF NOT EXISTS phone_4 text,
  ADD COLUMN IF NOT EXISTS phone_5 text,
  ADD COLUMN IF NOT EXISTS phone_1_dnc boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_2_dnc boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_3_dnc boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_4_dnc boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_5_dnc boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS property_condition text,
  ADD COLUMN IF NOT EXISTS exterior_condition text,
  ADD COLUMN IF NOT EXISTS is_litigator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_mail boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS apn text;
