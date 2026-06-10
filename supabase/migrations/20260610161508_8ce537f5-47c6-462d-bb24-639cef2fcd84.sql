
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT client_id FROM public.profiles WHERE id = _user_id);
END;
$$;

DROP POLICY IF EXISTS "Clients can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view own visible documents" ON storage.objects;

CREATE POLICY "Clients can view own visible documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.cases c ON c.id = d.case_id
    WHERE d.file_path = storage.objects.name
      AND d.visible_to_client = true
      AND c.client_id = public.get_user_client_id(auth.uid())
  )
);
