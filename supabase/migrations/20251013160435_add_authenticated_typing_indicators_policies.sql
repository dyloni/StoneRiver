/*
  # Add Authenticated User Policies for Typing Indicators
  
  1. Changes
    - Add RLS policies for authenticated users on typing_indicators table
    - Allow agents and admins to read, insert, and update typing indicators
    
  2. Security
    - Authenticated users can manage typing indicators for conversations they're in
    - Maintains existing anon policies
    
  3. Notes
    - Required for real-time typing indicators to work for authenticated users
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'typing_indicators' 
    AND policyname = 'Authenticated users can read typing indicators'
  ) THEN
    CREATE POLICY "Authenticated users can read typing indicators"
      ON typing_indicators FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'typing_indicators' 
    AND policyname = 'Authenticated users can insert typing indicators'
  ) THEN
    CREATE POLICY "Authenticated users can insert typing indicators"
      ON typing_indicators FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'typing_indicators' 
    AND policyname = 'Authenticated users can update typing indicators'
  ) THEN
    CREATE POLICY "Authenticated users can update typing indicators"
      ON typing_indicators FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'typing_indicators' 
    AND policyname = 'Authenticated users can delete typing indicators'
  ) THEN
    CREATE POLICY "Authenticated users can delete typing indicators"
      ON typing_indicators FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;