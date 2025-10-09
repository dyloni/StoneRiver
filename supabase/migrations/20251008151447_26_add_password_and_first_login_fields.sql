/*
  # Add Password and First Login Fields

  1. Changes
    - Add `password` field to agents table
    - Add `password` field to admins table
    - Add `requires_password_change` field to agents table
    - Add `requires_password_change` field to admins table
    - Set default password to 'Stoneriver@#12' for all users
    - Set requires_password_change to true by default
  
  2. Security
    - Password is stored as plain text for now (will be hashed in production)
    - Users must change password on first login
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'password'
  ) THEN
    ALTER TABLE agents ADD COLUMN password TEXT DEFAULT 'Stoneriver@#12';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'requires_password_change'
  ) THEN
    ALTER TABLE agents ADD COLUMN requires_password_change BOOLEAN DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'password'
  ) THEN
    ALTER TABLE admins ADD COLUMN password TEXT DEFAULT 'Stoneriver@#12';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admins' AND column_name = 'requires_password_change'
  ) THEN
    ALTER TABLE admins ADD COLUMN requires_password_change BOOLEAN DEFAULT true;
  END IF;
END $$;

UPDATE agents SET password = 'Stoneriver@#12', requires_password_change = true WHERE password IS NULL;
UPDATE admins SET password = 'Stoneriver@#12', requires_password_change = true WHERE password IS NULL;
