import XLSX from 'xlsx';
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
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EXCEL_FILE = './public/Untitled spreadsheet (2).xlsx';

function parseExcelData() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`Found ${data.length} rows in sheet: ${sheetName}`);

  if (data.length > 0) {
    console.log('\nAvailable columns:', Object.keys(data[0]));
    console.log('\nSample row:', JSON.stringify(data[0], null, 2));
  }

  return data;
}

function categorizeRecords(data) {
  const policyHolders = [];
  const dependents = [];
  const receipts = [];

  for (const row of data) {
    const recordType = (row.RecordType || row.Type || row.type || '').toString().trim().toUpperCase();

    if (recordType === 'P') {
      policyHolders.push(row);
    } else if (recordType === 'PHND' || recordType === 'D') {
      dependents.push(row);
    } else if (recordType === 'R') {
      receipts.push(row);
    } else {
      policyHolders.push(row);
    }
  }

  console.log(`\nCategorized records:`);
  console.log(`- Policy Holders: ${policyHolders.length}`);
  console.log(`- Dependents: ${dependents.length}`);
  console.log(`- Receipts: ${receipts.length}`);

  return { policyHolders, dependents, receipts };
}

function mapCustomerData(row, nextId) {
  const now = new Date().toISOString();

  const firstName = (row.FirstName || row.first_name || row.Name || '').toString().trim();
  const surname = (row.Surname || row.surname || row.LastName || '').toString().trim();
  const idNumber = (row.IDNumber || row.id_number || row.ID || '').toString().trim();
  const policyNumber = (row.PolicyNumber || row.policy_number || row.Policy || '').toString().trim();
  const phone = (row.Phone || row.phone || row.Mobile || '').toString().trim();
  const email = (row.Email || row.email || '').toString().trim() || 'no-email@example.com';
  const dateOfBirth = (row.DateOfBirth || row.date_of_birth || row.DOB || '').toString().trim();
  const gender = (row.Gender || row.gender || '').toString().trim() || 'Male';
  const town = (row.Town || row.town || row.City || '').toString().trim() || 'Harare';
  const streetAddress = (row.StreetAddress || row.street_address || row.Address || '').toString().trim() || 'N/A';
  const postalAddress = (row.PostalAddress || row.postal_address || '').toString().trim() || 'N/A';
  const funeralPackage = (row.FuneralPackage || row.funeral_package || row.Package || '').toString().trim() || 'Chitomborwizi Lite';
  const status = (row.Status || row.status || '').toString().trim() || 'Active';
  const inceptionDate = (row.InceptionDate || row.inception_date || row.StartDate || now).toString().trim();
  const coverDate = (row.CoverDate || row.cover_date || inceptionDate).toString().trim();

  const policyPremium = parseFloat(row.PolicyPremium || row.policy_premium || row.Premium || 0);
  const addonPremium = parseFloat(row.AddonPremium || row.addon_premium || 0);
  const totalPremium = parseFloat(row.TotalPremium || row.total_premium || policyPremium + addonPremium);

  if (!policyNumber || !firstName || !surname) {
    return null;
  }

  return {
    id: nextId,
    policy_number: policyNumber,
    first_name: firstName,
    surname: surname,
    id_number: idNumber || 'N/A',
    date_of_birth: dateOfBirth || '1990-01-01',
    gender: gender,
    phone: phone || 'N/A',
    email: email,
    street_address: streetAddress,
    town: town,
    postal_address: postalAddress,
    funeral_package: funeralPackage,
    status: status,
    inception_date: inceptionDate,
    cover_date: coverDate,
    assigned_agent_id: parseInt(row.AgentID || row.assigned_agent_id || 1),
    policy_premium: policyPremium,
    addon_premium: addonPremium,
    total_premium: totalPremium,
    premium_period: (row.PremiumPeriod || row.premium_period || 'Monthly').toString().trim(),
    latest_receipt_date: (row.LatestReceiptDate || row.latest_receipt_date || null),
    participants: [],
    date_created: now,
    last_updated: now,
  };
}

function mapDependentData(row, participantId) {
  const firstName = (row.FirstName || row.first_name || row.Name || '').toString().trim();
  const surname = (row.Surname || row.surname || row.LastName || '').toString().trim();
  const relationship = (row.Relationship || row.relationship || 'Child').toString().trim();
  const dateOfBirth = (row.DateOfBirth || row.date_of_birth || row.DOB || '2000-01-01').toString().trim();
  const idNumber = (row.IDNumber || row.id_number || row.ID || '').toString().trim();
  const gender = (row.Gender || row.gender || '').toString().trim() || 'Male';
  const phone = (row.Phone || row.phone || '').toString().trim();
  const email = (row.Email || row.email || '').toString().trim();

  if (!firstName || !surname) {
    return null;
  }

  return {
    id: participantId,
    uuid: crypto.randomUUID ? crypto.randomUUID() : `dep-${participantId}-${Date.now()}`,
    firstName: firstName,
    surname: surname,
    relationship: relationship,
    dateOfBirth: dateOfBirth,
    idNumber: idNumber || '',
    gender: gender,
    isStudent: false,
    phone: phone || '',
    email: email || '',
    streetAddress: '',
    town: '',
    postalAddress: '',
    medicalPackage: 'No Medical Aid',
    cashBackAddon: 'No Cash Back',
  };
}

