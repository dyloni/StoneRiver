/*
  # Add Hybrid Product Support and Suspended Policy Status

  1. Changes to Tables
    - `customers`
      - Add `is_hybrid_product` (boolean, default false)
      - Add `hybrid_enrollment_date` (date, nullable)
      - Add `is_new_bank_account_holder` (boolean, nullable)
    
    - `payments`
      - Add `is_legacy_receipt` (boolean, default false)
      - Add `legacy_receipt_notes` (text, nullable)
  
  2. Notes
    - Suspended status already exists in PolicyStatus enum
    - Hybrid product tracking allows identification of customers enrolled in banking integration
    - Legacy receipt flag preserves historical payment records
    - All new columns are optional to maintain backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_hybrid_product'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_hybrid_product boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'hybrid_enrollment_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN hybrid_enrollment_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_new_bank_account_holder'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_new_bank_account_holder boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_legacy_receipt'
  ) THEN
    ALTER TABLE payments ADD COLUMN is_legacy_receipt boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'legacy_receipt_notes'
  ) THEN
    ALTER TABLE payments ADD COLUMN legacy_receipt_notes text;
  END IF;
END $$;