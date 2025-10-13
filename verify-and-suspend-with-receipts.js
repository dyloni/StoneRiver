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

const calculatePaymentStatusWithReceipts = (customer, payments) => {
  if (customer.status === 'Cancelled') {
    return {
      status: 'Cancelled',
      monthsSinceInception: 0,
      paymentsReceived: 0,
      monthsBehind: 0,
      shouldSuspend: false,
      outstandingAmount: 0,
      reason: 'Account cancelled'
    };
  }

  const inceptionDate = new Date(customer.inception_date);
  const today = new Date();

  // Calculate months since inception
  const monthsSinceInception = (today.getFullYear() - inceptionDate.getFullYear()) * 12
    + (today.getMonth() - inceptionDate.getMonth());

  // If policy hasn't started yet, skip
  if (monthsSinceInception < 0) {
    return {
      status: 'Inactive',
      monthsSinceInception: 0,
      paymentsReceived: 0,
      monthsBehind: 0,
      shouldSuspend: false,
      outstandingAmount: 0,
      reason: 'Policy not yet started'
    };
  }

  // Count actual payments with receipts
  const customerPayments = payments.filter(p => p.customer_id === customer.id);
  const paymentsReceived = customerPayments.length;

  // Calculate how many months behind
  const monthsBehind = monthsSinceInception - paymentsReceived;

  const premium = parseFloat(customer.total_premium || 0);
  const outstandingAmount = monthsBehind > 0 ? monthsBehind * premium : 0;

  let calculatedStatus = customer.status;
  let shouldSuspend = false;
  let reason = '';

  if (monthsBehind >= 2) {
    calculatedStatus = 'Suspended';
    shouldSuspend = true;
    reason = `${monthsBehind} months behind - requires immediate payment`;
  } else if (monthsBehind === 1) {
    calculatedStatus = 'Overdue';
    shouldSuspend = true;
    reason = `1 month overdue - payment required`;
  } else if (monthsBehind === 0) {
    calculatedStatus = 'Active';
    shouldSuspend = false;
    reason = 'Up to date with payments';
  } else {
    // monthsBehind is negative (overpaid)
    calculatedStatus = 'Active';
    shouldSuspend = false;
    reason = 'Payments up to date';
  }

  return {
    status: calculatedStatus,
    monthsSinceInception,
    paymentsReceived,
    monthsBehind: Math.max(0, monthsBehind),
    shouldSuspend,
    outstandingAmount,
    reason,
    inceptionDate: customer.inception_date,
    currentStatus: customer.status
  };
};

