
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create notification on group message for all members except sender
CREATE OR REPLACE FUNCTION public.notify_group_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_name TEXT;
  _member RECORD;
BEGIN
  SELECT name INTO _group_name FROM public.groups WHERE id = NEW.group_id;
  FOR _member IN SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id AND user_id != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000')
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (_member.user_id, 'New message in ' || _group_name, LEFT(NEW.content, 100), 'group_message', '/group/' || NEW.group_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_message_notify
  AFTER INSERT ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_message();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
