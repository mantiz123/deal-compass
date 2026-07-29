DROP POLICY IF EXISTS "Authenticated users can list property images" ON storage.objects;

CREATE POLICY "Members list property images of their orgs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM public.property_images pi
    WHERE pi.file_path = storage.objects.name
      AND public.user_can_access_org(auth.uid(), pi.organization_id)
  )
);