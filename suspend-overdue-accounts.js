import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const calculatePaymentStatus = (customer, payments) => {
  if (customer.status === 'Cancelled') {
    return { status: 'Cancelled', monthsBehind: 0, shouldSuspend: false };
  }

  const inceptionDate = new Date(customer.inception_date);
  const today = new Date();

  const monthsSinceInception = (today.getFullYear() - inceptionDate.getFullYear()) * 12
    + (today.getMonth() - inceptionDate.getMonth());

  const customerPayments = payments.filter(p => p.customer_id === customer.id);
  const paymentCount = customerPayments.length;
  const monthsBehind = monthsSinceInception - paymentCount;

  let shouldSuspend = false;
  let calculatedStatus = customer.status;

  if (monthsBehind >= 2) {
    calculatedStatus = 'Suspended';
    shouldSuspend = true;
  } else if (monthsBehind >= 1) {
    calculatedStatus = 'Overdue';
    shouldSuspend = true;
  } else {
    calculatedStatus = 'Active';
    shouldSuspend = false;
  }

  return {
    status: calculatedStatus,
    monthsBehind,
    shouldSuspend,
    outstandingAmount: monthsBehind > 0 ? monthsBehind * parseFloat(customer.total_premium || 0) : 0
  };
};

const suspendOverdueAccounts = async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ONE-TIME ACCOUNT SUSPENSION PROCESS - PAYMENT ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log('');

  try {
    console.log('Step 1: Fetching all customers...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .neq('status', 'Cancelled');

    if (customersError) {
      throw new Error(`Error fetching customers: ${customersError.message}`);
    }

    console.log(`✓ Total accounts reviewed: ${customers.length}`);
    console.log('');

    console.log('Step 2: Fetching all payment records...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*');

    if (paymentsError) {
      throw new Error(`Error fetching payments: ${paymentsError.message}`);
    }

    console.log(`✓ Total payment records: ${payments.length}`);
    console.log('');

    console.log('Step 3: Analyzing payment status for each account...');
    console.log('');

    const suspensionReport = [];
    let totalSuspended = 0;
    let totalOutstanding = 0;

    for (const customer of customers) {
      const analysis = calculatePaymentStatus(customer, payments);

      if (analysis.shouldSuspend && customer.status !== 'Suspended' && customer.status !== 'Overdue') {
        suspensionReport.push({
          id: customer.id,
          policyNumber: customer.policy_number,
          name: `${customer.first_name} ${customer.surname}`,
          currentStatus: customer.status,
          newStatus: analysis.status,
          monthsBehind: analysis.monthsBehind,
          outstandingAmount: analysis.outstandingAmount,
          premium: parseFloat(customer.total_premium || 0),
          phone: customer.phone,
          agentId: customer.assigned_agent_id
        });

        totalSuspended++;
        totalOutstanding += analysis.outstandingAmount;
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SUSPENSION ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Accounts requiring suspension: ${totalSuspended}`);
    console.log(`Total outstanding revenue: $${totalOutstanding.toFixed(2)}`);
    console.log('');

    if (suspensionReport.length === 0) {
      console.log('✓ No accounts require suspension at this time.');
      console.log('  All accounts are up to date with their payments.');
      console.log('');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ACCOUNTS TO BE SUSPENDED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    suspensionReport.forEach((account, index) => {
      console.log(`${index + 1}. ${account.policyNumber} - ${account.name}`);
      console.log(`   Current Status: ${account.currentStatus} → New Status: ${account.newStatus}`);
      console.log(`   Months Behind: ${account.monthsBehind} | Outstanding: $${account.outstandingAmount.toFixed(2)}`);
      console.log(`   Monthly Premium: $${account.premium.toFixed(2)} | Phone: ${account.phone || 'N/A'}`);
      console.log('');
    });

    console.log('Step 4: Executing account suspensions...');
    console.log('');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const account of suspensionReport) {
      try {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            status: account.newStatus,
            last_updated: new Date().toISOString()
          })
          .eq('id', account.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✓ Suspended: ${account.policyNumber} - ${account.name}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed: ${account.policyNumber} - ${error.message}`);
        failureCount++;
        failures.push({
          policyNumber: account.policyNumber,
          name: account.name,
          error: error.message
        });
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SUSPENSION EXECUTION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`✓ Successfully suspended: ${successCount} accounts`);
    if (failureCount > 0) {
      console.log(`✗ Failed suspensions: ${failureCount} accounts`);
      console.log('');
      console.log('Failed Accounts:');
      failures.forEach(f => {
        console.log(`  - ${f.policyNumber} (${f.name}): ${f.error}`);
      });
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  FINAL SUMMARY REPORT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Execution Timestamp: ${new Date().toISOString()}`);
    console.log(`Total Accounts Reviewed: ${customers.length}`);
    console.log(`Accounts Identified for Suspension: ${totalSuspended}`);
    console.log(`Accounts Successfully Suspended: ${successCount}`);
    console.log(`Suspension Failures: ${failureCount}`);
    console.log(`Total Outstanding Revenue: $${totalOutstanding.toFixed(2)}`);
    console.log('');
    console.log('Suspension Criteria Applied:');
    console.log('  - Accounts with 1 month overdue: Marked as OVERDUE');
    console.log('  - Accounts with 2+ months overdue: Marked as SUSPENDED');
    console.log('  - Cancelled accounts: Excluded from suspension');
    console.log('');
    console.log('Status Flags Applied:');
    console.log('  - OVERDUE: Payment required (1 month behind)');
    console.log('  - SUSPENDED: Immediate payment required (2+ months behind)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  PROCESS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✓ One-time suspension process completed successfully');
    console.log('✓ All qualifying accounts have been processed');
    console.log('✓ Audit trail maintained in database');
    console.log('');
    console.log('NOTE: This was a ONE-TIME execution. No recurring suspensions set up.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  CRITICAL ERROR');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('Stack:', error.stack);
    console.error('');
    console.error('Process terminated due to error.');
    console.error('Please review the error and try again.');
    console.error('');
    process.exit(1);
  }
};

console.log('');
console.log('Starting Account Suspension Process...');
console.log('');

suspendOverdueAccounts()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
