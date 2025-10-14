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
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('URL:', supabaseUrl);
  console.error('Key available:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const getParticipantTypeCategory = (participantType) => {
  if (participantType === 'Principal Member') {
    return 'principal';
  }
  if (participantType === 'Spouse') {
    return 'spouse';
  }
  if (['Child', 'Stepchild', 'Grandchild'].includes(participantType)) {
    return 'child';
  }
  return 'dependent';
};

const assignSuffixCodes = (participants) => {
  const principal = participants.find(p => p.relationship === 'Self' || p.participantType === 'Principal Member');
  const spouses = participants.filter(p => p.relationship === 'Spouse' || p.participantType === 'Spouse');
  const children = participants.filter(p =>
    ['Child', 'Stepchild', 'Grandchild'].includes(p.relationship) ||
    ['Child', 'Stepchild', 'Grandchild'].includes(p.participantType)
  );
  const dependents = participants.filter(p =>
    p.relationship !== 'Self' &&
    p.relationship !== 'Spouse' &&
    !['Child', 'Stepchild', 'Grandchild'].includes(p.relationship) &&
    p.participantType !== 'Principal Member' &&
    p.participantType !== 'Spouse' &&
    !['Child', 'Stepchild', 'Grandchild'].includes(p.participantType)
  );

  const result = [];

  if (principal) {
    result.push({ ...principal, suffix: '000' });
  }

  spouses.forEach((spouse, index) => {
    result.push({ ...spouse, suffix: (101 + index).toString().padStart(3, '0') });
  });

  children.forEach((child, index) => {
    result.push({ ...child, suffix: (201 + index).toString().padStart(3, '0') });
  });

  dependents.forEach((dependent, index) => {
    result.push({ ...dependent, suffix: (301 + index).toString().padStart(3, '0') });
  });

  return result;
};

async function assignSuffixCodesToAllCustomers() {
  console.log('Starting suffix code assignment...\n');

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*');

    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }

    console.log(`Found ${customers.length} customers to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        if (!customer.participants || customer.participants.length === 0) {
          console.log(`⚠️  Customer ${customer.policy_number} has no participants, skipping`);
          skippedCount++;
          continue;
        }

        const alreadyHasCorrectSuffix = customer.participants.every(p => {
          if (!p.suffix) return false;
          const relationship = p.relationship || p.participantType;
          if (relationship === 'Self' || p.participantType === 'Principal Member') return p.suffix === '000';
          if (relationship === 'Spouse') return p.suffix.startsWith('1');
          if (['Child', 'Stepchild', 'Grandchild'].includes(relationship)) return p.suffix.startsWith('2');
          return p.suffix.startsWith('3');
        });

        if (alreadyHasCorrectSuffix) {
          console.log(`✓ Customer ${customer.policy_number} already has correct suffix codes, skipping`);
          skippedCount++;
          continue;
        }

        const participantsWithSuffix = assignSuffixCodes(customer.participants);

        const { error: updateError } = await supabase
          .from('customers')
          .update({
            participants: participantsWithSuffix,
            last_updated: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (updateError) {
          console.error(`❌ Error updating customer ${customer.policy_number}:`, updateError.message);
          errorCount++;
          continue;
        }

        console.log(`✓ Updated customer ${customer.policy_number} with suffix codes:`);
        participantsWithSuffix.forEach(p => {
          const type = p.participantType || p.relationship;
          console.log(`   - ${p.firstName} ${p.surname} (${type}): ${p.suffix}`);
        });
        console.log('');

        updatedCount++;
      } catch (err) {
        console.error(`❌ Error processing customer ${customer.policy_number}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUFFIX CODE ASSIGNMENT COMPLETE');
    console.log('='.repeat(60));
    console.log(`✓ Updated: ${updatedCount} customers`);
    console.log(`⚠️  Skipped: ${skippedCount} customers`);
    console.log(`❌ Errors: ${errorCount} customers`);
    console.log(`Total processed: ${customers.length} customers\n`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     STONERIVER - SUFFIX CODE ASSIGNMENT UTILITY            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('This script will assign suffix codes to all customer participants:');
console.log('  • Principal Member: 000');
console.log('  • Spouse: 101, 102, ...');
console.log('  • Child: 201, 202, 203, ...');
console.log('  • Dependent: 301, 302, 303, ...\n');

assignSuffixCodesToAllCustomers();
