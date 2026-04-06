
-- Allow authenticated users to permanently delete their own archived leads
CREATE POLICY "Users can delete their own archived leads"
ON public.leads
FOR DELETE
TO authenticated
USING (
  archived_at IS NOT NULL 
  AND assigned_agent_id = auth.uid()
);
