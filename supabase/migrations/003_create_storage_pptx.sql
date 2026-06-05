-- Create pptx storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('pptx', 'pptx', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'pptx');

-- Allow authenticated users to upload and delete
CREATE POLICY "Auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pptx');
CREATE POLICY "Auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'pptx');
