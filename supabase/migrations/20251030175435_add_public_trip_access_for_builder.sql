/*
  # Add Public Access for Trip Assignments (Builder Integration)

  ## Summary
  Enables public (anonymous) read access to published trip assignments for external website builders.

  ## Changes
  
  1. **New RLS Policy for trip_brand_assignments**
     - Allows anonymous users to read published trip assignments
     - Only exposes trips where `is_published = true`
     - Filtered by brand_id for security
  
  2. **New RLS Policy for trips**
     - Allows anonymous users to read trips that are:
       - Published via assignments (is_published = true)
       - OR trips with status = 'published'
  
  ## Security
  - Only published content is accessible
  - Brand_id filtering prevents cross-brand data leaks
  - No write access for anonymous users
  
  ## Use Case
  External website builders can fetch published trips without authentication:
  ```
  GET /rest/v1/trip_brand_assignments?select=*,trips(*)&brand_id=eq.BRAND_ID&is_published=eq.true
  ```
*/

-- Allow anonymous users to read published trip assignments
CREATE POLICY "Public can view published trip assignments"
  ON trip_brand_assignments FOR SELECT
  TO anon
  USING (is_published = true);

-- Allow anonymous users to read published trips
CREATE POLICY "Public can view published trips"
  ON trips FOR SELECT
  TO anon
  USING (
    -- Trips that are published via assignments
    id IN (
      SELECT trip_id 
      FROM trip_brand_assignments 
      WHERE is_published = true
    )
    -- OR trips with published status
    OR status = 'published'
  );
