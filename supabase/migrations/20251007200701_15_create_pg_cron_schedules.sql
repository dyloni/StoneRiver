/*
  # Set up scheduled jobs for automatic reminders

  ## Overview
  This migration sets up pg_cron scheduled jobs to automatically check and send reminders.

  ## Scheduled Jobs
  1. **Birthday Reminders** - Runs daily at 8:00 AM
     - Checks for birthdays matching today's date
     - Sends birthday wishes via SMS
  
  2. **Payment Reminders** - Runs daily at 9:00 AM
     - Checks for upcoming payment due dates
     - Sends payment reminders based on reminder_days_before setting

  ## Notes
  - pg_cron extension must be enabled in Supabase
  - Jobs use pg_net to call the edge functions
  - Times are in UTC
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule birthday reminders to run daily at 8:00 AM UTC
SELECT cron.schedule(
  'check-birthday-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-birthday-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule payment reminders to run daily at 9:00 AM UTC
SELECT cron.schedule(
  'check-payment-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-payment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
