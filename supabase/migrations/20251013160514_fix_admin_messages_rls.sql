/*
  # Fix Admin Messages RLS Policies
  
  1. Changes
    - Update authenticated messages policies to properly handle admin users
    - Admin sender_id is 'admin', not their numeric ID
    - Allow admins to send and receive messages with 'admin' as their ID
    
  2. Security
    - Agents can only access their own messages
    - Admins can access all messages
    - Maintains proper authentication checks
*/

DROP POLICY IF EXISTS "Authenticated users can read their messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update their messages" ON messages;

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
      AND (messages.sender_id = 'admin' OR messages.recipient_id = 'admin' OR messages.recipient_id = 'broadcast')
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
      AND messages.sender_id = 'admin'
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