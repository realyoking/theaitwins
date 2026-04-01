
INSERT INTO storage.buckets (id, name, public) VALUES ('group_files', 'group_files', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can read group files" ON storage.objects FOR SELECT USING (bucket_id = 'group_files');
CREATE POLICY "Auth users can upload group files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'group_files');
