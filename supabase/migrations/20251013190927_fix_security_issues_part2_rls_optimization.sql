/*
  # Fix Security Issues - Part 2: Optimize RLS Policies

  1. Changes
    - Replace auth.uid() with (SELECT auth.uid()) in all RLS policies
    - This prevents re-evaluation for each row, improving performance at scale
    
  2. Security
    - No security changes, only performance optimization
    - All policies maintain the same logic and access control
*/

-- Drop and recreate admins policies with optimized auth calls
DROP POLICY IF EXISTS "Admins can update own profile" ON admins;
CREATE POLICY "Admins can update own profile"
  ON admins FOR UPDATE
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can create admins" ON admins;
CREATE POLICY "Super admins can create admins"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update any admin" ON admins;
CREATE POLICY "Super admins can update any admin"
  ON admins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can delete admins" ON admins;
CREATE POLICY "Super admins can delete admins"
  ON admins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize agents policies
DROP POLICY IF EXISTS "Authenticated users can read their own agent profile" ON agents;
CREATE POLICY "Authenticated users can read their own agent profile"
  ON agents FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can read all agents" ON agents;
CREATE POLICY "Admins can read all agents"
  ON agents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert agents" ON agents;
CREATE POLICY "Admins can insert agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update agents" ON agents;
CREATE POLICY "Admins can update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can delete agents" ON agents;
CREATE POLICY "Admins can delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can create agents" ON agents;
CREATE POLICY "Super admins can create agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update any agent" ON agents;
CREATE POLICY "Super admins can update any agent"
  ON agents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can delete agents" ON agents;
CREATE POLICY "Super admins can delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );
