/*
  # Fix Agent RLS Policies for Authenticated Users

  1. Changes
    - Add RLS policies for authenticated role on agents table
    - Allow authenticated users to read their own agent profile
    - Allow authenticated users with admin role to manage all agents

  2. Security
    - Agents can only read their own profile
    - Admins can perform all operations on agents table
*/

CREATE POLICY "Authenticated users can read their own agent profile"
  ON agents FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can read all agents"
  ON agents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );
