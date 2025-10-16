const XLSX = require('xlsx');

const wb = XLSX.readFile('/tmp/cc-agent/58215737/project/public/Stone River DB - 05022025.xlsx');
console.log('Sheet names:', wb.SheetNames);

wb.SheetNames.forEach((name, idx) => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
  console.log(`\n=== SHEET ${idx + 1}: ${name} (${data.length} rows) ===`);

  if(data.length > 0) {
    console.log('\nHeaders:', JSON.stringify(data[0], null, 2));
    if(data[1]) {
      console.log('\nSample row 1:', JSON.stringify(data[1], null, 2));
    }
    if(data[2]) {
      console.log('\nSample row 2:', JSON.stringify(data[2], null, 2));
    }
  }
});
