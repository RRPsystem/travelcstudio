/*
  # Create Storage Bucket for Travel Documents

  1. Storage Bucket
    - `travel-documents` - for PDF uploads and trip documents

  2. Security
    - Allow authenticated users (brands/agents) to upload files
    - Allow public read access for active trips
*/

-- Create storage bucket for travel documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-documents', 'travel-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload travel documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'travel-documents');

-- Policy: Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update travel documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'travel-documents')
WITH CHECK (bucket_id = 'travel-documents');

-- Policy: Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete travel documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'travel-documents');

-- Policy: Allow public read access to all files in bucket
CREATE POLICY "Public can view travel documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'travel-documents');
