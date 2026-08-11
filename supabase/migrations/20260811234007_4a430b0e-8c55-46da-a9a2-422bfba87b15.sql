CREATE POLICY "auth users read deal documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deal-documents');
CREATE POLICY "auth users upload deal documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deal-documents');
CREATE POLICY "auth users update deal documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'deal-documents');
CREATE POLICY "auth users delete deal documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deal-documents');