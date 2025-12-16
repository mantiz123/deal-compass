-- Create table for storing AI property analyses
CREATE TABLE public.property_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  executive_summary TEXT,
  deal_verdict TEXT,
  opportunity_score INTEGER,
  risk_level TEXT,
  motivation_level TEXT,
  offer_min NUMERIC,
  offer_max NUMERIC,
  offer_optimal NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_property_analyses_lead_id ON public.property_analyses(lead_id);
CREATE INDEX idx_property_analyses_property_id ON public.property_analyses(property_id);
CREATE INDEX idx_property_analyses_created_at ON public.property_analyses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.property_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view analyses"
ON public.property_analyses
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert analyses"
ON public.property_analyses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete analyses"
ON public.property_analyses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));