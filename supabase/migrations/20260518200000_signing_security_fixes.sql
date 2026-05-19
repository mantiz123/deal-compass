-- ─────────────────────────────────────────────────────────────────────────────
-- Signing Security Fixes + Legal Compliance Columns
-- Fixes critical RLS vulnerabilities in the contract signing system.
-- All anon signing ops now go through Edge Functions (service role, token validated server-side).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add security and compliance columns
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS document_hash text,
  ADD COLUMN IF NOT EXISTS signing_token_expires_at timestamptz;

-- 2. FIX CRITICAL: Drop overly permissive anon policies
-- Bug: "signing_token IS NOT NULL" allows ANY anon user to read/update ALL contracts.
DROP POLICY IF EXISTS "Public can view contracts by signing token" ON public.contracts;
DROP POLICY IF EXISTS "Anon can update contract status for signing" ON public.contracts;

-- These are replaced by:
--   get-contract-for-signing  (service role, validates signing_token server-side)
--   submit-contract-signing   (service role, validates signing_token server-side)

-- 3. FIX: Drop overly permissive anon signature policies
DROP POLICY IF EXISTS "Anyone can insert signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Public can view signatures by contract" ON public.contract_signatures;

-- These operations now go through submit-contract-signing (service role).

-- 4. Authenticated users keep full access (no change needed)
-- "Authenticated users can view contracts" ON public.contracts FOR SELECT TO authenticated USING (true)
-- "Authenticated users can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true)
-- "Authenticated users can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true)
-- "Authenticated users can view signatures" ON public.contract_signatures FOR SELECT TO authenticated USING (true)
