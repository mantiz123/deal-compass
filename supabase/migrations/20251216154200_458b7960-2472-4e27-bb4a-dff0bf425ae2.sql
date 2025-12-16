-- Create enum for urgency levels
CREATE TYPE public.seller_urgency_level AS ENUM ('desperate', 'high', 'moderate', 'low', 'none');

-- Create enum for price flexibility
CREATE TYPE public.price_flexibility AS ENUM ('very_flexible', 'somewhat_flexible', 'firm', 'unrealistic');

-- Create seller_conversations table for post-call feedback
CREATE TABLE public.seller_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Structured feedback fields
  urgency_level seller_urgency_level NOT NULL,
  main_pain TEXT NOT NULL,
  key_objection TEXT,
  price_flexibility price_flexibility NOT NULL,
  
  -- Additional context
  seller_asking_price NUMERIC,
  our_offer_discussed NUMERIC,
  notes TEXT,
  
  -- AI-adjusted score
  ai_adjusted_score INTEGER,
  ai_adjustment_reason TEXT,
  previous_piw_score INTEGER,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view conversations"
ON public.seller_conversations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert conversations"
ON public.seller_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update conversations"
ON public.seller_conversations FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Index for faster lookups
CREATE INDEX idx_seller_conversations_lead_id ON public.seller_conversations(lead_id);
CREATE INDEX idx_seller_conversations_date ON public.seller_conversations(conversation_date DESC);