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

async function verifyAgentAssignments() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AGENT ASSIGNMENT VERIFICATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, first_name, surname')
    .order('id');

  if (agentError) {
    console.error('Error fetching agents:', agentError);
    return;
  }

  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, policy_number, first_name, surname, assigned_agent_id');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  const agentCustomerCount = new Map();
  const unassignedCustomers = [];

  agents.forEach(agent => {
    agentCustomerCount.set(agent.id, {
      name: `${agent.first_name} ${agent.surname}`,
      count: 0,
      customers: []
    });
  });

  customers.forEach(customer => {
    if (!customer.assigned_agent_id) {
      unassignedCustomers.push(customer);
    } else {
      const agentData = agentCustomerCount.get(customer.assigned_agent_id);
      if (agentData) {
        agentData.count++;
        if (agentData.customers.length < 3) {
          agentData.customers.push(`${customer.policy_number} (${customer.first_name} ${customer.surname})`);
        }
      }
    }
  });

  console.log('CUSTOMERS PER AGENT:');
  console.log('─────────────────────────────────────────────────────────────');

  const sortedAgents = Array.from(agentCustomerCount.entries())
    .sort((a, b) => b[1].count - a[1].count);

  sortedAgents.forEach(([agentId, data]) => {
    if (data.count > 0) {
      console.log(`\n  ${data.name} (ID: ${agentId}): ${data.count} customers`);
      data.customers.forEach(customer => {
        console.log(`    - ${customer}`);
      });
      if (data.count > 3) {
        console.log(`    ... and ${data.count - 3} more`);
      }
    }
  });

  if (unassignedCustomers.length > 0) {
    console.log('\n\nUNASSIGNED CUSTOMERS:');
    console.log('─────────────────────────────────────────────────────────────');
    unassignedCustomers.slice(0, 10).forEach(customer => {
      console.log(`  ${customer.policy_number} - ${customer.first_name} ${customer.surname}`);
    });
    if (unassignedCustomers.length > 10) {
      console.log(`  ... and ${unassignedCustomers.length - 10} more`);
    }
  }

  console.log('\n\nSUMMARY:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Total Agents: ${agents.length}`);
  console.log(`  Total Customers: ${customers.length}`);
  console.log(`  Assigned Customers: ${customers.length - unassignedCustomers.length}`);
  console.log(`  Unassigned Customers: ${unassignedCustomers.length}`);
  console.log(`  Agents with Customers: ${sortedAgents.filter(([_, data]) => data.count > 0).length}`);

  const avgCustomersPerAgent = (customers.length - unassignedCustomers.length) / agents.length;
  console.log(`  Average Customers per Agent: ${avgCustomersPerAgent.toFixed(1)}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

verifyAgentAssignments();
