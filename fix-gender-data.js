import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const commonMaleNames = [
  'john', 'james', 'michael', 'david', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles',
  'peter', 'paul', 'mark', 'daniel', 'christopher', 'matthew', 'andrew', 'joshua', 'anthony', 'brian',
  'themba', 'tinashe', 'tafadzwa', 'takudzwa', 'tinotenda', 'kudzai', 'tonderai', 'ngonidzashe',
  'rodgers', 'farai', 'munyaradzi', 'anesu', 'taurai', 'kudakwashe', 'tatenda', 'tendai',
  'cleopas', 'phineas', 'isaac', 'edson', 'saul', 'wilbert', 'raymond', 'bothwell', 'melusi',
  'matthis', 'calvin', 'sean', 'paraziva', 'emmanuel', 'kidpower', 'frank', 'lewis', 'sam',
  'neymar', 'culkin', 'leon', 'shalom', 'olean', 'rodney', 'ngoni', 'bright', 'cryonce'
];

const commonFemaleNames = [
  'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
  'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle',
  'jennings', 'rhukiya', 'rudo', 'lorraine', 'netsai', 'juliet', 'sharmaine', 'emerenciana', 'fiona',
  'shanandra', 'margie', 'beauty', 'chenai', 'clarieta', 'enniah', 'maeni', 'revai', 'theresina',
  'metricia', 'edrina', 'previous', 'lissah', 'sharon', 'bonia', 'nyashadzaishe', 'tatenda'
];

function inferGenderFromName(firstName, relationship) {
  const nameLower = (firstName || '').toLowerCase().trim();

  if (relationship === 'Spouse') {
    if (commonFemaleNames.includes(nameLower)) return 'Female';
    if (commonMaleNames.includes(nameLower)) return 'Male';
  }

  if (commonMaleNames.includes(nameLower)) return 'Male';
  if (commonFemaleNames.includes(nameLower)) return 'Female';

  const femaleEndings = ['a', 'ie', 'een', 'ine', 'elle', 'ette'];
  const maleEndings = ['o', 'is', 'us', 'os'];

  for (const ending of femaleEndings) {
    if (nameLower.endsWith(ending) && nameLower.length > 3) {
      return 'Female';
    }
  }

  for (const ending of maleEndings) {
    if (nameLower.endsWith(ending) && nameLower.length > 3) {
      return 'Male';
    }
  }

  return null;
}

async function fixCustomerGenders() {
  console.log('=== Fixing Customer Gender Data ===\n');

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, policy_number, first_name, surname, gender, participants');

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  let customersFixed = 0;
  let dependentsFixed = 0;

  for (const customer of customers) {
    let updated = false;
    let participantsUpdated = false;

    const inferredGender = inferGenderFromName(customer.first_name, 'Policy Holder');
    if (inferredGender && inferredGender !== customer.gender) {
      console.log(`Customer ${customer.policy_number} (${customer.first_name} ${customer.surname}): ${customer.gender} -> ${inferredGender}`);

      const { error: updateError } = await supabase
        .from('customers')
        .update({ gender: inferredGender })
        .eq('id', customer.id);

      if (!updateError) {
        customersFixed++;
        updated = true;
      }
    }

    if (customer.participants && customer.participants.length > 0) {
      const updatedParticipants = customer.participants.map(p => {
        const inferredDepGender = inferGenderFromName(p.firstName, p.relationship);
        if (inferredDepGender && inferredDepGender !== p.gender) {
          console.log(`  Dependent ${p.firstName} ${p.surname} (${p.relationship}): ${p.gender} -> ${inferredDepGender}`);
          participantsUpdated = true;
          dependentsFixed++;
          return { ...p, gender: inferredDepGender };
        }
        return p;
      });

      if (participantsUpdated) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            participants: updatedParticipants,
            last_updated: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (updateError) {
          console.error(`Error updating participants for ${customer.policy_number}:`, updateError);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Customers fixed: ${customersFixed}`);
  console.log(`Dependents fixed: ${dependentsFixed}`);
  console.log(`Total fixed: ${customersFixed + dependentsFixed}`);
}

async function main() {
  try {
    await fixCustomerGenders();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
