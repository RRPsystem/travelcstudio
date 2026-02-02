-- Create storage bucket for destination images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'destination-images',
  'destination-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for destination images"
ON storage.objects FOR SELECT
USING (bucket_id = 'destination-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload destination images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'destination-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete destination images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'destination-images');
