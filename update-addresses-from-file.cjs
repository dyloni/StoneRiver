const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env file
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function updateAddressesFromFile() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile('public/Stone River DB - 05022025.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Found ${data.length} rows in Excel file\n`);

  const { data: customers, error: fetchError } = await supabase
    .from('customers')
    .select('id, policy_number, first_name, surname, street_address, town, postal_address');

  if (fetchError) {
    console.error('Error fetching customers:', fetchError);
    return;
  }

  console.log(`Found ${customers.length} customers in database\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  const updatePromises = [];

  for (const row of data) {
    const policyNumber = row['Policy Number']?.toString().trim().toUpperCase();
    const physicalAddress = row['Physical Address']?.toString().trim();

    if (!policyNumber) {
      skipped++;
      continue;
    }

    if (!physicalAddress) {
      skipped++;
      continue;
    }

    const customer = customers.find(c => c.policy_number === policyNumber);

    if (!customer) {
      notFound++;
      console.log(`⚠️  Policy ${policyNumber} not found in database`);
      continue;
    }

    // Parse the physical address
    // Format is usually: "Street/Number Location/Town"
    let streetAddress = physicalAddress;
    let town = customer.town || '';

    // Try to extract town from common patterns
    const townPatterns = [
      /\b(Harare|Bulawayo|Chitungwiza|Mutare|Gweru|Kwekwe|Kadoma|Masvingo|Chinhoyi|Marondera|Norton|Chegutu|Bindura|Zvishavane|Victoria Falls|Rusape|Chiredzi|Kariba|Karoi|Gwanda)\b/i,
      /\b(Epworth|Kuwadzana|Mbare|Highfield|Glen View|Budiriro|Warren Park|Mabvuku|Tafara|Hatcliffe|Glen Norah|Kambuzuma)\b/i,
      /\b(Extension|Ext)\b/i
    ];

    for (const pattern of townPatterns) {
      const match = physicalAddress.match(pattern);
      if (match) {
        town = match[0].trim();
        break;
      }
    }

    // If no town found and current town is empty, try to extract from end of address
    if (!town) {
      const parts = physicalAddress.split(/\s+/);
      if (parts.length > 2) {
        // Last word might be town
        const lastPart = parts[parts.length - 1];
        if (lastPart.length > 3 && !/^\d+$/.test(lastPart)) {
          town = lastPart;
        }
      }
    }

    // Clean up street address (remove town if it's at the end)
    if (town) {
      streetAddress = physicalAddress.replace(new RegExp(`\\s*${town}\\s*$`, 'i'), '').trim();
    }

    const updateData = {
      street_address: streetAddress,
      town: town || 'Not Specified',
      postal_address: customer.postal_address || '',
      last_updated: new Date().toISOString()
    };

    console.log(`Updating ${customer.first_name} ${customer.surname} (${policyNumber}):`);
    console.log(`  Old: "${customer.street_address || 'N/A'}", Town: "${customer.town || 'N/A'}"`);
    console.log(`  New: "${streetAddress}", Town: "${town || 'Not Specified'}"`);

    const updatePromise = supabase
      .from('customers')
      .update(updateData)
      .eq('id', customer.id)
      .then(({ error }) => {
        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errors++;
        } else {
          console.log(`  ✅ Updated`);
          updated++;
        }
      });

    updatePromises.push(updatePromise);

    // Process in batches of 10 to avoid overwhelming the API
    if (updatePromises.length >= 10) {
      await Promise.all(updatePromises);
      updatePromises.length = 0;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Process remaining updates
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  console.log('\n' + '='.repeat(60));
  console.log('ADDRESS UPDATE COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} customers`);
  console.log(`⚠️  Skipped: ${skipped} rows (no policy or address)`);
  console.log(`🔍 Not Found: ${notFound} policies`);
  console.log(`❌ Errors: ${errors} customers`);
  console.log(`📊 Total Processed: ${data.length} rows`);
  console.log('='.repeat(60));
}

updateAddressesFromFile().catch(console.error);
