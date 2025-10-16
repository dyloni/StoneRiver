/*
  # Add Contact Fields to Admins Table

  1. Changes
    - Add `id_number` column to store admin's national ID
    - Add `phone` column to store admin's phone number
    - Add `street_address` column to store admin's physical address
    - Add `town` column to store admin's town/city
    - Add `postal_address` column to store admin's postal address

  2. Notes
    - All fields are nullable initially to avoid breaking existing records
    - Phone and ID number are common requirements for admin management
    - Address fields follow the same pattern as customers table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'id_number'
  ) THEN
    ALTER TABLE admins ADD COLUMN id_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'phone'
  ) THEN
    ALTER TABLE admins ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE admins ADD COLUMN street_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'town'
  ) THEN
    ALTER TABLE admins ADD COLUMN town text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'postal_address'
  ) THEN
    ALTER TABLE admins ADD COLUMN postal_address text DEFAULT '';
  END IF;
END $$;
