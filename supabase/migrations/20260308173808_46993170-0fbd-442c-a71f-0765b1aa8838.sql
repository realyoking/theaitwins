
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth users update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Auth users delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- Fix announcement RLS policies to be PERMISSIVE (default) instead of RESTRICTIVE
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
CREATE POLICY "Anyone can read active announcements" ON public.announcements FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix announcement_reads policies
DROP POLICY IF EXISTS "Users can manage own announcement reads" ON public.announcement_reads;
CREATE POLICY "Users can manage own announcement reads" ON public.announcement_reads FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix admin_settings policy
DROP POLICY IF EXISTS "Only admins" ON public.admin_settings;
CREATE POLICY "Only admins" ON public.admin_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to READ admin_settings (for global prompts)
CREATE POLICY "Anyone can read admin settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);

-- Fix custom_models policies
DROP POLICY IF EXISTS "Anyone can read models" ON public.custom_models;
CREATE POLICY "Anyone can read models" ON public.custom_models FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage models" ON public.custom_models;
CREATE POLICY "Admins can manage models" ON public.custom_models FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix admin_plugins policies
DROP POLICY IF EXISTS "Anyone can read plugins" ON public.admin_plugins;
CREATE POLICY "Anyone can read plugins" ON public.admin_plugins FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage plugins" ON public.admin_plugins;
CREATE POLICY "Admins can manage plugins" ON public.admin_plugins FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
