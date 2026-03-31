
-- Create contract type enum
CREATE TYPE public.contract_type AS ENUM ('AB', 'BC', 'AMENDMENT');

-- Create contract status enum
CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'completed');

-- Create contracts table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  contract_type public.contract_type NOT NULL,
  status public.contract_status NOT NULL DEFAULT 'draft',
  contract_data jsonb DEFAULT '{}',
  pdf_url text,
  signed_pdf_url text,
  signing_token uuid DEFAULT gen_random_uuid(),
  seller_email text,
  seller_phone text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contract signatures table
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  signer_name text NOT NULL,
  signer_email text,
  signature_image text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for contracts
CREATE POLICY "Authenticated users can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contracts" ON public.contracts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts" ON public.contracts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete contracts" ON public.contracts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Public read policy for signing page (by token)
CREATE POLICY "Public can view contracts by signing token" ON public.contracts
  FOR SELECT TO anon USING (signing_token IS NOT NULL);

-- RLS policies for signatures
CREATE POLICY "Authenticated users can view signatures" ON public.contract_signatures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert signatures" ON public.contract_signatures
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view signatures by contract" ON public.contract_signatures
  FOR SELECT TO anon USING (true);

-- Public update policy for signing (anon updates status)
CREATE POLICY "Anon can update contract status for signing" ON public.contracts
  FOR UPDATE TO anon USING (signing_token IS NOT NULL);

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true);

-- Storage policies for contracts bucket
CREATE POLICY "Authenticated users can upload contracts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Anyone can view contracts" ON storage.objects
  FOR SELECT USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can update contracts" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can delete contracts" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'contracts');

-- Enable realtime for contracts
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;

-- Updated_at trigger
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
