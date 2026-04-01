
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.group_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_type text;
