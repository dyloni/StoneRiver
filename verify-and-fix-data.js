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

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {}

  return null;
}

function calculateMonthsDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return months;
}

function determineStatus(lastPaymentDate, inceptionDate, premiumPeriod) {
  const now = new Date();
  const lastPayment = parseDate(lastPaymentDate);
  const inception = parseDate(inceptionDate);

  if (!lastPayment && !inception) {
    return 'Inactive';
  }

  if (!lastPayment) {
    return 'Inactive';
  }

  const daysSinceLastPayment = Math.floor((now - lastPayment) / (1000 * 60 * 60 * 24));

  let gracePeriodDays = 30;
  if (premiumPeriod && premiumPeriod.toLowerCase() === 'annual') {
    gracePeriodDays = 365;
  } else if (premiumPeriod && premiumPeriod.toLowerCase() === 'quarterly') {
    gracePeriodDays = 90;
  }

  if (daysSinceLastPayment <= gracePeriodDays) {
    return 'Active';
  } else if (daysSinceLastPayment <= gracePeriodDays + 30) {
    return 'Grace Period';
  } else if (daysSinceLastPayment <= gracePeriodDays + 90) {
    return 'Suspended';
  } else {
    return 'Lapsed';
  }
}

async function fixDependentMatching() {
  console.log('\n=== Fixing Dependent Matching ===\n');

  const { data: allCustomers, error } = await supabase
    .from('customers')
    .select('*');

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  console.log(`Total customers: ${allCustomers.length}`);

  const policyHolders = allCustomers.filter(c => {
    if (!c.participants || c.participants.length === 0) return false;
    const self = c.participants.find(p =>
      p.relationship === 'Self' ||
      p.relationship === 'Policy Holder' ||
      p.relationship === 'Principal Member'
    );
    return self !== undefined;
  });

  const dependents = allCustomers.filter(c => {
    if (!c.participants || c.participants.length === 0) return false;
    const self = c.participants.find(p =>
      p.relationship === 'Self' ||
      p.relationship === 'Policy Holder' ||
      p.relationship === 'Principal Member'
    );
    return self === undefined;
  });

  console.log(`Policy holders: ${policyHolders.length}`);
  console.log(`Dependents (standalone): ${dependents.length}`);

  let matchedByPolicy = 0;
  let matchedById = 0;
  let notMatched = 0;

  for (const dependent of dependents) {
    if (!dependent.participants || dependent.participants.length === 0) continue;

    const depData = dependent.participants[0];
    let matchedHolder = null;

    const originalPolicyNumber = dependent.policy_number;
    matchedHolder = policyHolders.find(ph => {
      const normalized1 = ph.policy_number.replace(/[-\s]/g, '').toLowerCase();
      const normalized2 = originalPolicyNumber.replace(/[-\s]/g, '').toLowerCase();
      return normalized1 === normalized2 && ph.id !== dependent.id;
    });

    if (matchedHolder) {
      matchedByPolicy++;
    } else if (depData.idNumber) {
      matchedHolder = policyHolders.find(ph => {
        const normalized1 = ph.id_number.replace(/[-\s]/g, '').toLowerCase();
        const normalized2 = depData.idNumber.replace(/[-\s]/g, '').toLowerCase();
        return normalized1 === normalized2;
      });

      if (matchedHolder) {
        matchedById++;
      }
    }

    if (matchedHolder) {
      const updatedParticipants = [...matchedHolder.participants];

      const existingDepIndex = updatedParticipants.findIndex(p =>
        p.idNumber && depData.idNumber &&
        p.idNumber.replace(/[-\s]/g, '').toLowerCase() === depData.idNumber.replace(/[-\s]/g, '').toLowerCase()
      );

      if (existingDepIndex === -1) {
        const newId = Math.max(...updatedParticipants.map(p => p.id || 0)) + 1;
        depData.id = newId;
        updatedParticipants.push(depData);

        const { error: updateError } = await supabase
          .from('customers')
          .update({ participants: updatedParticipants })
          .eq('id', matchedHolder.id);

        if (updateError) {
          console.error(`Error updating holder ${matchedHolder.id}:`, updateError);
        } else {
          const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .eq('id', dependent.id);

          if (deleteError) {
            console.error(`Error deleting dependent ${dependent.id}:`, deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .eq('id', dependent.id);

        if (deleteError) {
          console.error(`Error deleting duplicate dependent ${dependent.id}:`, deleteError);
        }
      }
    } else {
      notMatched++;
    }
  }

  console.log(`\nMatched by policy number: ${matchedByPolicy}`);
  console.log(`Matched by ID number: ${matchedById}`);
  console.log(`Not matched: ${notMatched}`);
}

async function updatePolicyStatuses() {
  console.log('\n=== Updating Policy Statuses ===\n');

  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, policy_number, status, inception_date, cover_date, premium_period, latest_receipt_date');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('customer_id, policy_number, payment_date, payment_amount')
    .order('payment_date', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    return;
  }

  const latestPaymentByCustomer = new Map();
  for (const payment of payments) {
    if (!latestPaymentByCustomer.has(payment.customer_id)) {
      latestPaymentByCustomer.set(payment.customer_id, payment);
    }
  }

  console.log(`Processing ${customers.length} customers...`);

  let updated = 0;
  let statusChanges = {
    'Active': 0,
    'Grace Period': 0,
    'Suspended': 0,
    'Lapsed': 0,
    'Inactive': 0
  };

  for (const customer of customers) {
    const latestPayment = latestPaymentByCustomer.get(customer.id);

    const newStatus = determineStatus(
      latestPayment ? latestPayment.payment_date : null,
      customer.inception_date,
      customer.premium_period
    );

    const updates = {};

    if (latestPayment && latestPayment.payment_date !== customer.latest_receipt_date) {
      updates.latest_receipt_date = latestPayment.payment_date;
    }

    if (newStatus !== customer.status) {
      updates.status = newStatus;
      statusChanges[newStatus]++;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customer.id);

      if (updateError) {
        console.error(`Error updating customer ${customer.id}:`, updateError);
      } else {
        updated++;
      }
    }
  }

  console.log(`\n✓ Updated ${updated} customers`);
  console.log('\nStatus changes:');
  Object.entries(statusChanges).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`  ${status}: ${count}`);
    }
  });
}

async function verifyPaymentDates() {
  console.log('\n=== Verifying Payment Dates ===\n');

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, policy_number, payment_date, payment_period, payment_amount')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching payments:', error);
    return;
  }

  console.log(`Total payments: ${payments.length}`);

  let invalidDates = 0;
  let futureDates = 0;
  let validDates = 0;

  const now = new Date();

  for (const payment of payments) {
    const date = parseDate(payment.payment_date);

    if (!date) {
      invalidDates++;
    } else if (date > now) {
      futureDates++;
    } else {
      validDates++;
    }
  }

  console.log(`Valid dates: ${validDates}`);
  console.log(`Invalid dates: ${invalidDates}`);
  console.log(`Future dates: ${futureDates}`);

  if (invalidDates > 0 || futureDates > 0) {
    console.log('\nNote: Some dates may need correction');
  }
}

async function main() {
  try {
    console.log('=== Starting Data Verification and Fixing ===\n');

    await verifyPaymentDates();

    await updatePolicyStatuses();

    await fixDependentMatching();

    console.log('\n=== All Operations Complete ===');
  } catch (error) {
    console.error('Operation failed:', error);
    process.exit(1);
  }
}

main();
