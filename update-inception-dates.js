import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateInceptionDates() {
  console.log('=== Updating Inception Dates ===\n');

  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, policy_number');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  console.log(`Found ${customers.length} customers`);

  let allPayments = [];
  let start = 0;
  const batchSize = 1000;

  while (true) {
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('customer_id, policy_number, payment_date')
      .order('payment_date', { ascending: true })
      .range(start, start + batchSize - 1);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return;
    }

    if (!payments || payments.length === 0) break;

    allPayments = allPayments.concat(payments);

    if (payments.length < batchSize) break;
    start += batchSize;
  }

  const payments = allPayments;

  console.log(`Found ${payments.length} payments`);

  const earliestPaymentByCustomer = new Map();

  for (const payment of payments) {
    if (!earliestPaymentByCustomer.has(payment.customer_id)) {
      earliestPaymentByCustomer.set(payment.customer_id, payment.payment_date);
    }
  }

  console.log(`\nFound earliest payments for ${earliestPaymentByCustomer.size} customers`);

  let updated = 0;
  let skipped = 0;

  for (const customer of customers) {
    const earliestPaymentDate = earliestPaymentByCustomer.get(customer.id);

    if (!earliestPaymentDate) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        inception_date: earliestPaymentDate,
        cover_date: earliestPaymentDate
      })
      .eq('id', customer.id);

    if (updateError) {
      console.error(`Error updating customer ${customer.id}:`, updateError);
    } else {
      updated++;
    }
  }

  console.log(`\n✓ Updated ${updated} customers`);
  console.log(`Skipped (no payments): ${skipped}`);
  console.log('\n=== Update Complete ===');
}

updateInceptionDates();