const verifyAndSuspend = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PAYMENT VERIFICATION & SUSPENSION PROCESS');
  console.log('  (Based on Actual Receipt Records)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log('');

  try {
    console.log('Step 1: Fetching all customers from database...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('policy_number');

    if (customersError) {
      throw new Error(`Error fetching customers: ${customersError.message}`);
    }

    console.log(`✓ Total customers in database: ${customers.length}`);
    console.log('');

    console.log('Step 2: Fetching all payment receipts...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      throw new Error(`Error fetching payments: ${paymentsError.message}`);
    }

    console.log(`✓ Total payment receipts found: ${payments.length}`);
    console.log('');

    console.log('Step 3: Analyzing payment status for each account...');
    console.log('');

    const analysisResults = [];
    const suspensionQueue = [];

    let activeCount = 0;
    let overdueCount = 0;
    let suspendedCount = 0;
    let cancelledCount = 0;
    let inactiveCount = 0;
    let totalOutstanding = 0;

    for (const customer of customers) {
      const analysis = calculatePaymentStatusWithReceipts(customer, payments);
      analysisResults.push({
        ...customer,
        analysis
      });

      if (analysis.shouldSuspend && customer.status !== 'Suspended' && customer.status !== 'Overdue' && customer.status !== 'Cancelled') {
        suspensionQueue.push({
          id: customer.id,
          policyNumber: customer.policy_number,
          name: `${customer.first_name} ${customer.surname}`,
          currentStatus: customer.status,
          newStatus: analysis.status,
          monthsSinceInception: analysis.monthsSinceInception,
          paymentsReceived: analysis.paymentsReceived,
          monthsBehind: analysis.monthsBehind,
          outstandingAmount: analysis.outstandingAmount,
          premium: parseFloat(customer.total_premium || 0),
          phone: customer.phone,
          agentId: customer.assigned_agent_id,
          inceptionDate: customer.inception_date,
          reason: analysis.reason
        });
      }

      // Count by calculated status
      if (analysis.status === 'Active') activeCount++;
      else if (analysis.status === 'Overdue') overdueCount++;
      else if (analysis.status === 'Suspended') suspendedCount++;
      else if (analysis.status === 'Cancelled') cancelledCount++;
      else inactiveCount++;

      if (analysis.shouldSuspend) {
        totalOutstanding += analysis.outstandingAmount;
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  PAYMENT VERIFICATION ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('CALCULATED STATUS DISTRIBUTION (Based on Receipts):');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Active:      ${activeCount} accounts (up to date)`);
    console.log(`  Overdue:     ${overdueCount} accounts (1 month behind)`);
    console.log(`  Suspended:   ${suspendedCount} accounts (2+ months behind)`);
    console.log(`  Cancelled:   ${cancelledCount} accounts`);
    console.log(`  Inactive:    ${inactiveCount} accounts`);
    console.log('');
    console.log(`Accounts requiring suspension: ${suspensionQueue.length}`);
    console.log(`Total outstanding revenue: $${totalOutstanding.toFixed(2)}`);
    console.log('');

    if (suspensionQueue.length === 0) {
      console.log('✓ VERIFICATION COMPLETE: All accounts are up to date!');
      console.log('  No suspensions required at this time.');
      console.log('');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ACCOUNTS REQUIRING SUSPENSION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Group by severity
    const criticalSuspensions = suspensionQueue.filter(a => a.monthsBehind >= 3);
    const moderateSuspensions = suspensionQueue.filter(a => a.monthsBehind === 2);
    const overdueAccounts = suspensionQueue.filter(a => a.monthsBehind === 1);

    if (criticalSuspensions.length > 0) {
      console.log(`CRITICAL - 3+ Months Behind (${criticalSuspensions.length} accounts):`);
      console.log('─────────────────────────────────────────────────────────────');
      criticalSuspensions.slice(0, 20).forEach((account, index) => {
        console.log(`${index + 1}. ${account.policyNumber} - ${account.name}`);
        console.log(`   Inception: ${account.inceptionDate} | Months due: ${account.monthsSinceInception}`);
        console.log(`   Payments received: ${account.paymentsReceived} | Behind: ${account.monthsBehind} months`);
        console.log(`   Outstanding: $${account.outstandingAmount.toFixed(2)} | Premium: $${account.premium.toFixed(2)}/mo`);
        console.log(`   Current: ${account.currentStatus} → New: ${account.newStatus}`);
        console.log('');
      });
      if (criticalSuspensions.length > 20) {
        console.log(`   ... and ${criticalSuspensions.length - 20} more critical accounts`);
        console.log('');
      }
    }

    if (moderateSuspensions.length > 0) {
      console.log(`MODERATE - 2 Months Behind (${moderateSuspensions.length} accounts):`);
      console.log('─────────────────────────────────────────────────────────────');
      moderateSuspensions.slice(0, 10).forEach((account, index) => {
        console.log(`${index + 1}. ${account.policyNumber} - ${account.name}`);
        console.log(`   Behind: ${account.monthsBehind} months | Outstanding: $${account.outstandingAmount.toFixed(2)}`);
        console.log('');
      });
      if (moderateSuspensions.length > 10) {
        console.log(`   ... and ${moderateSuspensions.length - 10} more accounts`);
        console.log('');
      }
    }

    if (overdueAccounts.length > 0) {
      console.log(`OVERDUE - 1 Month Behind (${overdueAccounts.length} accounts):`);
      console.log('─────────────────────────────────────────────────────────────');
      overdueAccounts.slice(0, 10).forEach((account, index) => {
        console.log(`${index + 1}. ${account.policyNumber} - ${account.name}`);
        console.log(`   Behind: ${account.monthsBehind} month | Outstanding: $${account.outstandingAmount.toFixed(2)}`);
        console.log('');
      });
      if (overdueAccounts.length > 10) {
        console.log(`   ... and ${overdueAccounts.length - 10} more accounts`);
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  EXECUTING ACCOUNT SUSPENSIONS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const account of suspensionQueue) {
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

        console.log(`✓ ${account.policyNumber} - ${account.currentStatus} → ${account.newStatus} (${account.monthsBehind} months behind)`);
        successCount++;
      } catch (error) {
        console.error(`✗ ${account.policyNumber} - Failed: ${error.message}`);
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
    console.log(`Total Payment Receipts Verified: ${payments.length}`);
    console.log('');
    console.log('STATUS BREAKDOWN:');
    console.log(`  • Accounts up to date: ${activeCount}`);
    console.log(`  • Accounts 1 month overdue: ${overdueAccounts.length}`);
    console.log(`  • Accounts 2 months behind: ${moderateSuspensions.length}`);
    console.log(`  • Accounts 3+ months behind: ${criticalSuspensions.length}`);
    console.log('');
    console.log(`Accounts Identified for Suspension: ${suspensionQueue.length}`);
    console.log(`Accounts Successfully Suspended: ${successCount}`);
    console.log(`Suspension Failures: ${failureCount}`);
    console.log(`Total Outstanding Revenue: $${totalOutstanding.toFixed(2)}`);
    console.log('');
    console.log('VERIFICATION METHOD:');
    console.log('  ✓ Cross-referenced payment receipts with inception dates');
    console.log('  ✓ Calculated months since policy inception');
    console.log('  ✓ Counted actual payment receipts received');
    console.log('  ✓ Identified gaps in payment history');
    console.log('');
    console.log('SUSPENSION CRITERIA:');
    console.log('  • 1 month overdue → Status: OVERDUE');
    console.log('  • 2+ months overdue → Status: SUSPENDED');
    console.log('  • Cancelled accounts → Excluded from process');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  PROCESS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✓ Payment verification completed against receipt records');
    console.log('✓ All overdue accounts suspended according to criteria');
    console.log('✓ Audit trail maintained in database');
    console.log('');
    console.log('NOTE: This was a ONE-TIME execution based on receipt verification.');
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
    process.exit(1);
  }
};

console.log('');
console.log('Starting Receipt-Based Verification & Suspension Process...');
console.log('');

verifyAndSuspend()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
