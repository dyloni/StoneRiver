/*
  # Add Agent Status Field

  1. Changes
    - Add `status` column to `agents` table
      - Type: text with check constraint
      - Values: 'active', 'suspended', 'deactivated'
      - Default: 'active'
      - Not null
    
  2. Notes
    - Existing agents will default to 'active' status
    - Status controls agent access and visibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'status'
  ) THEN
    ALTER TABLE agents ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
    
    ALTER TABLE agents ADD CONSTRAINT agents_status_check 
      CHECK (status IN ('active', 'suspended', 'deactivated'));
  END IF;
END $$;
