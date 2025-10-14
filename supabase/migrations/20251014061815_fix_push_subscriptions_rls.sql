/*
  # Fix Push Subscriptions RLS Policies

  1. Security Issue
    - Current policies use `USING (true)` allowing any authenticated user to access all subscriptions
    - This is a critical security vulnerability

  2. Changes
    - Drop existing insecure policies
    - Create new restrictive policies that check user_id and user_type
    - Agents can only access their own subscriptions
    - Admins can only access their own subscriptions
    - Service role can access all for sending notifications

  3. Security
    - Users can only view/modify their own push subscriptions
    - Proper authentication and ownership checks enforced
*/

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;

-- Create secure policies for SELECT
CREATE POLICY "Authenticated users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (
    (user_type = 'agent' AND user_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    ))
    OR
    (user_type = 'admin' AND user_id IN (
      SELECT id FROM admins WHERE auth_user_id = auth.uid()
    ))
  );

-- Create secure policies for INSERT
CREATE POLICY "Authenticated users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_type = 'agent' AND user_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    ))
    OR
    (user_type = 'admin' AND user_id IN (
      SELECT id FROM admins WHERE auth_user_id = auth.uid()
    ))
  );

-- Create secure policies for UPDATE
CREATE POLICY "Authenticated users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (
    (user_type = 'agent' AND user_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    ))
    OR
    (user_type = 'admin' AND user_id IN (
      SELECT id FROM admins WHERE auth_user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (user_type = 'agent' AND user_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    ))
    OR
    (user_type = 'admin' AND user_id IN (
      SELECT id FROM admins WHERE auth_user_id = auth.uid()
    ))
  );

-- Create secure policies for DELETE
CREATE POLICY "Authenticated users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (
    (user_type = 'agent' AND user_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    ))
    OR
    (user_type = 'admin' AND user_id IN (
      SELECT id FROM admins WHERE auth_user_id = auth.uid()
    ))
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_lookup 
  ON push_subscriptions(user_id, user_type);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
  ON push_subscriptions(endpoint);
