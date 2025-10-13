/*
  # Fix Security Issues - Part 7: Remove Anonymous Access Policies

  1. Changes
    - Remove all anonymous (anon) role policies
    - This is a critical security fix - data should not be accessible without authentication
    
  2. Security
    - All data access now requires authentication
    - Anonymous users will not be able to access any data
    
  3. Impact
    - This may break any unauthenticated API calls
    - Ensure all frontend requests include authentication tokens
*/

-- Remove anon policies from agents
DROP POLICY IF EXISTS "Allow anon to read agents" ON agents;
DROP POLICY IF EXISTS "Allow anon to insert agents" ON agents;
DROP POLICY IF EXISTS "Allow anon to update agents" ON agents;
DROP POLICY IF EXISTS "Allow anon to delete agents" ON agents;

-- Remove anon policies from customers
DROP POLICY IF EXISTS "Allow anon to read customers" ON customers;
DROP POLICY IF EXISTS "Allow anon to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow anon to update customers" ON customers;
DROP POLICY IF EXISTS "Allow anon to delete customers" ON customers;

-- Remove anon policies from requests
DROP POLICY IF EXISTS "Allow anon to read requests" ON requests;
DROP POLICY IF EXISTS "Allow anon to insert requests" ON requests;
DROP POLICY IF EXISTS "Allow anon to update requests" ON requests;
DROP POLICY IF EXISTS "Allow anon to delete requests" ON requests;

-- Remove anon policies from messages
DROP POLICY IF EXISTS "Allow anon to read messages" ON messages;
DROP POLICY IF EXISTS "Allow anon to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow anon to update messages" ON messages;
DROP POLICY IF EXISTS "Allow anon to delete messages" ON messages;

-- Remove anon policies from claims
DROP POLICY IF EXISTS "Allow anon to read claims" ON claims;
DROP POLICY IF EXISTS "Allow anon to insert claims" ON claims;
DROP POLICY IF EXISTS "Allow anon to update claims" ON claims;
DROP POLICY IF EXISTS "Allow anon to delete claims" ON claims;

-- Remove anon policies from payments
DROP POLICY IF EXISTS "Allow anon to read payments" ON payments;
DROP POLICY IF EXISTS "Allow anon to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow anon to update payments" ON payments;
DROP POLICY IF EXISTS "Allow anon to delete payments" ON payments;

-- Remove anon policies from admins
DROP POLICY IF EXISTS "Anon users can read admins" ON admins;

-- Remove anon policies from permissions
DROP POLICY IF EXISTS "Anon users can read permissions" ON permissions;

-- Remove anon policies from admin_permissions
DROP POLICY IF EXISTS "Anon can view admin permissions" ON admin_permissions;

-- Remove anon policies from admin_audit_log
DROP POLICY IF EXISTS "Anon can insert audit logs" ON admin_audit_log;

-- Remove anon policies from payment_reminders
DROP POLICY IF EXISTS "Allow anon to read payment_reminders" ON payment_reminders;
DROP POLICY IF EXISTS "Allow anon to insert payment_reminders" ON payment_reminders;
DROP POLICY IF EXISTS "Allow anon to update payment_reminders" ON payment_reminders;
DROP POLICY IF EXISTS "Allow anon to delete payment_reminders" ON payment_reminders;

-- Remove anon policies from birthday_reminders
DROP POLICY IF EXISTS "Allow anon to read birthday_reminders" ON birthday_reminders;
DROP POLICY IF EXISTS "Allow anon to insert birthday_reminders" ON birthday_reminders;
DROP POLICY IF EXISTS "Allow anon to update birthday_reminders" ON birthday_reminders;
DROP POLICY IF EXISTS "Allow anon to delete birthday_reminders" ON birthday_reminders;

-- Remove anon policies from reminder_logs
DROP POLICY IF EXISTS "Allow anon to read reminder_logs" ON reminder_logs;
DROP POLICY IF EXISTS "Allow anon to insert reminder_logs" ON reminder_logs;
DROP POLICY IF EXISTS "Allow anon to update reminder_logs" ON reminder_logs;

-- Remove anon policies from typing_indicators
DROP POLICY IF EXISTS "Allow anon to read typing_indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Allow anon to insert typing_indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Allow anon to update typing_indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Allow anon to delete typing_indicators" ON typing_indicators;

-- Remove anon policies from push_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions anon" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions anon" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions anon" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions anon" ON push_subscriptions;
