/*
  # Fix typing indicators RLS policies

  1. Changes
    - Drop and recreate INSERT policy with WITH CHECK clause
    - Ensure anon users can insert typing indicators

  2. Security
    - Maintain RLS protection while allowing inserts
*/

DROP POLICY IF EXISTS "Allow anon to insert typing_indicators" ON typing_indicators;

CREATE POLICY "Allow anon to insert typing_indicators"
  ON typing_indicators
  FOR INSERT
  TO anon
  WITH CHECK (true);
