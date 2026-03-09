-- Add avatar_url column to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create policy for owners to update their groups
CREATE POLICY "Owners can update groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'owner'
  )
);

-- Create policy for owners to delete their groups
CREATE POLICY "Owners can delete groups"
ON public.groups
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'owner'
  )
);

-- Create storage bucket for group avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('group_avatars', 'group_avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload group avatars
CREATE POLICY "Group owners can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group_avatars' AND
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id::text = (storage.foldername(name))[1]
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'owner'
  )
);

-- Allow public read access to group avatars
CREATE POLICY "Anyone can view group avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'group_avatars');

-- Allow owners to delete group avatars
CREATE POLICY "Group owners can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'group_avatars' AND
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id::text = (storage.foldername(name))[1]
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'owner'
  )
);