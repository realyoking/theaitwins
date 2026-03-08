
-- Allow admins to insert notifications for any user
CREATE POLICY "Admins can insert notifications for any user"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role / triggers to insert notifications (for @mention notifications)
-- We need a function that inserts notifications as security definer
CREATE OR REPLACE FUNCTION public.insert_mention_notification(
  _user_id uuid,
  _title text,
  _body text,
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (_user_id, _title, _body, 'mention', _link);
END;
$$;
