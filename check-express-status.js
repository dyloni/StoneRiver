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
const supabase = createClient(supabaseUrl, supabaseKey);

const checkStatus = async () => {
  console.log('Checking current account statuses...\n');

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('policy_number');

  const statusCounts = {};
  const expressAccounts = [];

  customers.forEach(c => {
    const status = c.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (status === 'Express') {
      expressAccounts.push({
        policy: c.policy_number,
        name: `${c.first_name} ${c.surname}`,
        status: c.status
      });
    }
  });

  console.log('Current Status Distribution:');
  console.log('─────────────────────────────');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log(`\nTotal customers: ${customers.length}`);

  if (expressAccounts.length > 0) {
    console.log(`\nExpress Accounts Found: ${expressAccounts.length}`);
    console.log('─────────────────────────────');
    expressAccounts.forEach(a => {
      console.log(`  ${a.policy} - ${a.name}`);
    });
  }
};

checkStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
