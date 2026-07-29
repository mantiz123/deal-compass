DROP POLICY IF EXISTS "Public view contracts by signing token" ON public.contracts;
DROP POLICY IF EXISTS "Anon update contract status for signing" ON public.contracts;
DROP POLICY IF EXISTS "Public view signatures by contract" ON public.contract_signatures;
DROP POLICY IF EXISTS "Public view payment link by token" ON public.payment_links;

DROP POLICY IF EXISTS "Anyone can view contracts" ON storage.objects;
CREATE POLICY "Authenticated users can view contracts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Service role uploads demo audios" ON storage.objects;

DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can list property images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'property-images');

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_org_admin_or_owner(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_org_owner(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.user_belongs_to_org(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.user_can_access_org(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_user_org_ids(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_default_org_id() FROM anon, public;
REVOKE ALL ON FUNCTION public.is_klose_super_admin(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_org_admin_or_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_klose_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;