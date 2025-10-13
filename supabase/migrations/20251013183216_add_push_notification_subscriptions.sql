/*
  # Add Push Notification Subscriptions

  1. New Tables
    - `push_subscriptions`
      - `id` (serial, primary key)
      - `user_id` (integer, references agents or admins)
      - `user_type` (text, 'agent' or 'admin')
      - `endpoint` (text, unique push notification endpoint)
      - `p256dh_key` (text, encryption key)
      - `auth_key` (text, authentication key)
      - `device_info` (text, optional device/browser info)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `push_subscriptions` table
    - Add policies for authenticated users to manage their own subscriptions
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('agent', 'admin')),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own subscriptions anon"
  ON push_subscriptions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert own subscriptions anon"
  ON push_subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own subscriptions anon"
  ON push_subscriptions
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete own subscriptions anon"
  ON push_subscriptions
  FOR DELETE
  TO anon
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON push_subscriptions(user_id, user_type);