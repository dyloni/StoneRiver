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

const HTML_FILE = './public/R.html';

function parseHTMLTable() {
  console.log('Reading receipts HTML file...');
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

function parseReceiptData(rows) {
  if (rows.length < 2) {
    console.log('No data rows found');
    return [];
  }

  const dataRows = rows.slice(1);
  const receipts = [];

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
    const subscriberNationalId = row[16] || '';
    const uuid = row[17] || '';

    const amountValue = parseFloat(amount.replace(/,/g, '').trim()) || 0;

    if (amountValue <= 0 || !subscriberNationalId) {
      continue;
    }

    receipts.push({
      systemReceiptNumber,
      physicalReceiptNumber,
      subscriber,
      date,
      amount: amountValue,
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
      subscriberNationalId,
      uuid
    });
  }

  console.log(`\nParsed ${receipts.length} valid receipts`);
  return receipts;
}

function parseDateString(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString().split('T')[0];
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

  return dateStr.trim() || new Date().toISOString().split('T')[0];
}

function mapPaymentMethod(account) {
  const accountLower = account.toLowerCase();

  if (accountLower.includes('ecocash')) return 'EcoCash';
  if (accountLower.includes('bank')) return 'Bank Transfer';
  if (accountLower.includes('stop order')) return 'Stop Order';
  return 'Cash';
}

async function getExistingCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, policy_number, id_number');

  if (error) {
    console.error('Error fetching existing customers:', error);
    return [];
  }

  return data || [];
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

async function getExistingPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, policy_number, payment_date, payment_amount, payment_period');

  if (error) {
    console.error('Error fetching existing payments:', error);
    return [];
  }

  return data || [];
}

async function importReceipts(receipts, existingCustomers, existingPayments) {
  console.log('\n=== Importing Receipts/Payments ===');

  let nextId = await getNextPaymentId();
  const toInsert = [];
  let matched = 0;
  let notMatched = 0;
  let duplicates = 0;

  for (const receipt of receipts) {
    const nationalId = receipt.subscriberNationalId.trim();

    const customer = existingCustomers.find(
      c => c.id_number && c.id_number.replace(/[-\s]/g, '') === nationalId.replace(/[-\s]/g, '')
    );

    if (!customer) {
      notMatched++;
      continue;
    }

    matched++;

    const paymentDate = parseDateString(receipt.date);
    const paymentPeriod = receipt.premiumPeriod || receipt.paymentPeriod || 'Monthly';

    const isDuplicate = existingPayments.find(
      p => p.policy_number === customer.policy_number &&
           p.payment_date === paymentDate &&
           Math.abs(parseFloat(p.payment_amount) - receipt.amount) < 0.01 &&
           p.payment_period === paymentPeriod
    );

    if (isDuplicate) {
      duplicates++;
      continue;
    }

    const payment = {
      id: nextId,
      customer_id: customer.id,
      policy_number: customer.policy_number,
      payment_amount: receipt.amount,
      payment_method: mapPaymentMethod(receipt.account),
      payment_period: paymentPeriod,
      payment_date: paymentDate,
      receipt_filename: receipt.physicalReceiptNumber || null,
      recorded_by_agent_id: 1,
      is_legacy_receipt: true,
      legacy_receipt_notes: `System Receipt: ${receipt.systemReceiptNumber}, User: ${receipt.user}, Category: ${receipt.category}`
    };

    toInsert.push(payment);
    existingPayments.push(payment);
    nextId++;
  }

  console.log(`Matched: ${matched}`);
  console.log(`Not matched (no customer): ${notMatched}`);
  console.log(`Duplicates (skipped): ${duplicates}`);
  console.log(`To insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('payments').insert(batch);

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✓ Inserted batch ${i / batchSize + 1} (${batch.length} payments)`);
      }
    }
    console.log(`✓ Successfully imported ${toInsert.length} payments`);
  }
}

async function main() {
  try {
    console.log('=== Starting Receipt Import ===\n');

    const rows = parseHTMLTable();

    if (rows.length === 0) {
      console.log('No data found in HTML file');
      return;
    }

    const receipts = parseReceiptData(rows);

    if (receipts.length === 0) {
      console.log('No valid receipts to import');
      return;
    }

    const existingCustomers = await getExistingCustomers();
    console.log(`\nFound ${existingCustomers.length} existing customers in database`);

    const existingPayments = await getExistingPayments();
    console.log(`Found ${existingPayments.length} existing payments in database`);

    await importReceipts(receipts, existingCustomers, existingPayments);

    console.log('\n=== Import Complete ===');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
