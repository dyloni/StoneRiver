/*
  # Create Reminders System

  ## Overview
  This migration creates tables and functionality for automated birthday and payment reminders.

  ## New Tables
  
  ### `birthday_reminders`
  - `id` (serial, primary key)
  - `customer_id` (integer, references customers)
  - `participant_id` (integer) - ID of participant in the participants JSONB array
  - `participant_name` (text)
  - `date_of_birth` (text)
  - `phone_number` (text)
  - `last_sent_date` (text, nullable) - Last time birthday reminder was sent
  - `enabled` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `payment_reminders`
  - `id` (serial, primary key)
  - `customer_id` (integer, references customers)
  - `policy_number` (text)
  - `customer_name` (text)
  - `phone_number` (text)
  - `premium_amount` (numeric)
  - `premium_period` (text) - Monthly, Quarterly, etc.
  - `last_payment_date` (text, nullable)
  - `next_due_date` (text)
  - `last_reminder_sent` (text, nullable)
  - `reminder_days_before` (integer, default 3) - Days before due date to send reminder
  - `enabled` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `reminder_logs`
  - `id` (serial, primary key)
  - `reminder_type` (text) - 'birthday' or 'payment'
  - `customer_id` (integer)
  - `phone_number` (text)
  - `message` (text)
  - `status` (text) - 'sent', 'failed', 'pending'
  - `sent_at` (timestamptz)
  - `error_message` (text, nullable)

  ## Security
  - Enable RLS on all tables
  - Allow anon access for agent portal functionality
  - Allow authenticated users full access
*/

-- Create birthday_reminders table
CREATE TABLE IF NOT EXISTS birthday_reminders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  participant_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  last_sent_date TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE birthday_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to read birthday_reminders"
  ON birthday_reminders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert birthday_reminders"
  ON birthday_reminders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update birthday_reminders"
  ON birthday_reminders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete birthday_reminders"
  ON birthday_reminders FOR DELETE
  TO anon
  USING (true);

-- Create payment_reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  policy_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  premium_amount NUMERIC DEFAULT 0,
  premium_period TEXT DEFAULT 'Monthly',
  last_payment_date TEXT,
  next_due_date TEXT NOT NULL,
  last_reminder_sent TEXT,
  reminder_days_before INTEGER DEFAULT 3,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to read payment_reminders"
  ON payment_reminders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert payment_reminders"
  ON payment_reminders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update payment_reminders"
  ON payment_reminders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete payment_reminders"
  ON payment_reminders FOR DELETE
  TO anon
  USING (true);

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  reminder_type TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to read reminder_logs"
  ON reminder_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert reminder_logs"
  ON reminder_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update reminder_logs"
  ON reminder_logs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_birthday_reminders_customer_id ON birthday_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_birthday_reminders_enabled ON birthday_reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_customer_id ON payment_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_enabled ON payment_reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_next_due_date ON payment_reminders(next_due_date);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_type ON reminder_logs(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_status ON reminder_logs(status);
