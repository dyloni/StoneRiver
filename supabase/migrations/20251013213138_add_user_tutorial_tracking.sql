/*
  # Add User Tutorial Tracking

  1. New Tables
    - `user_tutorials`
      - `id` (serial, primary key)
      - `user_id` (uuid, references auth.users)
      - `user_type` (text) - 'admin' or 'agent'
      - `completed` (boolean, default false)
      - `current_step` (integer, default 0)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_tutorials` table
    - Allow authenticated users to manage their own tutorial progress
    - Allow anon users to manage tutorial progress (for app functionality)
*/

-- Create user_tutorials table
CREATE TABLE IF NOT EXISTS user_tutorials (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'agent',
  completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read own tutorial"
  ON user_tutorials FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Allow authenticated users to insert own tutorial"
  ON user_tutorials FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

CREATE POLICY "Allow authenticated users to update own tutorial"
  ON user_tutorials FOR UPDATE
  TO authenticated
  USING (user_id = current_user)
  WITH CHECK (user_id = current_user);

CREATE POLICY "Allow anon to read tutorials"
  ON user_tutorials FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert tutorials"
  ON user_tutorials FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update tutorials"
  ON user_tutorials FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tutorials_user_id ON user_tutorials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorials_completed ON user_tutorials(completed);
