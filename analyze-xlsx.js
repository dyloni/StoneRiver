import XLSX from 'xlsx';

const wb = XLSX.readFile('public/Stone River DB - 05022025 copy copy.xlsx');
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`\n${name}: ${data.length} rows`);
  if(data.length > 0) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
    console.log('First row sample:', JSON.stringify(data[0], null, 2));
  }
});
