CREATE TABLE public.playground_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  code TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_projects TO authenticated;
GRANT SELECT ON public.playground_projects TO anon;
GRANT ALL ON public.playground_projects TO service_role;

ALTER TABLE public.playground_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their projects"
ON public.playground_projects FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view published projects"
ON public.playground_projects FOR SELECT
USING (published = true);