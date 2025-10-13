/*
  # Fix Security Issues - Part 4: Optimize Payments and Messages RLS (Corrected)

  1. Changes
    - Optimize payments table RLS policies
    - Optimize messages table RLS policies
    - Replace auth.uid() with (SELECT auth.uid())
    
  2. Security
    - Maintains existing access control
    - Performance optimization only
*/

-- Optimize payments policies
DROP POLICY IF EXISTS "Authenticated agents can insert payments" ON payments;
CREATE POLICY "Authenticated agents can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can update payments" ON payments;
CREATE POLICY "Authenticated admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated admins can delete payments" ON payments;
CREATE POLICY "Authenticated admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins have full access to payments" ON payments;
CREATE POLICY "Super admins have full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );

-- Optimize messages policies (using correct column names: sender_id, recipient_id)
DROP POLICY IF EXISTS "Authenticated users can read their messages" ON messages;
CREATE POLICY "Authenticated users can read their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id::text IN (
      SELECT 'agent-' || id::text FROM agents WHERE auth_user_id = (SELECT auth.uid())
      UNION
      SELECT 'admin-' || id::text FROM admins WHERE auth_user_id = (SELECT auth.uid())
    )
    OR
    recipient_id::text IN (
      SELECT 'agent-' || id::text FROM agents WHERE auth_user_id = (SELECT auth.uid())
      UNION
      SELECT 'admin-' || id::text FROM admins WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id::text IN (
      SELECT 'agent-' || id::text FROM agents WHERE auth_user_id = (SELECT auth.uid())
      UNION
      SELECT 'admin-' || id::text FROM admins WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update their messages" ON messages;
CREATE POLICY "Authenticated users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id::text IN (
      SELECT 'agent-' || id::text FROM agents WHERE auth_user_id = (SELECT auth.uid())
      UNION
      SELECT 'admin-' || id::text FROM admins WHERE auth_user_id = (SELECT auth.uid())
    )
    OR
    recipient_id::text IN (
      SELECT 'agent-' || id::text FROM agents WHERE auth_user_id = (SELECT auth.uid())
      UNION
      SELECT 'admin-' || id::text FROM admins WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins have full access to messages" ON messages;
CREATE POLICY "Super admins have full access to messages"
  ON messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND is_super_admin = true
    )
  );
