-- Tighten lead_cleanup_log SELECT policy: remove the OR (user_id IS NULL) branch
-- which exposed orphan log entries (with full lead_data JSON) to all authenticated users.

DROP POLICY IF EXISTS "Users can view their own cleanup logs" ON public.lead_cleanup_log;

CREATE POLICY "Users can view their own cleanup logs"
ON public.lead_cleanup_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());