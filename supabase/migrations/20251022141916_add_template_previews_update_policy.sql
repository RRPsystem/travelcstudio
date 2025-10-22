/*
  # Add UPDATE policy for template previews storage

  1. Storage Policy
    - Allow authenticated users to update files in template-previews bucket
    
  2. Security
    - Only authenticated users can update
    - Limited to template-previews bucket
*/

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Authenticated users can update template previews" ON storage.objects;

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update template previews"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'template-previews')
WITH CHECK (bucket_id = 'template-previews');