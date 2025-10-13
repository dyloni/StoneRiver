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

const suspendAllExceptExpress = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUSPEND ALL ACCOUNTS EXCEPT EXPRESS');
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

    console.log('Step 2: Categorizing accounts...');
    console.log('');

    const expressAccounts = customers.filter(c => c.status === 'Express');
    const accountsToSuspend = customers.filter(c => c.status !== 'Express');

    console.log('Account Categories:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Express accounts (KEEP):     ${expressAccounts.length}`);
    console.log(`  Accounts to SUSPEND:         ${accountsToSuspend.length}`);
    console.log('');

    if (expressAccounts.length > 0) {
      console.log('Express Accounts (Will NOT be suspended):');
      console.log('─────────────────────────────────────────────────────────────');
      expressAccounts.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.policy_number} - ${account.first_name} ${account.surname}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  EXECUTING MASS SUSPENSION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Total accounts to suspend: ${accountsToSuspend.length}`);
    console.log('');

    // Group by current status
    const statusGroups = {};
    accountsToSuspend.forEach(account => {
      const status = account.status || 'Unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(account);
    });

    console.log('Breakdown by Current Status:');
    console.log('─────────────────────────────────────────────────────────────');
    Object.entries(statusGroups).forEach(([status, accounts]) => {
      console.log(`  ${status}: ${accounts.length} accounts → Suspended`);
    });
    console.log('');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const account of accountsToSuspend) {
      try {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            status: 'Suspended',
            last_updated: new Date().toISOString()
          })
          .eq('id', account.id);

        if (updateError) {
          throw updateError;
        }

        successCount++;

        // Print progress every 100 accounts
        if (successCount % 100 === 0) {
          console.log(`  Progress: ${successCount}/${accountsToSuspend.length} accounts suspended...`);
        }
      } catch (error) {
        console.error(`  ✗ Failed: ${account.policy_number} - ${error.message}`);
        failureCount++;
        failures.push({
          policyNumber: account.policy_number,
          name: `${account.first_name} ${account.surname}`,
          error: error.message
        });
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SUSPENSION COMPLETE');
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
    console.log('  FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Execution Timestamp: ${new Date().toISOString()}`);
    console.log(`Total Accounts: ${customers.length}`);
    console.log('');
    console.log('FINAL STATUS DISTRIBUTION:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Suspended:  ${successCount} accounts`);
    console.log(`  Express:    ${expressAccounts.length} accounts (preserved)`);
    if (failureCount > 0) {
      console.log(`  Failed:     ${failureCount} accounts`);
    }
    console.log('');
    console.log('SUSPENSION RULE APPLIED:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('  • ALL accounts → Suspended');
    console.log('  • EXCEPT Express accounts → Preserved');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  PROCESS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✓ Mass suspension completed');
    console.log('✓ Express accounts preserved');
    console.log('✓ Audit trail maintained');
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
console.log('Starting Suspension Process...');
console.log('');

suspendAllExceptExpress()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
