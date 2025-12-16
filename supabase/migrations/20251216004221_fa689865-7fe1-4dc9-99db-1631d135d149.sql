-- Create realtors table
CREATE TABLE public.realtors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.realtors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view realtors"
  ON public.realtors FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert realtors"
  ON public.realtors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update realtors"
  ON public.realtors FOR UPDATE
  USING (true);

-- Add referral fields to leads table
ALTER TABLE public.leads 
  ADD COLUMN referred_by_realtor_id UUID REFERENCES public.realtors(id),
  ADD COLUMN referral_commission NUMERIC,
  ADD COLUMN listing_price NUMERIC;

-- Create trigger for updated_at
CREATE TRIGGER update_realtors_updated_at
  BEFORE UPDATE ON public.realtors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();