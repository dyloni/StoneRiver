/*
  # Add Contact Fields to Agents Table

  1. Changes
    - Add `id_number` column to store agent's national ID
    - Add `phone` column to store agent's phone number
    - Add `street_address` column to store agent's physical address
    - Add `town` column to store agent's town/city
    - Add `postal_address` column to store agent's postal address

  2. Notes
    - All fields are nullable initially to avoid breaking existing records
    - Phone and ID number are common requirements for agent management
    - Address fields follow the same pattern as customers table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'id_number'
  ) THEN
    ALTER TABLE agents ADD COLUMN id_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'phone'
  ) THEN
    ALTER TABLE agents ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE agents ADD COLUMN street_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'town'
  ) THEN
    ALTER TABLE agents ADD COLUMN town text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'postal_address'
  ) THEN
    ALTER TABLE agents ADD COLUMN postal_address text DEFAULT '';
  END IF;
END $$;
