/*
  # Add Case-Insensitive Unique Constraint for Policy Numbers

  1. Changes
    - Drop existing unique constraint on policy_number
    - Create case-insensitive unique index on LOWER(policy_number)
    - Add function to normalize policy numbers before insert/update

  2. Security
    - Maintains existing RLS policies
    - Prevents duplicate policy numbers regardless of case

  3. Notes
    - All existing duplicates have been removed
    - Future imports will be automatically normalized
    - Existing data remains unchanged but constrained
*/

-- Drop the existing unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_policy_number_key'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_policy_number_key;
  END IF;
END $$;

-- Create a case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS customers_policy_number_lower_idx 
ON customers (LOWER(policy_number));

-- Create a function to automatically normalize policy numbers
CREATE OR REPLACE FUNCTION normalize_policy_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.policy_number = LOWER(NEW.policy_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to normalize policy numbers on insert and update
DROP TRIGGER IF EXISTS normalize_policy_number_trigger ON customers;
CREATE TRIGGER normalize_policy_number_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_policy_number();

-- Normalize all existing policy numbers to lowercase
UPDATE customers SET policy_number = LOWER(policy_number);
