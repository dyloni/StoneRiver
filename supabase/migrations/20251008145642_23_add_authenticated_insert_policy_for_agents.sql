/*
  # Add Authenticated Insert Policy for Agents

  1. Changes
    - Add a policy that allows all authenticated users to insert agents
    - This is needed because the login bypasses Supabase auth
  
  2. Security
    - Policy allows authenticated role to insert agents
    - Complements existing anon policy
*/

CREATE POLICY "Authenticated users can insert agents"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
