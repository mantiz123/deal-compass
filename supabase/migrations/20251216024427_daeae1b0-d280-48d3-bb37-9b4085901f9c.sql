-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'check', 'wire', 'zelle', 'venmo', 'other');

-- Create payment status enum  
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'cancelled');

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  realtor_id UUID REFERENCES public.realtors(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'check',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_date DATE,
  due_date DATE,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view payments"
ON public.payments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
ON public.payments
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();