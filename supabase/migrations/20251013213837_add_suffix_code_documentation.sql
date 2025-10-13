/*
  # Add Suffix Code Documentation and Validation

  ## Overview
  This migration documents the suffix code system used for participant identification
  and ensures the database schema properly supports suffix codes.

  ## Suffix Code System
  
  ### Base Numbers by Relationship Type:
  - **Principal Member (Policy Holder)**: Always `000`
  - **Spouse**: Starts at `101` (100 + order number)
    - First Spouse: 101
    - Second Spouse: 102 (if applicable)
  - **Child**: Starts at `201` (200 + order number)
    - First Child: 201
    - Second Child: 202
    - Third Child: 203, etc.
  - **Dependent**: Starts at `301` (300 + order number)
    - First Dependent: 301
    - Second Dependent: 302
    - Third Dependent: 303, etc.

  ## Examples
  
  ### Example 1: Nuclear Family
  - John Doe (Principal): 000
  - Jane Doe (Spouse): 101
  - Michael Doe (Child): 201
  - Sarah Doe (Child): 202

  ### Example 2: Extended Family
  - Mary Smith (Principal): 000
  - Robert Smith (Spouse): 101
  - Lisa Smith (Child): 201
  - Peter Smith (Child): 202
  - Anna Smith (Grandparent): 301

  ## Implementation Notes
  
  The suffix codes are:
  1. Auto-generated when participants are added
  2. Stored in the participants JSONB array in the customers table
  3. Used to create unique identifiers (Policy Number + Suffix)
  4. Display format: `SR-2024-001-201` (Policy + Suffix)
  
  ## No Schema Changes Required
  
  The current database schema already supports suffix codes through:
  - `customers.participants` JSONB field includes `suffix` property
  - Suffix codes are generated at application level
  - No additional columns or tables needed
*/

-- This migration is documentation-only
-- Suffix codes are managed at the application level
-- The customers.participants JSONB field already supports the suffix property

-- Verify customers table exists with participants column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'participants'
  ) THEN
    RAISE EXCEPTION 'customers.participants column does not exist';
  END IF;
END $$;

-- Add a comment to the customers table documenting the suffix code system
COMMENT ON COLUMN customers.participants IS 
'JSONB array of participants. Each participant includes a suffix code:
- Principal Member: 000
- Spouse: 101, 102, ...
- Child: 201, 202, 203, ...
- Dependent: 301, 302, 303, ...
The suffix is combined with the policy number to create unique identifiers.';
