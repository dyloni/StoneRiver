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

const agentNames = [
  "Allan Gopole",
  "Arisa Bwanali",
  "Brenda Bvirinyangwe",
  "Brighton Chipamhadze",
  "Chadamoyo Mambunda",
  "Chikomborero Daka",
  "Christine Mutambudzi",
  "Collins P Gadziso",
  "Cosmas Mahwe",
  "Denzel Namanya",
  "Emilda Kusangaya",
  "Emily Mukakiwa",
  "Eric Namanya",
  "Forget Mushonga",
  "Freddy Chirove",
  "Head Office",
  "Jaffary Dini",
  "Jairos Dziwo/Mutasa",
  "Joyce Chisvo",
  "Juma Idana",
  "Juma Makanjira",
  "Kudakwashe Nyamwandura",
  "Lajabu Bisa",
  "Lecious Shekede",
  "Levy Idana",
  "Mcdonald Mapeto",
  "Memory Banda",
  "Miriam Kiri",
  "Miriam Matola",
  "Patience Chagonyera",
  "Patson Kutama",
  "Paul Muzondo",
  "Prince Mayuwa",
  "Rhukiya Salamu",
  "Rosemary Useni",
  "Rufaro Sithole",
  "Samantha Hlongwane",
  "Samson Frank",
  "Shaibu Sanudi",
  "Shaibu Siki",
  "Stanford Gopole",
  "Tafadzwa Masendeke",
  "Takudzwa Masvinge",
  "Tashidid Alifi",
  "Tawanda Pilime",
  "Warren Mudaviri"
];

function parseAgentName(fullName) {
  const parts = fullName.trim().split(' ');

  if (parts.length === 1) {
    return { firstName: parts[0], surname: parts[0] };
  } else if (parts.length === 2) {
    return { firstName: parts[0], surname: parts[1] };
  } else {
    const firstName = parts.slice(0, -1).join(' ');
    const surname = parts[parts.length - 1];
    return { firstName, surname };
  }
}

async function getExistingAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('id, first_name, surname');

  if (error) {
    console.error('Error fetching existing agents:', error);
    return [];
  }

  return data || [];
}

async function getNextAgentId() {
  const { data, error } = await supabase
    .from('agents')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  return data[0].id + 1;
}

async function createAgents() {
  console.log('=== Creating Agent Accounts ===\n');

  const existingAgents = await getExistingAgents();
  console.log(`Found ${existingAgents.length} existing agents`);

  let nextId = await getNextAgentId();
  const toInsert = [];
  let created = 0;
  let skipped = 0;

  for (const fullName of agentNames) {
    const { firstName, surname } = parseAgentName(fullName);

    const exists = existingAgents.find(
      agent =>
        agent.first_name.toLowerCase().trim() === firstName.toLowerCase().trim() &&
        agent.surname.toLowerCase().trim() === surname.toLowerCase().trim()
    );

    if (exists) {
      console.log(`Skipping ${fullName} (already exists)`);
      skipped++;
      continue;
    }

    const agent = {
      id: nextId,
      first_name: firstName,
      surname: surname,
      email: `${firstName.toLowerCase().replace(/\s+/g, '.')}.${surname.toLowerCase().replace(/\s+/g, '.')}@stoneriver.com`,
      password: 'Stoneriver#@12',
      requires_password_change: true,
      auth_user_id: null,
      profile_picture_url: null
    };

    toInsert.push(agent);
    nextId++;
  }

  console.log(`\nAgents to create: ${toInsert.length}`);
  console.log(`Agents to skip: ${skipped}`);

  if (toInsert.length > 0) {
    const { error } = await supabase.from('agents').insert(toInsert);

    if (error) {
      console.error('Error inserting agents:', error);
      return;
    }

    created = toInsert.length;
    console.log(`\n✓ Successfully created ${created} agent accounts`);
    console.log('\nDefault password: Stoneriver#@12');
    console.log('All agents will be required to change their password on first login');
  }
}

async function main() {
  try {
    await createAgents();
    console.log('\n=== Complete ===');
  } catch (error) {
    console.error('Operation failed:', error);
    process.exit(1);
  }
}

main();
