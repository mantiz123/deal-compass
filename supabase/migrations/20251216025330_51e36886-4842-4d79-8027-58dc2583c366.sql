-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Agents can update their assigned leads" ON public.leads;

-- Create a more permissive update policy for authenticated users
CREATE POLICY "Authenticated users can update leads" 
ON public.leads 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);