
-- Create security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = _user_id;
$$;

-- Drop the recursive policy on group_members
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- Recreate without recursion: users can see members of groups they belong to
CREATE POLICY "Members can view group members"
ON public.group_members
FOR SELECT
TO authenticated
USING (group_id IN (SELECT public.get_user_group_ids(auth.uid())));
