
-- Fix overly permissive INSERT policy - notifications are created by the trigger (SECURITY DEFINER), 
-- so we restrict direct inserts to only allow inserting for yourself
DROP POLICY "Service can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
