CREATE OR REPLACE FUNCTION public.activate_attorney_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); c public.counsel;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.counsel WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('attorney', null); END IF;

  IF c.status = 'invited' AND c.is_active THEN
    UPDATE public.counsel
       SET status = 'active', activated_at = COALESCE(activated_at, now()), updated_at = now()
     WHERE id = c.id
     RETURNING * INTO c;
  END IF;

  RETURN jsonb_build_object(
    'attorney', jsonb_build_object(
      'id', c.id,
      'attorney_name', c.attorney_name,
      'status', c.status,
      'firm_id', c.firm_id,
      'is_firm_admin', c.is_firm_admin
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.activate_attorney_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_attorney_account() TO authenticated;