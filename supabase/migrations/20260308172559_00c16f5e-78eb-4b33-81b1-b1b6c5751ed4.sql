-- Announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text DEFAULT '',
  body text DEFAULT '',
  image_url text,
  video_url text,
  buttons jsonb DEFAULT '[]',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Announcement reads tracking
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own announcement reads"
ON public.announcement_reads FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Custom models table
CREATE TABLE public.custom_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model_id text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🤖',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read models"
ON public.custom_models FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage models"
ON public.custom_models FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin-uploaded plugins
CREATE TABLE public.admin_plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🔌',
  slash_command text NOT NULL,
  code text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plugins"
ON public.admin_plugins FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage plugins"
ON public.admin_plugins FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User conversations (synced from localStorage)
CREATE TABLE public.user_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id text NOT NULL,
  name text DEFAULT 'New Chat',
  model text DEFAULT 'anson67',
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
ON public.user_conversations FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all conversations"
ON public.user_conversations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User app settings (synced from localStorage)
CREATE TABLE public.user_app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  settings jsonb DEFAULT '{}',
  credits integer DEFAULT 100,
  plan text DEFAULT 'free',
  is_pro boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
ON public.user_app_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all settings"
ON public.user_app_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for announcement media
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true);

CREATE POLICY "Anyone can read announcement files"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

CREATE POLICY "Admins can upload announcement files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'announcements' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete announcement files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'announcements' AND public.has_role(auth.uid(), 'admin'));