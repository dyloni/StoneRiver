-- Create Package Configurations Table
-- 
-- 1. New Tables
--    - package_configurations with fields for managing policy packages
-- 2. Security
--    - Enable RLS
--    - Allow public read of active packages
--    - Allow authenticated users to manage packages
-- 3. Initial Data
--    - Populate with existing package data

CREATE TABLE IF NOT EXISTS package_configurations (
  id SERIAL PRIMARY KEY,
  package_type TEXT NOT NULL CHECK (package_type IN ('funeral', 'medical', 'cashback')),
  package_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  sum_assured NUMERIC DEFAULT 0,
  payout NUMERIC DEFAULT 0,
  benefits JSONB DEFAULT '[]'::jsonb,
  rules JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE package_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active packages"
  ON package_configurations
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can read all packages"
  ON package_configurations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert packages"
  ON package_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update packages"
  ON package_configurations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete packages"
  ON package_configurations
  FOR DELETE
  TO authenticated
  USING (true);

-- Populate with existing funeral packages
INSERT INTO package_configurations (package_type, package_key, display_name, description, price, sum_assured, benefits, rules, sort_order)
VALUES 
  ('funeral', 'LITE', 'Lite Package', 'Affordable coverage for your entire family with essential funeral services.', 5.00, 500, 
   '["$500 Sum Assured per person", "2 Tier Casket", "$50 Grocery voucher", "Hearse within 50km radius", "Bus transportation at $1.50 per km", "Grave equipment included"]'::jsonb,
   '["Family package price: $5.00 per month", "Covers: Member, Spouse, and up to 4 children (biological/step/grand/siblings)", "Children covered up to age 18 (or 23 if student with school ID)", "Dependents above 64 years: +$2.50 per person (Premium package only)"]'::jsonb,
   1),
  ('funeral', 'STANDARD', 'Standard Package', 'Enhanced coverage with better benefits and quality casket options.', 8.00, 1000,
   '["$1,000 Sum Assured per person", "Boston Dome Casket", "$80 Grocery voucher", "Hearse transportation", "Bus transportation at $1.50 per km", "Grave equipment included"]'::jsonb,
   '["Family package price: $8.00 per month", "Covers: Member, Spouse, and up to 4 children (biological/step/grand/siblings)", "Children covered up to age 18 (or 23 if student with school ID)", "Dependents above 64 years: +$2.50 per person (Premium package only)"]'::jsonb,
   2),
  ('funeral', 'PREMIUM', 'Premium Package', 'Comprehensive coverage with premium benefits and full transportation support.', 15.00, 1500,
   '["$1,500 Sum Assured per person", "Wrap Around Dome Casket", "$150 Grocery voucher", "Hearse transportation", "Bus transportation included", "Grave equipment included"]'::jsonb,
   '["Family package price: $15.00 per month", "Covers: Member, Spouse, and up to 4 children (biological/step/grand/siblings)", "Children covered up to age 18 (or 23 if student with school ID)", "No additional charge for dependents above 64 years"]'::jsonb,
   3)
ON CONFLICT (package_key) DO NOTHING;

-- Populate with medical packages
INSERT INTO package_configurations (package_type, package_key, display_name, description, price, sort_order)
VALUES 
  ('medical', 'NONE', 'No Medical Aid', '', 0, 1),
  ('medical', 'ZIMHEALTH', 'ZimHealth', '', 1.00, 2),
  ('medical', 'FAMILY_LIFE', 'Family Life', '', 7.00, 3),
  ('medical', 'ALKAANE', 'Alkaane', '', 18.00, 4)
ON CONFLICT (package_key) DO NOTHING;

-- Populate with cashback packages
INSERT INTO package_configurations (package_type, package_key, display_name, description, price, payout, sort_order)
VALUES 
  ('cashback', 'NONE', 'No Cash Back', '', 0, 0, 1),
  ('cashback', 'CB1', 'CB1 ($250 Payout)', '', 1.00, 250, 2),
  ('cashback', 'CB2', 'CB2 ($500 Payout)', '', 2.00, 500, 3),
  ('cashback', 'CB3', 'CB3 ($750 Payout)', '', 3.00, 750, 4),
  ('cashback', 'CB4', 'CB4 ($1000 Payout)', '', 4.00, 1000, 5)
ON CONFLICT (package_key) DO NOTHING;