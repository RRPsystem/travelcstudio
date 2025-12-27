/*
  # Fix Brand Trip Assignment Delete Policy
  
  ## Probleem
  Brands kunnen hun trip assignments niet verwijderen als de status 'accepted' is.
  De huidige policy staat alleen 'pending' en 'rejected' toe.
  
  ## Oplossing
  Breid de delete policy uit zodat brands ook 'accepted' assignments kunnen verwijderen.
  Alleen 'mandatory' assignments blijven beschermd.
  
  ## Security
  - Brands kunnen alleen hun eigen assignments verwijderen
  - Mandatory assignments blijven beschermd
  - Admins kunnen nog steeds alles verwijderen
*/

-- Drop de bestaande policy
DROP POLICY IF EXISTS "Brands can delete trip assignments" ON trip_brand_assignments;

-- Maak nieuwe policy die ook 'accepted' toestaat
CREATE POLICY "Brands can delete trip assignments"
  ON trip_brand_assignments FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT users.brand_id
      FROM users
      WHERE users.id = auth.uid()
    )
    AND status IN ('pending', 'rejected', 'accepted')
  );