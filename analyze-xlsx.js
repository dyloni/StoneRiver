import XLSX from 'xlsx';

const workbook = XLSX.readFile('public/Stone River DB - 05022025.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

console.log('Sheet name:', sheetName);
console.log('Total records:', data.length);
console.log('\nFirst record keys:');
if (data.length > 0) {
    console.log(Object.keys(data[0]));
    console.log('\nFirst record sample:');
    console.log(JSON.stringify(data[0], null, 2));
}
