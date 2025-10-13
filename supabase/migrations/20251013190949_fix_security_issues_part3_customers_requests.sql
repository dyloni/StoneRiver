/*
  # Fix Security Issues - Part 3: Optimize Customers and Requests RLS

  1. Changes
    - Optimize customers table RLS policies
    - Optimize requests table RLS policies
    - Replace auth.uid() with (SELECT auth.uid())
    
  2. Security
    - Maintains existing access control
    - Performance optimization only
*/

-- Optimize customers policies
DROP POLICY IF EXISTS "Authenticated agents can read their customers" ON customers;
CREATE POLICY "Authenticated agents can read their customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    assigned_agent_id IN (
      SELECT id FROM agents 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated agents can update their customers" ON customers;
CREATE POLICY "Authenticated agents can update their customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    assigned_agent_id IN (
      SELECT id FROM agents 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated agents can insert customers" ON customers;
CREATE POLICY "Authenticated agents can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_agent_id IN (
      SELECT id FROM agents 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can read all customers" ON customers;
CREATE POLICY "Authenticated admins can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can update all customers" ON customers;
CREATE POLICY "Authenticated admins can update all customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can insert customers" ON customers;
CREATE POLICY "Authenticated admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can delete customers" ON customers;
CREATE POLICY "Authenticated admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins have full access to customers" ON customers;
CREATE POLICY "Super admins have full access to customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize requests policies
DROP POLICY IF EXISTS "Authenticated agents can read their requests" ON requests;
CREATE POLICY "Authenticated agents can read their requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated agents can insert their requests" ON requests;
CREATE POLICY "Authenticated agents can insert their requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can read all requests" ON requests;
CREATE POLICY "Authenticated admins can read all requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can update all requests" ON requests;
CREATE POLICY "Authenticated admins can update all requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins have full access to requests" ON requests;
CREATE POLICY "Super admins have full access to requests"
  ON requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );
