/*
  # Restore Unique Constraint on Policy Number

  1. Changes
    - Add back unique constraint on policy_number column
    - Keep the trigger for normalization
    - This allows upsert operations to work properly

  2. Notes
    - The trigger ensures all policy numbers are lowercase
    - The unique constraint prevents duplicates
    - This is compatible with Supabase upsert operations
*/

-- Add unique constraint back (now that all values are normalized to lowercase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_policy_number_key'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_policy_number_key UNIQUE (policy_number);
  END IF;
END $$;
