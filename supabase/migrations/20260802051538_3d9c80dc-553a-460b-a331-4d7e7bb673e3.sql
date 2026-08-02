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
    OR EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.tenant_id = tenants.id
        AND t.client_id = get_user_client_id(auth.uid())
    )
  );