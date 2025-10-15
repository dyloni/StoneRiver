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
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function extractTextFromTd(tdContent) {
  const withoutTags = tdContent.replace(/<[^>]+>/g, '|');
  const parts = withoutTags.split('|').filter(p => p.trim());
  return parts.length > 0 ? parts[parts.length - 1].trim() : '';
}

async function assignAgentsFromHTML() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ASSIGNING AGENTS FROM HTML FILE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const htmlContent = readFileSync('public/PHnD.html', 'utf-8');

  const rowMatches = htmlContent.match(/<tr[^>]*>[\s\S]*?<\/tr>/g);

  if (!rowMatches) {
    console.error('No table rows found');
    return;
  }

  console.log(`Found ${rowMatches.length} rows in HTML file\n`);

  const assignments = new Map();

  for (let i = 1; i < rowMatches.length; i++) {
    const row = rowMatches[i];
    const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);

    if (!cellMatches || cellMatches.length < 17) continue;

    const policyNumber = extractTextFromTd(cellMatches[1]);
    const relationship = extractTextFromTd(cellMatches[2]);
    const agentName = extractTextFromTd(cellMatches[16]);

    if (relationship === 'Policy Holder' && policyNumber && agentName) {
      assignments.set(policyNumber.toUpperCase(), agentName);
    }
  }

  console.log(`Extracted ${assignments.size} policy holder agent assignments\n`);

  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, first_name, surname');

  if (agentError) {
    console.error('Error fetching agents:', agentError);
    return;
  }

  console.log(`Found ${agents.length} agents in database\n`);

  const agentMap = new Map();
  agents.forEach(agent => {
    const fullName = `${agent.first_name} ${agent.surname}`.trim();
    agentMap.set(fullName.toLowerCase(), agent.id);
  });

  console.log('Agent Mapping:');
  console.log('─────────────────────────────────────────────────────────────');
  agents.forEach(agent => {
    const fullName = `${agent.first_name} ${agent.surname}`.trim();
    console.log(`  ${fullName} → ID: ${agent.id}`);
  });
  console.log('');

  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, policy_number, first_name, surname, assigned_agent_id');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  console.log(`Found ${customers.length} customers in database\n`);

  let updated = 0;
  let notFound = 0;
  let agentNotInDB = 0;
  const agentNotInDBList = new Set();

  for (const customer of customers) {
    const policyNumber = customer.policy_number.toUpperCase();
    const agentName = assignments.get(policyNumber);

    if (!agentName) {
      notFound++;
      continue;
    }

    const agentId = agentMap.get(agentName.toLowerCase());

    if (!agentId) {
      agentNotInDB++;
      agentNotInDBList.add(agentName);
      continue;
    }

    if (customer.assigned_agent_id === agentId) {
      continue;
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({ assigned_agent_id: agentId })
      .eq('id', customer.id);

    if (updateError) {
      console.error(`Error updating ${policyNumber}:`, updateError);
    } else {
      updated++;
      if (updated <= 10) {
        console.log(`✓ Updated ${policyNumber} (${customer.first_name} ${customer.surname}) → ${agentName}`);
      }
    }
  }

  if (updated > 10) {
    console.log(`  ... and ${updated - 10} more customers`);
  }

  console.log('');
  console.log('SUMMARY:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Total Customers: ${customers.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Not in HTML: ${notFound}`);
  console.log(`  Agent Not in DB: ${agentNotInDB}`);

  if (agentNotInDBList.size > 0) {
    console.log('');
    console.log('AGENTS NOT FOUND IN DATABASE:');
    console.log('─────────────────────────────────────────────────────────────');
    agentNotInDBList.forEach(name => console.log(`  - ${name}`));
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AGENT ASSIGNMENT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

assignAgentsFromHTML();
