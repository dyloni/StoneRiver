import XLSX from 'xlsx';
import fs from 'fs';

const workbook = XLSX.readFile('./public/Stone River DB - 05022025.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows:', jsonData.length);
console.log('First 5 rows:');
console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));
console.log('\nColumn names:');
console.log(Object.keys(jsonData[0]));

fs.writeFileSync('./import-data.json', JSON.stringify(jsonData, null, 2));
console.log('\nFull data written to import-data.json');
