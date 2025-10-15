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

function parseHTMLTable(htmlFile) {
  console.log(`Reading ${htmlFile}...`);
  const html = readFileSync(htmlFile, 'utf-8');

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
  return rows;
}

function parseDateOfBirth(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return '1990-01-01';
  }

  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  const match1 = dateStr.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (match1) {
    const day = match1[1];
    const month = monthMap[match1[2]] || '01';
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  const match2 = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match2) {
    const day = match2[1];
    const month = match2[2];
    const year = match2[3];
    return `${year}-${month}-${day}`;
  }

  return dateStr.trim() || '1990-01-01';
}

function parsePaymentDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString();
  }

  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  const match1 = dateStr.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (match1) {
    const day = match1[1];
    const month = monthMap[match1[2]] || '01';
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  return dateStr.trim();
}

async function deleteAllRecords() {
  console.log('\n=== STEP 1: Deleting ALL existing records ===\n');

  console.log('Deleting all payments...');
  const { error: paymentsError, count: paymentsCount } = await supabase
    .from('payments')
    .delete()
    .neq('id', 0);

  if (paymentsError && paymentsError.code !== 'PGRST116') {
    console.error('Error deleting payments:', paymentsError);
  } else {
    console.log('✓ Deleted all payment records');
  }

  console.log('Deleting all customers (and their dependents)...');
  const { error: customersError, count: customersCount } = await supabase
    .from('customers')
    .delete()
    .neq('id', 0);

  if (customersError && customersError.code !== 'PGRST116') {
    console.error('Error deleting customers:', customersError);
  } else {
    console.log('✓ Deleted all customer records');
  }

  console.log('\n✓ Database cleanup complete\n');
}

