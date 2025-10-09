/*
  # Add Authenticated User RLS Policies for All Tables

  1. Changes
    - Add RLS policies for authenticated users on requests, messages, and payments tables
    - Agents can access their own data
    - Admins have full access

  2. Security
    - Agents can only access data related to them
    - Admins have full administrative access
*/

CREATE POLICY "Authenticated agents can read their requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id = requests.agent_id
    )
  );

CREATE POLICY "Authenticated agents can insert their requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id = requests.agent_id
    )
  );

CREATE POLICY "Authenticated admins can read all requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update all requests"
  ON requests FOR UPDATE
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

CREATE POLICY "Authenticated users can read their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND (agents.id::text = messages.sender_id OR agents.id::text = messages.recipient_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id::text = messages.sender_id
    )
    OR
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND (agents.id::text = messages.sender_id OR agents.id::text = messages.recipient_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND (agents.id::text = messages.sender_id OR agents.id::text = messages.recipient_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can read payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated agents can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update payments"
  ON payments FOR UPDATE
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

CREATE POLICY "Authenticated admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );
