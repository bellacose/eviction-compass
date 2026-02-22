CREATE POLICY "Authenticated users can read case documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'case-documents');