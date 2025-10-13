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

const checkDates = async () => {
  console.log('Checking Inception and Cover Start dates...\n');

  const { data: customers, error } = await supabase
    .from('customers')
    .select('policy_number, first_name, surname, inception_date, cover_date')
    .order('policy_number')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample of current dates in database:');
  console.log('═══════════════════════════════════════════════════════════════\n');

  customers.forEach(c => {
    console.log(`Policy: ${c.policy_number}`);
    console.log(`Name: ${c.first_name} ${c.surname}`);
    console.log(`Inception Date: ${c.inception_date || 'NULL'}`);
    console.log(`Cover Date: ${c.cover_date || 'NULL'}`);
    console.log('───────────────────────────────────────────────────────────────');
  });

  const { count } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .is('inception_date', null);

  const { count: nullCoverDate } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .is('cover_date', null);

  console.log(`\nTotal customers with NULL inception_date: ${count}`);
  console.log(`Total customers with NULL cover_date: ${nullCoverDate}`);
};

checkDates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
