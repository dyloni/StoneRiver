import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import * as fs from 'fs';
import { readFileSync } from 'fs';

// Load environment variables
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const stats = {
    totalCustomers: 0,
    sourceFilesProcessed: 0,
    datesVerified: 0,
    datesNeedingFix: 0,
    datesCorrected: 0,
    datesUnchanged: 0,
    missingInSource: 0,
    errors: []
};

const correctionLog = [];

/**
 * Parse Excel date serial number to YYYY-MM-DD
 */
function parseExcelDate(excelDate) {
    if (!excelDate) return null;

    // If already a date string, try to parse it
    if (typeof excelDate === 'string') {
        // Check if it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
            return excelDate;
        }

        // Handle formats like "01-Aug-2023" or "01-08-2023"
        const dateParts = excelDate.trim().split(/[-\/\s]/);
        if (dateParts.length === 3) {
            const monthMap = {
                'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
            };

            let day, month, year;

            // Try different patterns
            if (isNaN(dateParts[1])) {
                // Format: DD-MMM-YYYY
                day = dateParts[0].padStart(2, '0');
                month = monthMap[dateParts[1].toLowerCase().substring(0, 3)] || dateParts[1];
                year = dateParts[2];
            } else if (dateParts[2].length === 4) {
                // Format: DD-MM-YYYY or MM-DD-YYYY
                day = dateParts[0].padStart(2, '0');
                month = dateParts[1].padStart(2, '0');
                year = dateParts[2];
            } else {
                // Format: MM-DD-YY or DD-MM-YY
                day = dateParts[0].padStart(2, '0');
                month = dateParts[1].padStart(2, '0');
                year = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
            }

            return `${year}-${month}-${day}`;
        }

        // Try to parse as standard date string
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return null;
    }

    // Excel date serial number (days since 1900-01-01)
    if (typeof excelDate === 'number') {
        const date = XLSX.SSF.parse_date_code(excelDate);
        if (date) {
            const year = date.y;
            const month = String(date.m).padStart(2, '0');
            const day = String(date.d).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    return null;
}

/**
 * Extract policy number variations for matching
 */
function normalizeIdNumber(idNumber) {
    if (!idNumber) return '';
    return String(idNumber)
        .replace(/[-\s]/g, '')
        .toUpperCase()
        .trim();
}

/**
 * Parse HTML file to extract customer data
 */
function parseHTMLFile(filePath) {
    console.log(`\n📄 Parsing HTML file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract table rows (simplified parsing)
    const rows = [];
    const tableRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi;

    let match;
    while ((match = tableRegex.exec(content)) !== null) {
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(match[1])) !== null) {
            cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length > 0) {
            rows.push(cells);
        }
    }

    console.log(`   Found ${rows.length} rows`);
    return rows;
}

/**
 * Process Excel file to extract inception dates
 */
function processExcelFile(filePath) {
    console.log(`\n📊 Processing Excel file: ${filePath}`);

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

        console.log(`   Found ${data.length} records in sheet: ${sheetName}`);

        const inceptionDates = new Map();

        data.forEach((row, index) => {
            // Try to find ID number in various column names
            const idNumber = row['National ID'] || row['ID Number'] || row['idNumber'] ||
                           row['ID_Number'] || row['Policy Holder ID'] || row['PolicyHolderID'] ||
                           row['Policy Number'] || '';

            // Try to find inception date in various column names
            const inceptionDate = row['Inception Date'] || row['inceptionDate'] ||
                                row['Inception_Date'] || row['Date'] ||
                                row['Start Date'] || row['startDate'] ||
                                row['InceptionDate'] || '';

            if (idNumber && inceptionDate) {
                const normalized = normalizeIdNumber(idNumber);
                const parsedDate = parseExcelDate(inceptionDate);

                if (normalized && parsedDate) {
                    // Only set if not already present or if this has a valid date
                    if (!inceptionDates.has(normalized)) {
                        inceptionDates.set(normalized, {
                            original: idNumber,
                            inceptionDate: parsedDate,
                            source: filePath,
                            row: index + 2 // Excel row (1-indexed + header)
                        });
                    }
                }
            }
        });

        console.log(`   Extracted ${inceptionDates.size} inception dates`);
        return inceptionDates;

    } catch (error) {
        console.error(`   ❌ Error processing ${filePath}:`, error.message);
        stats.errors.push(`Failed to process ${filePath}: ${error.message}`);
        return new Map();
    }
}

/**
 * Load all inception dates from source files
 */
async function loadSourceInceptionDates() {
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║     INCEPTION DATE VERIFICATION & CORRECTION - BRUTE FORCE MODE         ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('🔍 Scanning for source data files...\n');

    const sourceFiles = [
        'public/Stone River DB - 05022025.xlsx',
        'public/Stone River DB - 05022025 copy.xlsx',
        'public/Untitled spreadsheet (1).xlsx',
        'public/Untitled spreadsheet (2).xlsx'
    ];

    const allInceptionDates = new Map();

    for (const file of sourceFiles) {
        if (fs.existsSync(file)) {
            const dates = processExcelFile(file);
            dates.forEach((value, key) => {
                // If we already have this ID, keep the most complete/recent data
                if (!allInceptionDates.has(key) || value.inceptionDate) {
                    allInceptionDates.set(key, value);
                }
            });
            stats.sourceFilesProcessed++;
        }
    }

    console.log('\n─────────────────────────────────────────────────────────────────────────');
    console.log(`✅ Processed ${stats.sourceFilesProcessed} source files`);
    console.log(`✅ Extracted ${allInceptionDates.size} unique inception dates`);
    console.log('─────────────────────────────────────────────────────────────────────────\n');

    return allInceptionDates;
}

/**
 * Verify and correct inception dates
 */
async function verifyAndCorrectDates(sourceInceptionDates) {
    console.log('📊 Loading customer records from database...\n');

    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, policy_number, id_number, first_name, surname, inception_date')
        .order('id');

    if (error) {
        console.error('❌ Error fetching customers:', error);
        return;
    }

    stats.totalCustomers = customers.length;
    console.log(`✅ Loaded ${customers.length} customer records\n`);
    console.log('🔧 Verifying and correcting inception dates...\n');

    for (const customer of customers) {
        const normalized = normalizeIdNumber(customer.id_number);
        const sourceData = sourceInceptionDates.get(normalized);

        const logEntry = {
            customerId: customer.id,
            policyNumber: customer.policy_number,
            idNumber: customer.id_number,
            name: `${customer.first_name} ${customer.surname}`,
            currentDate: customer.inception_date,
            sourceDate: null,
            action: 'unchanged',
            reason: ''
        };

        if (!sourceData) {
            stats.missingInSource++;
            logEntry.action = 'no_source';
            logEntry.reason = 'No matching record in source files';
            correctionLog.push(logEntry);
            continue;
        }

        logEntry.sourceDate = sourceData.inceptionDate;
        logEntry.sourceFile = sourceData.source;

        // Compare dates
        if (customer.inception_date === sourceData.inceptionDate) {
            stats.datesVerified++;
            stats.datesUnchanged++;
            logEntry.action = 'verified';
            logEntry.reason = 'Date matches source file';
        } else {
            stats.datesNeedingFix++;
            logEntry.action = 'corrected';
            logEntry.reason = `Updated from ${customer.inception_date || 'NULL'} to ${sourceData.inceptionDate}`;

            // Update database
            const { error: updateError } = await supabase
                .from('customers')
                .update({ inception_date: sourceData.inceptionDate })
                .eq('id', customer.id);

            if (updateError) {
                console.error(`   ❌ Error updating customer ${customer.id}:`, updateError);
                stats.errors.push(`Failed to update ${customer.policy_number}: ${updateError.message}`);
                logEntry.action = 'error';
                logEntry.reason = `Update failed: ${updateError.message}`;
            } else {
                stats.datesCorrected++;
                console.log(`   ✅ Corrected: ${customer.policy_number} - ${customer.inception_date || 'NULL'} → ${sourceData.inceptionDate}`);
            }
        }

        correctionLog.push(logEntry);

        // Progress indicator
        if (correctionLog.length % 50 === 0) {
            process.stdout.write(`\r   Processed: ${correctionLog.length}/${stats.totalCustomers} records...`);
        }
    }

    console.log(`\r   Processed: ${stats.totalCustomers}/${stats.totalCustomers} records... ✅\n`);
}

/**
 * Generate comprehensive report
 */
function generateReport() {
    console.log('═'.repeat(80));
    console.log('INCEPTION DATE VERIFICATION & CORRECTION COMPLETE');
    console.log('═'.repeat(80));
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('─'.repeat(80));
    console.log(`Total Customer Records:              ${stats.totalCustomers}`);
    console.log(`Source Files Processed:              ${stats.sourceFilesProcessed}`);
    console.log('─'.repeat(80));
    console.log(`Dates Verified (Already Correct):    ${stats.datesVerified}`);
    console.log(`Dates Corrected:                     ${stats.datesCorrected}`);
    console.log(`Dates Unchanged (No Source):         ${stats.missingInSource}`);
    console.log(`Errors Encountered:                  ${stats.errors.length}`);
    console.log('─'.repeat(80));

    const successRate = ((stats.datesVerified + stats.datesCorrected) / stats.totalCustomers * 100).toFixed(2);
    console.log(`\n✅ Success Rate: ${successRate}%`);

    // Show sample corrections
    const corrections = correctionLog.filter(log => log.action === 'corrected');
    if (corrections.length > 0) {
        console.log(`\n📝 Sample Corrections (first 10 of ${corrections.length}):`);
        console.log('─'.repeat(80));
        corrections.slice(0, 10).forEach((log, index) => {
            console.log(`\n${index + 1}. ${log.policyNumber} - ${log.name}`);
            console.log(`   Before: ${log.currentDate || 'NULL'}`);
            console.log(`   After:  ${log.sourceDate}`);
            console.log(`   Source: ${log.sourceFile}`);
        });
    }

    // Show records with no source match
    const noSource = correctionLog.filter(log => log.action === 'no_source');
    if (noSource.length > 0) {
        console.log(`\n⚠️  Records with No Source Match: ${noSource.length}`);
        console.log('─'.repeat(80));
        noSource.slice(0, 10).forEach((log, index) => {
            console.log(`   ${index + 1}. ${log.policyNumber} (${log.idNumber}) - ${log.name}`);
        });
        if (noSource.length > 10) {
            console.log(`   ... and ${noSource.length - 10} more`);
        }
    }

    // Show errors
    if (stats.errors.length > 0) {
        console.log(`\n❌ Errors: ${stats.errors.length}`);
        console.log('─'.repeat(80));
        stats.errors.slice(0, 10).forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
        if (stats.errors.length > 10) {
            console.log(`   ... and ${stats.errors.length - 10} more`);
        }
    }

    // Save detailed log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFilename = `inception-date-corrections-${timestamp}.json`;
    fs.writeFileSync(logFilename, JSON.stringify({
        timestamp: new Date().toISOString(),
        statistics: stats,
        correctionLog
    }, null, 2));

    console.log('\n─'.repeat(80));
    console.log(`✅ Detailed log saved to: ${logFilename}`);
    console.log('─'.repeat(80));
}

/**
 * Final verification query
 */
async function finalVerification() {
    console.log('\n🔍 Running final verification...\n');

    const { data: results, error } = await supabase
        .from('customers')
        .select('inception_date')
        .order('id');

    if (error) {
        console.error('❌ Verification query failed:', error);
        return;
    }

    const nullDates = results.filter(r => !r.inception_date).length;
    const validDates = results.filter(r => r.inception_date && /^\d{4}-\d{2}-\d{2}$/.test(r.inception_date)).length;
    const invalidDates = results.length - nullDates - validDates;

    console.log('Final Database State:');
    console.log(`   Total Records:        ${results.length}`);
    console.log(`   Valid Dates:          ${validDates} (${(validDates/results.length*100).toFixed(2)}%)`);
    console.log(`   Invalid Dates:        ${invalidDates}`);
    console.log(`   NULL Dates:           ${nullDates}`);

    if (invalidDates === 0 && nullDates === 0) {
        console.log('\n✅ ALL DATES VERIFIED AND CORRECTED!');
    } else if (invalidDates === 0) {
        console.log(`\n⚠️  ${nullDates} records still have NULL dates (no source data available)`);
    } else {
        console.log(`\n⚠️  ${invalidDates} records have invalid date formats`);
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        // Load inception dates from source files
        const sourceInceptionDates = await loadSourceInceptionDates();

        if (sourceInceptionDates.size === 0) {
            console.log('❌ No inception dates found in source files!');
            console.log('   Please ensure source Excel files are in the public/ directory');
            return;
        }

        // Verify and correct dates
        await verifyAndCorrectDates(sourceInceptionDates);

        // Generate report
        generateReport();

        // Final verification
        await finalVerification();

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error);
        console.error(error.stack);
    }
}

main().catch(console.error);