function processPoliciesAndDependents(rows) {
  if (rows.length < 2) {
    console.log('No data rows found');
    return { policyHolders: [], dependents: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const policyHoldersMap = new Map();
  const allDependents = [];

  for (const row of dataRows) {
    if (row.length < 10) continue;

    const policyHolder = row[0] || '';
    const policyNumber = (row[1] || '').trim().toUpperCase();
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

    if (!policyNumber) continue;

    const recordType = type.toLowerCase();

    if (recordType.includes('policy holder')) {
      if (!policyHoldersMap.has(policyNumber)) {
        policyHoldersMap.set(policyNumber, {
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
      }
    } else if (recordType.includes('dependent') || recordType.includes('spouse') || recordType.includes('child')) {
      allDependents.push({
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

  console.log(`\nProcessed:`);
  console.log(`- Policy Holders: ${policyHoldersMap.size}`);
  console.log(`- Dependents: ${allDependents.length}`);

  return {
    policyHolders: Array.from(policyHoldersMap.values()),
    dependents: allDependents
  };
}

async function importPolicyHolders(policyHolders) {
  console.log('\n=== STEP 2: Importing Policy Holders ===\n');

  const toInsert = [];
  let skipped = 0;

  for (let i = 0; i < policyHolders.length; i++) {
    const row = policyHolders[i];
    const customerId = i + 1;

    const firstName = row.firstName.trim() || 'Unknown';
    const surname = row.lastName.trim() || 'Unknown';
    const policyNumber = row.policyNumber.trim().toUpperCase();

    if (!policyNumber || policyNumber === '') {
      skipped++;
      continue;
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
    const now = new Date().toISOString();

    const customer = {
      id: customerId,
      uuid: row.uuid || null,
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
      policy_premium: parseFloat((row.policyPremium || '0').replace(/,/g, '')) || 0,
      addon_premium: parseFloat((row.addonPremium || '0').replace(/,/g, '')) || 0,
      total_premium: parseFloat((row.totalPremium || '0').replace(/,/g, '')) || 0,
      premium_period: 'Monthly',
      latest_receipt_date: null,
      participants: [],
      date_created: now,
      last_updated: now,
    };

    toInsert.push(customer);
  }

  console.log(`To insert: ${toInsert.length}`);
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

  return toInsert;
}

async function importDependents(dependents, policyHolders) {
  console.log('\n=== STEP 3: Importing Dependents ===\n');

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, policy_number, participants');

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  const customerMap = new Map(customers.map(c => [c.policy_number.toUpperCase(), c]));

  let added = 0;
  let skipped = 0;

  for (const row of dependents) {
    const policyNumber = row.policyNumber.trim().toUpperCase();
    const customer = customerMap.get(policyNumber);

    if (!customer) {
      skipped++;
      continue;
    }

    const participants = customer.participants || [];
    const nextParticipantId = participants.length > 0
      ? Math.max(...participants.map(p => p.id)) + 1
      : 1;

    const relationshipMap = {
      'Dependent': 'Child',
      'Spouse': 'Spouse',
      'Child': 'Child'
    };

    const relationship = relationshipMap[row.relationship] || 'Child';
    const gender = (row.sex || 'Male').toLowerCase().includes('female') ? 'Female' : 'Male';

    const dependent = {
      id: nextParticipantId,
      uuid: row.uuid || `dep-${nextParticipantId}-${Date.now()}`,
      firstName: row.firstName.trim() || 'Unknown',
      surname: row.lastName.trim() || 'Unknown',
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

    if (!dependent.firstName || !dependent.surname) {
      skipped++;
      continue;
    }

    participants.push(dependent);

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        participants: participants,
        last_updated: new Date().toISOString()
      })
      .eq('id', customer.id);

    if (updateError) {
      console.error(`Error adding dependent to customer ${customer.id}:`, updateError);
    } else {
      added++;
      customer.participants = participants;
      customerMap.set(policyNumber, customer);
    }
  }

  console.log(`✓ Added ${added} dependents`);
  console.log(`Skipped: ${skipped}`);
}

function processPayments(rows) {
  if (rows.length < 2) {
    console.log('No payment data found');
    return [];
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const payments = [];

  for (const row of dataRows) {
    if (row.length < 10) continue;

    const systemReceiptNumber = row[0] || '';
    const physicalReceiptNumber = row[1] || '';
    const subscriber = row[2] || '';
    const date = row[3] || '';
    const amount = row[4] || '0';
    const exchangeRate = row[5] || '1';
    const category = row[6] || '';
    const account = row[7] || '';
    const user = row[8] || '';
    const comments = row[9] || '';
    const physicalReceipt2 = row[10] || '';
    const paymentPeriod = row[11] || '';
    const premiumPeriod = row[12] || '';
    const createdAt = row[13] || '';
    const updatedAt = row[14] || '';
    const subscriberUuid = row[15] || '';
    const subscriberNationalID = row[16] || '';
    const uuid = row[17] || '';

    payments.push({
      systemReceiptNumber,
      physicalReceiptNumber,
      subscriber,
      date,
      amount: parseFloat(amount.replace(/,/g, '').trim()) || 0,
      exchangeRate,
      category,
      account,
      user,
      comments,
      paymentPeriod,
      premiumPeriod,
      createdAt,
      updatedAt,
      subscriberUuid,
      subscriberNationalID,
      uuid
    });
  }

  console.log(`\nProcessed ${payments.length} payment records`);
  return payments;
}

async function importPayments(payments) {
  console.log('\n=== STEP 4: Importing Payments ===\n');

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, policy_number, uuid, id_number, first_name, surname');

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  const customerByUuid = new Map(customers.map(c => [c.uuid, c]));
  const customerByName = new Map();
  customers.forEach(c => {
    const fullName = `${c.first_name} ${c.surname}`.toLowerCase();
    customerByName.set(fullName, c);
  });

  const toInsert = [];
  let matched = 0;
  let unmatched = 0;

  for (const payment of payments) {
    let customer = null;

    if (payment.subscriberUuid) {
      customer = customerByUuid.get(payment.subscriberUuid);
    }

    if (!customer && payment.subscriber) {
      const searchName = payment.subscriber.toLowerCase().trim();
      customer = customerByName.get(searchName);
    }

    if (!customer) {
      unmatched++;
      continue;
    }

    matched++;

    const paymentRecord = {
      customer_id: customer.id,
      policy_number: customer.policy_number,
      payment_amount: payment.amount,
      payment_method: payment.account || 'Cash',
      payment_period: payment.paymentPeriod || 'N/A',
      receipt_filename: null,
      recorded_by_agent_id: 1,
      payment_date: parsePaymentDate(payment.date),
      is_legacy_receipt: true,
      legacy_receipt_notes: `System Receipt: ${payment.systemReceiptNumber}, Physical Receipt: ${payment.physicalReceiptNumber}, User: ${payment.user}`
    };

    toInsert.push(paymentRecord);
  }

  console.log(`Matched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`To insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from('payments').insert(batch);

      if (insertError) {
        console.error(`Error inserting payment batch ${i / batchSize + 1}:`, insertError);
      } else {
        console.log(`✓ Inserted payment batch ${i / batchSize + 1} (${batch.length} payments)`);
      }
    }
  }
}

async function verifyImport() {
  console.log('\n=== STEP 5: Verifying Import ===\n');

  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, participants');

  if (customersError) {
    console.error('Error fetching customers:', customersError);
  } else {
    const totalDependents = customers.reduce((sum, c) => sum + (c.participants?.length || 0), 0);
    console.log(`✓ Customers imported: ${customers.length}`);
    console.log(`✓ Dependents imported: ${totalDependents}`);
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id');

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  } else {
    console.log(`✓ Payments imported: ${payments.length}`);
  }
}

async function main() {
  try {
    console.log('=== COMPLETE DATA IMPORT ===\n');
    console.log('This will DELETE all existing data and import fresh data from Excel files.\n');

    await deleteAllRecords();

    const policyRows = parseHTMLTable('./public/PHnD.html');
    const { policyHolders, dependents } = processPoliciesAndDependents(policyRows);

    const insertedCustomers = await importPolicyHolders(policyHolders);

    await importDependents(dependents, insertedCustomers);

    const paymentRows = parseHTMLTable('./public/R.html');
    const payments = processPayments(paymentRows);

    await importPayments(payments);

    await verifyImport();

    console.log('\n=== IMPORT COMPLETE ===');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
