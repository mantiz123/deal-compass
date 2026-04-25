-- 1. Enum for TIN type
DO $$ BEGIN
  CREATE TYPE public.tin_type AS ENUM ('ssn', 'itin', 'ein');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add columns to contractor_agreements
ALTER TABLE public.contractor_agreements
  ADD COLUMN IF NOT EXISTS tin_type public.tin_type NOT NULL DEFAULT 'ssn',
  ADD COLUMN IF NOT EXISTS signed_pdf_hash text;

-- 3. Storage RLS for contractor-agreements bucket (private)
-- Users can read only their own folder; service role writes via edge function.
DO $$ BEGIN
  CREATE POLICY "Users read own contractor agreement pdf"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'contractor-agreements'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Super admins read all contractor agreement pdfs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'contractor-agreements'
      AND public.is_klose_super_admin(auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;