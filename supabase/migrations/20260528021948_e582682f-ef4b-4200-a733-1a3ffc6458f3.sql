
-- 1. case_counsel & counsel: scope to authenticated
DROP POLICY IF EXISTS "Admins full access case_counsel" ON public.case_counsel;
DROP POLICY IF EXISTS "Clients view own case_counsel" ON public.case_counsel;
CREATE POLICY "Admins full access case_counsel" ON public.case_counsel
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Clients view own case_counsel" ON public.case_counsel
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM cases c WHERE c.id = case_counsel.case_id AND c.client_id = get_user_client_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins full access counsel" ON public.counsel;
DROP POLICY IF EXISTS "Clients view active counsel on their cases" ON public.counsel;
CREATE POLICY "Admins full access counsel" ON public.counsel
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Clients view active counsel on their cases" ON public.counsel
  FOR SELECT TO authenticated USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM case_counsel cc JOIN cases c ON c.id = cc.case_id
      WHERE cc.counsel_id = counsel.id AND c.client_id = get_user_client_id(auth.uid())
    )
  );

-- 2. Storage: remove overly broad read policy
DROP POLICY IF EXISTS "Authenticated users can read case documents" ON storage.objects;

-- 3. system_settings: restrict reads to admins
DROP POLICY IF EXISTS "Anyone can read settings" ON public.system_settings;
CREATE POLICY "Admins can read settings" ON public.system_settings
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 4. tenants: extend visibility via case_tenants
DROP POLICY IF EXISTS "Clients view tenants on their cases" ON public.tenants;
CREATE POLICY "Clients view tenants on their cases" ON public.tenants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.client_id = get_user_client_id(auth.uid())
        AND (
          c.primary_tenant_id = tenants.id
          OR EXISTS (SELECT 1 FROM case_tenants ct WHERE ct.case_id = c.id AND ct.tenant_id = tenants.id)
        )
    )
  );
