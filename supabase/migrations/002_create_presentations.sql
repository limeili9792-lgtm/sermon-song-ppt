CREATE TABLE presentations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  note        text,
  file_path   text NOT NULL,
  creator     text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON presentations FOR ALL USING (true);

-- Disable RLS for presentations (same as hymns)
ALTER TABLE presentations DISABLE ROW LEVEL SECURITY;
