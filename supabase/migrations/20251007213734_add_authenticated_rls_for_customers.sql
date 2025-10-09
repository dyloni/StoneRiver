/*
  # Add Authenticated User RLS Policies for Customers Table

  1. Changes
    - Add RLS policies for authenticated users on customers table
    - Agents can read customers assigned to them
    - Agents can update customers assigned to them
    - Admins can perform all operations on customers table

  2. Security
    - Agents can only access their own customers
    - Admins have full access to all customers
*/

CREATE POLICY "Authenticated agents can read their customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id = customers.assigned_agent_id
    )
  );

CREATE POLICY "Authenticated agents can update their customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id = customers.assigned_agent_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id = customers.assigned_agent_id
    )
  );

CREATE POLICY "Authenticated agents can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id = customers.assigned_agent_id
    )
  );

CREATE POLICY "Authenticated admins can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update all customers"
  ON customers FOR UPDATE
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

CREATE POLICY "Authenticated admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );
