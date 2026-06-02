CREATE TABLE hymns (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  title       text NOT NULL,
  verses      jsonb NOT NULL DEFAULT '[]',
  repeat_structure jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE hymns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own hymns" ON hymns
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_hymns_user_id ON hymns(user_id);
