CREATE TABLE public.hymns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  verses JSONB NOT NULL DEFAULT '[]'::jsonb,
  repeat_structure JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hymns TO authenticated;
GRANT ALL ON public.hymns TO service_role;
ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own hymns" ON public.hymns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX hymns_user_id_idx ON public.hymns(user_id);