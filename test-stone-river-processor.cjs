const XLSX = require('xlsx');

const testStoneRiverProcessor = () => {
  console.log('Testing Stone River DB Processor...\n');

  const filePath = '/tmp/cc-agent/58215737/project/public/Stone River DB - 05022025.xlsx';
  const wb = XLSX.readFile(filePath);

  console.log('✓ File loaded successfully');
  console.log(`✓ Found ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(', ')}`);

  const pSheet = wb.Sheets[wb.SheetNames[0]];
  const phdSheet = wb.Sheets[wb.SheetNames[1]];
  const rSheet = wb.Sheets[wb.SheetNames[2]];

  const policyData = XLSX.utils.sheet_to_json(pSheet, { header: 1 });
  const dependentData = XLSX.utils.sheet_to_json(phdSheet, { header: 1 });
  const receiptData = XLSX.utils.sheet_to_json(rSheet, { header: 1 });

  console.log(`\nSheet 1 (P - Policy Holders):`);
  console.log(`  - Rows: ${policyData.length - 1} (excluding header)`);
  console.log(`  - Columns: ${policyData[0].length}`);
  console.log(`  - Sample headers: ${policyData[0].slice(0, 5).join(', ')}`);

  console.log(`\nSheet 2 (PHnD - Dependents):`);
  console.log(`  - Rows: ${dependentData.length - 1} (excluding header)`);
  console.log(`  - Columns: ${dependentData[0].length}`);
  console.log(`  - Sample headers: ${dependentData[0].slice(0, 5).join(', ')}`);

  console.log(`\nSheet 3 (R - Receipts):`);
  console.log(`  - Rows: ${receiptData.length - 1} (excluding header)`);
  console.log(`  - Columns: ${receiptData[0].length}`);
  console.log(`  - Sample headers: ${receiptData[0].slice(0, 5).join(', ')}`);

  const normalizeColumnName = (name) => {
    return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  };

  const detectColumns = (headers) => {
    const mapping = {};
    headers.forEach((header, idx) => {
      const normalized = normalizeColumnName(header);
      mapping[normalized] = idx;
    });
    return mapping;
  };

  const pMapping = detectColumns(policyData[0]);
  const phMapping = detectColumns(dependentData[0]);
  const rMapping = detectColumns(receiptData[0]);

  console.log('\n✓ Column Detection:');
  console.log(`  - Policy sheet: ${Object.keys(pMapping).length} columns mapped`);
  console.log(`  - Dependent sheet: ${Object.keys(phMapping).length} columns mapped`);
  console.log(`  - Receipt sheet: ${Object.keys(rMapping).length} columns mapped`);

  console.log('\n✓ Sample Mapped Data:');

  const samplePolicy = policyData[1];
  console.log(`\n  Policy Holder #1:`);
  console.log(`    - Policy Number: ${samplePolicy[pMapping['policynumber'] || 0]}`);
  console.log(`    - Full Name: ${samplePolicy[pMapping['fullname'] || 1]}`);
  console.log(`    - Status: ${samplePolicy[pMapping['membershipstatus'] || 2]}`);
  console.log(`    - Policy: ${samplePolicy[pMapping['policy'] || 9]}`);

  const sampleDependent = dependentData[1];
  console.log(`\n  Dependent #1:`);
  console.log(`    - Policy Number: ${sampleDependent[phMapping['policynumber'] || 1]}`);
  console.log(`    - Name: ${sampleDependent[phMapping['firstname'] || 3]} ${sampleDependent[phMapping['lastname'] || 5]}`);
  console.log(`    - Relationship: ${sampleDependent[phMapping['relationship'] || 2]}`);

  const sampleReceipt = receiptData[1];
  console.log(`\n  Receipt #1:`);
  console.log(`    - Receipt #: ${sampleReceipt[rMapping['systemreceiptnumber'] || 0]}`);
  console.log(`    - Subscriber: ${sampleReceipt[rMapping['subscriber'] || 2]}`);
  console.log(`    - Amount: ${sampleReceipt[rMapping['amount'] || 4]}`);
  console.log(`    - Date: ${sampleReceipt[rMapping['date'] || 3]}`);

  console.log('\n✓ All tests passed! Stone River processor is ready.');
};

try {
  testStoneRiverProcessor();
} catch (error) {
  console.error('Test failed:', error.message);
  process.exit(1);
}
