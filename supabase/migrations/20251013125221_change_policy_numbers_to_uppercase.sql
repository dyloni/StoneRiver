/*
  # Change Policy Numbers to Uppercase

  1. Changes
    - Update trigger to normalize policy numbers to uppercase instead of lowercase
    - Convert all existing policy numbers to uppercase
    - Maintain unique constraint for duplicate prevention

  2. Security
    - Maintains existing RLS policies
    - Prevents duplicates regardless of case

  3. Notes
    - Case-insensitive uniqueness is still enforced via trigger
    - Display format will now be uppercase
*/

-- Update the normalization function to use uppercase
CREATE OR REPLACE FUNCTION normalize_policy_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.policy_number = UPPER(NEW.policy_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Convert all existing policy numbers to uppercase
UPDATE customers SET policy_number = UPPER(policy_number);
