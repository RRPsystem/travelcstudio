/*
  # Create template previews storage bucket

  1. Storage
    - Create public bucket for template preview images
    - Allow uploads for authenticated users
    - Allow public read access for previews

  2. Security
    - Authenticated users can upload
    - Public read access
*/

-- Create storage bucket for template preview images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-previews',
  'template-previews',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload template previews" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for template previews" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete template previews" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload template previews"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'template-previews');

-- Allow public read access
CREATE POLICY "Public read access for template previews"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'template-previews');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete template previews"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'template-previews');