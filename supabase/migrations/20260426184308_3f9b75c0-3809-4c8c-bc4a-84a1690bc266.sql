-- ============= ACADEMY CERTIFICATES =============
-- Stores premium certificates issued when users complete tracks at 100%

CREATE TYPE public.certificate_type AS ENUM (
  'foundations',
  'closer',
  'scaler',
  'creative_finance',
  'master'
);

CREATE TABLE public.academy_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL DEFAULT public.get_default_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  certificate_type public.certificate_type NOT NULL,
  track_id UUID REFERENCES public.academy_tracks(id) ON DELETE SET NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  recipient_name TEXT NOT NULL,
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  total_lessons_completed INTEGER NOT NULL DEFAULT 0,
  pdf_path TEXT,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- A user can only get one certificate per type (per track or master)
  UNIQUE (user_id, certificate_type)
);

CREATE INDEX idx_academy_certificates_user ON public.academy_certificates(user_id);
CREATE INDEX idx_academy_certificates_number ON public.academy_certificates(certificate_number);
CREATE INDEX idx_academy_certificates_org ON public.academy_certificates(organization_id);

-- Enable RLS
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view their own certificates"
ON public.academy_certificates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins (Klose internal team) can view all certificates
CREATE POLICY "Klose super admins can view all certificates"
ON public.academy_certificates
FOR SELECT
TO authenticated
USING (public.is_klose_super_admin(auth.uid()));

-- Public verification: anyone can read a certificate by its number (used by /verify page)
-- This only exposes the public-safe fields (RLS at column level not enforced, so we'll
-- make verification page read only the fields that should be public)
CREATE POLICY "Anyone can verify a certificate by number"
ON public.academy_certificates
FOR SELECT
TO anon, authenticated
USING (revoked_at IS NULL);

-- Only the system (service role / edge function) can insert/update/delete certificates
CREATE POLICY "Klose super admins can manage certificates"
ON public.academy_certificates
FOR ALL
TO authenticated
USING (public.is_klose_super_admin(auth.uid()))
WITH CHECK (public.is_klose_super_admin(auth.uid()));

-- Storage bucket for certificate PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-certificates', 'academy-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can read their own, super admins read all
CREATE POLICY "Users can read their own certificate PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'academy-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Klose super admins can read all certificate PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'academy-certificates'
  AND public.is_klose_super_admin(auth.uid())
);

-- Helper function to generate next certificate number
-- Format: KL-{TYPE}-{YYYY}-{SEQ:6digits}
-- Example: KL-MASTER-2026-000001
CREATE OR REPLACE FUNCTION public.generate_certificate_number(_cert_type public.certificate_type)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_prefix TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_prefix := CASE _cert_type
    WHEN 'foundations' THEN 'FOUND'
    WHEN 'closer' THEN 'CLOSER'
    WHEN 'scaler' THEN 'SCALER'
    WHEN 'creative_finance' THEN 'CREAT'
    WHEN 'master' THEN 'MASTER'
  END;

  SELECT COUNT(*) + 1
  INTO v_seq
  FROM public.academy_certificates
  WHERE certificate_type = _cert_type
    AND to_char(issued_at, 'YYYY') = v_year;

  v_number := 'KL-' || v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_number;
END;
$$;