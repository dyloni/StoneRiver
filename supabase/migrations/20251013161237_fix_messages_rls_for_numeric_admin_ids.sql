/*
  # Fix Messages RLS to Handle Numeric Admin IDs
  
  1. Changes
    - Update authenticated messages policies to handle both numeric admin IDs and 'admin' string
    - Allow admins to send messages with their numeric admin ID (for backward compatibility)
    - Allow admins to send messages with 'admin' as sender_id (for future consistency)
    
  2. Security
    - Agents can only access their own messages
    - Admins can access messages where sender/recipient is their admin ID OR 'admin'
    - Maintains proper authentication checks
    
  3. Notes
    - This provides backward compatibility while allowing migration to 'admin' string
*/

DROP POLICY IF EXISTS "Authenticated users can read their messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update their messages" ON messages;

CREATE POLICY "Authenticated users can read their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- Agents can read messages they sent or received
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND (agents.id::text = messages.sender_id OR agents.id::text = messages.recipient_id)
    )
    OR
    -- Admins can read messages where they are sender/recipient (by numeric ID or 'admin' string)
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
      AND (
        messages.sender_id = 'admin' 
        OR messages.recipient_id = 'admin' 
        OR messages.recipient_id = 'broadcast'
        OR messages.sender_id = admins.id::text
        OR messages.recipient_id = admins.id::text
      )
    )
  );

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Agents can send messages with their agent ID
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND agents.id::text = messages.sender_id
    )
    OR
    -- Admins can send messages with 'admin' OR their numeric admin ID
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
      AND (messages.sender_id = 'admin' OR messages.sender_id = admins.id::text)
    )
  );

CREATE POLICY "Authenticated users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    -- Agents can update messages they sent or received
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.auth_user_id = auth.uid() 
      AND (agents.id::text = messages.sender_id OR agents.id::text = messages.recipient_id)
    )
    OR
    -- Admins can update any messages (for marking as read, etc)
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same rules for updates
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