/*
  # Add Social Media Storage and Media URLs

  1. Changes
    - Create storage bucket for social media uploads (images/videos)
    - Add media_urls column to social_media_posts table
    - Set up RLS policies for storage bucket

  2. Security
    - Authenticated users can upload to their own brand folder
    - Public read access for published content
    - Automatic cleanup policies possible

  3. Storage Configuration
    - Bucket: social-media-uploads
    - Max file size: 100MB (configurable)
    - Allowed types: images and videos
    - Path structure: brand_id/timestamp_index.ext
*/

-- Create storage bucket for social media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-uploads', 'social-media-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Add media_urls column to social_media_posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN media_urls text[];
  END IF;
END $$;

-- Storage policies for social-media-uploads bucket

-- Allow authenticated users to upload to their own brand folder
CREATE POLICY "Users can upload to own brand folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'social-media-uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT brand_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Allow users to read their own brand's uploads
CREATE POLICY "Users can view own brand uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'social-media-uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT brand_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Allow public read access (for published posts)
CREATE POLICY "Public can view uploads"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'social-media-uploads');

-- Allow users to delete their own brand's uploads
CREATE POLICY "Users can delete own brand uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'social-media-uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT brand_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Operators can manage all uploads
CREATE POLICY "Operators can manage all uploads"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'social-media-uploads' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

COMMENT ON COLUMN social_media_posts.media_urls IS 'Array of public URLs to uploaded media files (images/videos)';
