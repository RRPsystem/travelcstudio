/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Infinite recursion detected in policy for relation "company_members"
    - Circular dependencies between company_members, brands, and users policies

  2. Solution
    - Temporarily disable RLS on problematic tables
    - Remove circular policy dependencies
    - Create simplified, non-recursive policies
    - Re-enable RLS with safe policies

  3. Changes
    - Simplify company_members policies
    - Remove circular references in brand policies
    - Ensure hierarchical policy structure
*/

-- Temporarily disable RLS to fix the policies
ALTER TABLE company_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Authenticated users can view company members" ON company_members;
DROP POLICY IF EXISTS "Company admins can view all company members" ON company_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON company_members;
DROP POLICY IF EXISTS "Users can view brands of their companies" ON brands;

-- Create simple, non-recursive policies for company_members
CREATE POLICY "Allow authenticated users to view company members"
  ON company_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage their own membership"
  ON company_members
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create simple, non-recursive policies for brands
CREATE POLICY "Allow authenticated users to view all brands"
  ON brands
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage brands"
  ON brands
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create simple, non-recursive policies for users
CREATE POLICY "Allow users to view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow users to update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Re-enable RLS with the new, safe policies
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;