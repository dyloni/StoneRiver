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

const HTML_FILE = './public/PHnD.html';

function parseHTMLTable() {
  console.log('Reading HTML file...');
  const html = readFileSync(HTML_FILE, 'utf-8');

  const rows = [];
  const trRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
  const tdRegex = /<td[^>]*>(.*?)<\/td>/gs;

  let match;
  while ((match = trRegex.exec(html)) !== null) {
    const rowHTML = match[1];
    const cells = [];

    let cellMatch;
    while ((cellMatch = tdRegex.exec(rowHTML)) !== null) {
      let cellContent = cellMatch[1];
      cellContent = cellContent.replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '');
      cellContent = cellContent.replace(/<[^>]+>/g, '');
      cellContent = cellContent.trim();
      cells.push(cellContent);
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  console.log(`Found ${rows.length} rows`);

  if (rows.length > 0) {
    console.log('\nFirst row (headers):', rows[0]);
    console.log('\nSample data row:', rows[1]);
  }

  return rows;
}

function categorizeRecords(rows) {
  if (rows.length < 2) {
    console.log('No data rows found');
    return { policyHolders: [], dependents: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const policyHolders = new Map();
  const dependents = [];

  for (const row of dataRows) {
    if (row.length < 10) continue;

    const policyHolder = row[0] || '';
    const policyNumber = row[1] || '';
    const relationship = row[2] || '';
    const firstName = row[3] || '';
    const middleName = row[4] || '';
    const lastName = row[5] || '';
    const sex = row[6] || '';
    const type = row[7] || '';
    const idNumber = row[8] || '';
    const phone = row[9] || '';
    const dob = row[10] || '';
    const policy = row[11] || '';
    const policyPremium = row[12] || '0';
    const addonPremium = row[13] || '0';
    const totalPremium = row[14] || '0';
    const sumAssured = row[15] || '0';
    const agent = row[16] || '';
    const depStatus = row[17] || '';
    const subStatus = row[18] || '';
    const uuid = row[19] || '';
    const subscriberUuid = row[20] || '';

    const recordType = type.toLowerCase();

    if (recordType.includes('policy holder')) {
      policyHolders.set(policyNumber, {
        policyHolder,
        policyNumber,
        firstName,
        middleName,
        lastName,
        sex,
        idNumber,
        phone,
        dob,
        policy,
        policyPremium,
        addonPremium,
        totalPremium,
        sumAssured,
        agent,
        status: subStatus,
        uuid: subscriberUuid,
        dependents: []
      });
    } else if (recordType.includes('dependent') || recordType.includes('spouse') || recordType.includes('child')) {
      dependents.push({
        policyNumber,
        subscriberUuid,
        relationship,
        firstName,
        middleName,
        lastName,
        sex,
        idNumber,
        phone,
        dob,
        policy,
        policyPremium,
        addonPremium,
        totalPremium,
        status: depStatus,
        uuid
      });
    }
  }

  console.log(`\nCategorized records:`);
  console.log(`- Policy Holders: ${policyHolders.size}`);
  console.log(`- Dependents: ${dependents.length}`);

  return { policyHolders: Array.from(policyHolders.values()), dependents };
}

function mapCustomerData(row, customerId) {
  const now = new Date().toISOString();

  const firstName = row.firstName.trim() || 'Unknown';
  const surname = row.lastName.trim() || 'Unknown';
  const policyNumber = row.policyNumber.trim();

  if (!policyNumber || policyNumber === '') {
    return null;
  }

  const statusMap = {
    'Active': 'Active',
    'Express': 'Express',
    'LAPSED': 'Inactive',
    'NEW_TERMINATED': 'Cancelled',
    'NEW_SUSPENDED': 'Suspended'
  };

  const status = statusMap[row.status] || 'Active';

  const packageMap = {
    'Chitomborwizi Lite': 'Chitomborwizi Lite',
    'Chitomborwizi Standard': 'Chitomborwizi Standard',
    'Chitomborwizi Premium': 'Chitomborwizi Premium',
    'Chitomborwizi Muslim Standard': 'Chitomborwizi Standard'
  };

  const funeralPackage = packageMap[row.policy] || 'Chitomborwizi Lite';

  const gender = (row.sex || 'Male').toLowerCase().includes('female') ? 'Female' : 'Male';

  return {
    id: customerId,
    policy_number: policyNumber,
    first_name: firstName,
    surname: surname,
    id_number: row.idNumber.trim() || 'N/A',
    date_of_birth: parseDateOfBirth(row.dob),
    gender: gender,
    phone: row.phone.trim() || 'N/A',
    email: 'imported@example.com',
    street_address: 'N/A',
    town: 'Harare',
    postal_address: 'N/A',
    funeral_package: funeralPackage,
    status: status,
    inception_date: now,
    cover_date: now,
    assigned_agent_id: 1,
    policy_premium: parseFloat(row.policyPremium.replace(/,/g, '')) || 0,
    addon_premium: parseFloat(row.addonPremium.replace(/,/g, '')) || 0,
    total_premium: parseFloat(row.totalPremium.replace(/,/g, '')) || 0,
    premium_period: 'Monthly',
    latest_receipt_date: null,
    participants: [],
    date_created: now,
    last_updated: now,
  };
}

function mapDependentData(row, participantId) {
  const relationshipMap = {
    'Dependent': 'Child',
    'Spouse': 'Spouse',
    'Child': 'Child'
  };

  const relationship = relationshipMap[row.relationship] || 'Child';
  const gender = (row.sex || 'Male').toLowerCase().includes('female') ? 'Female' : 'Male';

  return {
    id: participantId,
    uuid: row.uuid || `dep-${participantId}-${Date.now()}`,
    firstName: row.firstName.trim(),
    surname: row.lastName.trim(),
    relationship: relationship,
    dateOfBirth: parseDateOfBirth(row.dob),
    idNumber: row.idNumber.trim() || '',
    gender: gender,
    isStudent: false,
    phone: row.phone.trim() || '',
    email: '',
    streetAddress: '',
    town: '',
    postalAddress: '',
    medicalPackage: 'No Medical Aid',
    cashBackAddon: 'No Cash Back',
  };
}

function parseDateOfBirth(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return '1990-01-01';
  }

  const formats = [
    /(\d{2})-([A-Za-z]{3})-(\d{4})/,
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/
  ];

  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  const match1 = dateStr.match(formats[0]);
  if (match1) {
    const day = match1[1];
    const month = monthMap[match1[2]] || '01';
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  const match2 = dateStr.match(formats[1]);
  if (match2) {
    const day = match2[1];
    const month = match2[2];
    const year = match2[3];
    return `${year}-${month}-${day}`;
  }

  return dateStr.trim() || '1990-01-01';
}

async function getExistingCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, policy_number, id_number, participants');

  if (error) {
    console.error('Error fetching existing customers:', error);
    return [];
  }

  return data || [];
}

async function getNextCustomerId() {
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  return data[0].id + 1;
}

async function importPolicyHolders(policyHolders, existingCustomers) {
  console.log('\n=== Importing Policy Holders ===');

  let nextId = await getNextCustomerId();
  const toInsert = [];
  const toUpdate = [];
  let skipped = 0;

  for (const row of policyHolders) {
    const customer = mapCustomerData(row, nextId);

    if (!customer) {
      skipped++;
      continue;
    }

    const existing = existingCustomers.find(
      c => c.policy_number === customer.policy_number ||
           (c.id_number && customer.id_number && c.id_number !== 'N/A' && c.id_number === customer.id_number)
    );

    if (existing) {
      toUpdate.push({ ...customer, id: existing.id });
    } else {
      toInsert.push(customer);
      nextId++;
    }
  }

  console.log(`To insert: ${toInsert.length}`);
  console.log(`To update: ${toUpdate.length}`);
  console.log(`Skipped (invalid): ${skipped}`);

  if (toInsert.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('customers').insert(batch);

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✓ Inserted batch ${i / batchSize + 1} (${batch.length} customers)`);
      }
    }
  }

  for (const customer of toUpdate) {
    const { error } = await supabase
      .from('customers')
      .update({
        first_name: customer.first_name,
        surname: customer.surname,
        phone: customer.phone,
        status: customer.status,
        last_updated: customer.last_updated,
      })
      .eq('id', customer.id);

    if (error) {
      console.error(`Error updating customer ${customer.id}:`, error);
    }
  }

  if (toUpdate.length > 0) {
    console.log(`✓ Updated ${toUpdate.length} existing customers`);
  }
}

async function importDependents(dependents, existingCustomers) {
  console.log('\n=== Importing Dependents ===');

  let added = 0;
  let skipped = 0;

  for (const row of dependents) {
    const customer = existingCustomers.find(
      c => c.policy_number === row.policyNumber
    );

    if (!customer) {
      skipped++;
      continue;
    }

    const participants = customer.participants || [];
    const nextParticipantId = participants.length > 0
      ? Math.max(...participants.map(p => p.id)) + 1
      : 1;

    const dependent = mapDependentData(row, nextParticipantId);

    if (!dependent || !dependent.firstName || !dependent.surname) {
      skipped++;
      continue;
    }

    const existingDependent = participants.find(
      p => (p.idNumber && dependent.idNumber && p.idNumber === dependent.idNumber) ||
           (p.firstName === dependent.firstName && p.surname === dependent.surname && p.dateOfBirth === dependent.dateOfBirth)
    );

    if (existingDependent) {
      skipped++;
      continue;
    }

    participants.push(dependent);

    const { error } = await supabase
      .from('customers')
      .update({
        participants: participants,
        last_updated: new Date().toISOString()
      })
      .eq('id', customer.id);

    if (error) {
      console.error(`Error adding dependent to customer ${customer.id}:`, error);
    } else {
      added++;
      customer.participants = participants;
    }
  }

  console.log(`✓ Added ${added} dependents`);
  console.log(`Skipped: ${skipped}`);
}

async function main() {
  try {
    console.log('=== Starting HTML Import ===\n');

    const rows = parseHTMLTable();

    if (rows.length === 0) {
      console.log('No data found in HTML file');
      return;
    }

    const { policyHolders, dependents } = categorizeRecords(rows);

    const existingCustomers = await getExistingCustomers();
    console.log(`\nFound ${existingCustomers.length} existing customers in database`);

    await importPolicyHolders(policyHolders, existingCustomers);

    const updatedCustomers = await getExistingCustomers();

    await importDependents(dependents, updatedCustomers);

    console.log('\n=== Import Complete ===');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