function mapPaymentData(row, paymentId) {
  const policyNumber = (row.PolicyNumber || row.policy_number || row.Policy || '').toString().trim();
  const paymentAmount = parseFloat(row.PaymentAmount || row.payment_amount || row.Amount || 0);
  const paymentMethod = (row.PaymentMethod || row.payment_method || row.Method || 'Cash').toString().trim();
  const paymentPeriod = (row.PaymentPeriod || row.payment_period || row.Period || 'Monthly').toString().trim();
  const paymentDate = (row.PaymentDate || row.payment_date || row.Date || new Date().toISOString()).toString().trim();
  const receiptFilename = (row.ReceiptFilename || row.receipt_filename || row.Receipt || '').toString().trim();

  if (!policyNumber || paymentAmount <= 0) {
    return null;
  }

  return {
    id: paymentId,
    policy_number: policyNumber,
    payment_amount: paymentAmount,
    payment_method: paymentMethod,
    payment_period: paymentPeriod,
    payment_date: paymentDate,
    receipt_filename: receiptFilename || null,
    recorded_by_agent_id: parseInt(row.AgentID || row.recorded_by_agent_id || 1),
    customer_id: null,
  };
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

async function getNextPaymentId() {
  const { data, error } = await supabase
    .from('payments')
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
           (c.id_number && customer.id_number && c.id_number === customer.id_number)
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
    const { data, error } = await supabase
      .from('customers')
      .insert(toInsert);

    if (error) {
      console.error('Error inserting customers:', error);
    } else {
      console.log(`✓ Inserted ${toInsert.length} new customers`);
    }
  }

  for (const customer of toUpdate) {
    const { error } = await supabase
      .from('customers')
      .update({
        first_name: customer.first_name,
        surname: customer.surname,
        phone: customer.phone,
        email: customer.email,
        street_address: customer.street_address,
        town: customer.town,
        postal_address: customer.postal_address,
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
    const policyNumber = (row.PolicyNumber || row.policy_number || row.Policy || '').toString().trim();
    const policyHolderIdNumber = (row.PolicyHolderID || row.policy_holder_id || row.HolderID || '').toString().trim();

    const customer = existingCustomers.find(
      c => c.policy_number === policyNumber ||
           (policyHolderIdNumber && c.id_number === policyHolderIdNumber)
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

    if (!dependent) {
      skipped++;
      continue;
    }

    const existingDependent = participants.find(
      p => p.idNumber && dependent.idNumber && p.idNumber === dependent.idNumber
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

async function importReceipts(receipts, existingCustomers) {
  console.log('\n=== Importing Receipts/Payments ===');

  let nextId = await getNextPaymentId();
  const toInsert = [];
  let skipped = 0;

  for (const row of receipts) {
    const payment = mapPaymentData(row, nextId);

    if (!payment) {
      skipped++;
      continue;
    }

    const customer = existingCustomers.find(
      c => c.policy_number === payment.policy_number
    );

    if (!customer) {
      skipped++;
      continue;
    }

    payment.customer_id = customer.id;
    toInsert.push(payment);
    nextId++;
  }

  console.log(`To insert: ${toInsert.length}`);
  console.log(`Skipped (invalid/no match): ${skipped}`);

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('payments')
      .insert(toInsert);

    if (error) {
      console.error('Error inserting payments:', error);
    } else {
      console.log(`✓ Inserted ${toInsert.length} payments`);
    }
  }
}

async function main() {
  try {
    console.log('=== Starting Bulk Import ===\n');

    const rawData = parseExcelData();

    if (rawData.length === 0) {
      console.log('No data found in Excel file');
      return;
    }

    const { policyHolders, dependents, receipts } = categorizeRecords(rawData);

    const existingCustomers = await getExistingCustomers();
    console.log(`\nFound ${existingCustomers.length} existing customers in database`);

    await importPolicyHolders(policyHolders, existingCustomers);

    const updatedCustomers = await getExistingCustomers();

    await importDependents(dependents, updatedCustomers);

    await importReceipts(receipts, updatedCustomers);

    console.log('\n=== Import Complete ===');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
