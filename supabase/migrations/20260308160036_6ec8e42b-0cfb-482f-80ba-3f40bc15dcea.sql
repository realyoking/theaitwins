
-- Voice room state for groups
CREATE TABLE public.voice_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  active boolean DEFAULT false,
  started_at timestamptz DEFAULT now()
);
ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.voice_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_muted boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (room_id, user_id)
);
ALTER TABLE public.voice_participants ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Members can view voice rooms" ON public.voice_rooms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = voice_rooms.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Members can manage voice rooms" ON public.voice_rooms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = voice_rooms.group_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Members can view participants" ON public.voice_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.voice_rooms vr JOIN public.group_members gm ON gm.group_id = vr.group_id WHERE vr.id = voice_participants.room_id AND gm.user_id = auth.uid()));
CREATE POLICY "Users can join/leave" ON public.voice_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON public.voice_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own" ON public.voice_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_participants;
