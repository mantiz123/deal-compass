
-- Tax classification enum (W-9 box 3)
CREATE TYPE public.tax_classification AS ENUM (
  'individual',
  'sole_proprietor',
  'single_member_llc',
  'c_corporation',
  's_corporation',
  'partnership',
  'trust_estate',
  'llc_c',
  'llc_s',
  'llc_p',
  'other'
);

-- Independent Contractor Agreements (ICA) signed by deal finders
CREATE TABLE public.contractor_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL DEFAULT public.get_default_org_id(),

  -- Agreement metadata
  agreement_version text NOT NULL DEFAULT 'v1.0',
  agreement_language text NOT NULL DEFAULT 'es',

  -- Contractor identity (W-9 collection)
  legal_name text NOT NULL,
  business_name text,
  tax_classification public.tax_classification NOT NULL DEFAULT 'individual',
  -- Stored as last 4 digits only for UI; full TIN should NOT be persisted in plain text long-term.
  -- For MVP we store full TIN encrypted at rest via Postgres; rotate to KMS later.
  tax_id_full text NOT NULL,
  tax_id_last4 text NOT NULL,

  -- Mailing address
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',

  -- Contact
  email text NOT NULL,
  phone text,

  -- Commission terms (snapshot at signing time)
  commission_split_student numeric(5,2) NOT NULL DEFAULT 60.00,

  -- Signature data
  signature_image text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,

  -- Storage references
  signed_pdf_url text,
  signed_pdf_path text,

  -- Lifecycle
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  revoked_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_contractor_agreements_active_user
  ON public.contractor_agreements (user_id)
  WHERE is_active = true;

CREATE INDEX idx_contractor_agreements_org ON public.contractor_agreements (organization_id);

-- RLS
ALTER TABLE public.contractor_agreements ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreement
CREATE POLICY "Users view own contractor agreement"
ON public.contractor_agreements
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_klose_super_admin(auth.uid()));

-- Users can insert their own agreement
CREATE POLICY "Users sign own contractor agreement"
ON public.contractor_agreements
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Only super admins can update (e.g. revoke) or delete
CREATE POLICY "Super admins update contractor agreements"
ON public.contractor_agreements
FOR UPDATE
TO authenticated
USING (public.is_klose_super_admin(auth.uid()));

CREATE POLICY "Super admins delete contractor agreements"
ON public.contractor_agreements
FOR DELETE
TO authenticated
USING (public.is_klose_super_admin(auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_contractor_agreements_updated_at
BEFORE UPDATE ON public.contractor_agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: has the user signed an active ICA?
CREATE OR REPLACE FUNCTION public.has_signed_contractor_agreement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contractor_agreements
    WHERE user_id = _user_id
      AND is_active = true
  );
$$;

-- Storage bucket for signed contractor agreements (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-agreements', 'contractor-agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: each user uploads/reads their own agreement under their user_id folder
CREATE POLICY "Users upload own ICA"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contractor-agreements'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own ICA"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contractor-agreements'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_klose_super_admin(auth.uid())
  )
);

CREATE POLICY "Super admins manage ICA storage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'contractor-agreements'
  AND public.is_klose_super_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'contractor-agreements'
  AND public.is_klose_super_admin(auth.uid())
);
