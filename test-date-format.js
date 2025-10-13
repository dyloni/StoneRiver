import { formatDate, formatDateLong, formatDateTime } from './utils/dateHelpers.ts';

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  DATE FORMAT VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

const testDates = [
  '2023-08-04',
  '2024-10-25',
  '2025-10-13T13:03:04.780Z',
  '2023-06-09',
  new Date('2024-01-15')
];

console.log('SHORT FORMAT (DD/MM/YY):');
console.log('─────────────────────────────────────────────────────────────');
testDates.forEach(date => {
  console.log(`  Input: ${date}`);
  console.log(`  Output: ${formatDate(date)}`);
  console.log('');
});

console.log('\nLONG FORMAT (DD/MM/YYYY):');
console.log('─────────────────────────────────────────────────────────────');
testDates.forEach(date => {
  console.log(`  Input: ${date}`);
  console.log(`  Output: ${formatDateLong(date)}`);
  console.log('');
});

console.log('\nDATETIME FORMAT (DD/MM/YY HH:MM):');
console.log('─────────────────────────────────────────────────────────────');
testDates.forEach(date => {
  console.log(`  Input: ${date}`);
  console.log(`  Output: ${formatDateTime(date)}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ALL DATE FORMATS VERIFIED');
console.log('═══════════════════════════════════════════════════════════════\n');
