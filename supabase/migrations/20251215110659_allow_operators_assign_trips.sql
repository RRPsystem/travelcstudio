/*
  # Allow Operators to Assign Trips
  
  Operators (zoals tour operators) kunnen nu hun eigen reizen toewijzen aan andere brands
  via trip_brand_assignments. Dit is nodig voor het WordPress multisite scenario.
  
  ## Changes
  - Nieuwe INSERT policy voor operators om hun eigen trips toe te wijzen
  - Nieuwe SELECT policy voor operators om hun eigen assignments te zien
  - Operators kunnen alleen trips van hun eigen brand toewijzen
  
  ## Security
  - Operators kunnen alleen assignments maken voor trips van hun eigen brand
  - Operators kunnen hun eigen assignments bekijken (maar niet die van andere brands)
*/

-- Allow operators to create trip assignments for their own trips
CREATE POLICY "Operators can assign their own trips to brands"
  ON trip_brand_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    trip_id IN (
      SELECT t.id 
      FROM trips t
      JOIN users u ON u.brand_id = t.brand_id
      WHERE u.id = auth.uid() 
      AND u.role = 'operator'
    )
  );

-- Allow operators to view assignments they created
CREATE POLICY "Operators can view their trip assignments"
  ON trip_brand_assignments FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT t.id 
      FROM trips t
      JOIN users u ON u.brand_id = t.brand_id
      WHERE u.id = auth.uid() 
      AND u.role = 'operator'
    )
  );

-- Allow operators to update/delete their own assignments (before acceptance)
CREATE POLICY "Operators can update their trip assignments"
  ON trip_brand_assignments FOR UPDATE
  TO authenticated
  USING (
    trip_id IN (
      SELECT t.id 
      FROM trips t
      JOIN users u ON u.brand_id = t.brand_id
      WHERE u.id = auth.uid() 
      AND u.role = 'operator'
    )
    AND status = 'pending'
  )
  WITH CHECK (
    trip_id IN (
      SELECT t.id 
      FROM trips t
      JOIN users u ON u.brand_id = t.brand_id
      WHERE u.id = auth.uid() 
      AND u.role = 'operator'
    )
  );

CREATE POLICY "Operators can delete their trip assignments"
  ON trip_brand_assignments FOR DELETE
  TO authenticated
  USING (
    trip_id IN (
      SELECT t.id 
      FROM trips t
      JOIN users u ON u.brand_id = t.brand_id
      WHERE u.id = auth.uid() 
      AND u.role = 'operator'
    )
    AND status = 'pending'
  );
