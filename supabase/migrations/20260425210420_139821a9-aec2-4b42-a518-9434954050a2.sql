-- Fix infinite recursion in organization_members RLS policies
-- The issue: policies query organization_members from within their own policy

-- Step 1: Create a security definer function to check if user is admin/owner of an org
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'owner'
      AND is_active = true
  );
$$;

-- Step 2: Drop the recursive policies
DROP POLICY IF EXISTS "Users see their own memberships and super admins see all" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and super admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and super admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and super admins can remove members" ON public.organization_members;

-- Step 3: Recreate without recursion using security definer functions
CREATE POLICY "Users see their own memberships"
ON public.organization_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_klose_super_admin(auth.uid())
  OR is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Owners and super admins can add members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
  is_klose_super_admin(auth.uid())
  OR is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Owners and super admins can update members"
ON public.organization_members FOR UPDATE
TO authenticated
USING (
  is_klose_super_admin(auth.uid())
  OR is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Owners and super admins can remove members"
ON public.organization_members FOR DELETE
TO authenticated
USING (
  is_klose_super_admin(auth.uid())
  OR is_org_owner(auth.uid(), organization_id)
);

-- Step 4: Same fix for organizations table policies that subquery organization_members
DROP POLICY IF EXISTS "Owners and super admins can update organizations" ON public.organizations;

CREATE POLICY "Owners and super admins can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  is_klose_super_admin(auth.uid())
  OR is_org_admin_or_owner(auth.uid(), id)
);