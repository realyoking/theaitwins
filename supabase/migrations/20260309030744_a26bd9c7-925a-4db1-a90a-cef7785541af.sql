
CREATE OR REPLACE FUNCTION public.get_group_id_by_invite_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.groups WHERE invite_code = _code LIMIT 1;
$$;
