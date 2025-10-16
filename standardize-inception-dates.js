import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables manually
import { readFileSync } from 'fs';
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

// Conversion log
const conversionLog = [];
let stats = {
    totalRecords: 0,
    alreadyStandardized: 0,
    converted: 0,
    invalidDates: 0,
    futureDates: 0,
    missingDates: 0,
    errors: []
};

/**
 * Standardize date to YYYY-MM-DD format
 */
function standardizeDate(dateString) {
    if (!dateString || dateString.trim() === '') {
        return { success: false, error: 'Missing date', standardized: null, original: dateString };
    }

    const original = dateString;

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return { success: true, standardized: dateString, original, format: 'YYYY-MM-DD (already standard)' };
        }
    }

    // ISO 8601 with timestamp (e.g., 2025-10-16T12:10:08.746Z)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString)) {
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const standardized = date.toISOString().split('T')[0];
                return { success: true, standardized, original, format: 'ISO 8601 timestamp' };
            }
        } catch (e) {
            return { success: false, error: 'Invalid ISO timestamp', standardized: null, original };
        }
    }

    // MM/DD/YYYY format
    const mmddyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date.getMonth() === parseInt(month) - 1) {
            const standardized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            return { success: true, standardized, original, format: 'MM/DD/YYYY' };
        }
    }

    // DD-MM-YYYY format
    const ddmmyyyy = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date.getMonth() === parseInt(month) - 1) {
            const standardized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            return { success: true, standardized, original, format: 'DD-MM-YYYY' };
        }
    }

    // Text format (e.g., "January 15, 2023" or "15 January 2023")
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const standardized = date.toISOString().split('T')[0];
            return { success: true, standardized, original, format: 'Text/Natural language' };
        }
    } catch (e) {
        // Continue to error
    }

    return { success: false, error: 'Unrecognized format', standardized: null, original };
}

/**
 * Validate date is logical
 */
function validateDate(dateString, recordId, policyNumber) {
    const date = new Date(dateString);
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 5);

    const issues = [];

    // Check if date is in the future
    if (date > now) {
        issues.push(`Future date detected: ${dateString} for policy ${policyNumber}`);
        stats.futureDates++;
    }

    // Check if date is too old (more than 5 years ago - adjust as needed)
    if (date < twoYearsAgo) {
        issues.push(`Very old inception date: ${dateString} for policy ${policyNumber} (before ${twoYearsAgo.toISOString().split('T')[0]})`);
    }

    return issues;
}

/**
 * Main processing function
 */
async function processInceptionDates() {
    console.log('Starting inception date standardization process...\n');
    console.log('Target format: YYYY-MM-DD\n');
    console.log('=' .repeat(80));

    // Fetch all customers
    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, policy_number, inception_date')
        .order('id');

    if (error) {
        console.error('Error fetching customers:', error);
        return;
    }

    stats.totalRecords = customers.length;
    console.log(`\nTotal customer records to process: ${stats.totalRecords}\n`);

    // Process each customer
    for (const customer of customers) {
        const { id, policy_number, inception_date } = customer;

        // Handle missing dates
        if (!inception_date) {
            stats.missingDates++;
            conversionLog.push({
                id,
                policy_number,
                original: null,
                standardized: null,
                status: 'MISSING',
                error: 'No inception date found'
            });
            continue;
        }

        // Attempt to standardize
        const result = standardizeDate(inception_date);

        if (result.success) {
            // Check if already in standard format
            if (result.format === 'YYYY-MM-DD (already standard)') {
                stats.alreadyStandardized++;

                // Still validate for logical issues
                const validationIssues = validateDate(result.standardized, id, policy_number);
                if (validationIssues.length > 0) {
                    stats.errors.push(...validationIssues);
                }

                conversionLog.push({
                    id,
                    policy_number,
                    original: result.original,
                    standardized: result.standardized,
                    format: result.format,
                    status: 'ALREADY_STANDARD',
                    validationIssues: validationIssues.length > 0 ? validationIssues : null
                });
            } else {
                // Needs conversion
                stats.converted++;

                // Validate the standardized date
                const validationIssues = validateDate(result.standardized, id, policy_number);
                if (validationIssues.length > 0) {
                    stats.errors.push(...validationIssues);
                }

                // Update in database
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({ inception_date: result.standardized })
                    .eq('id', id);

                if (updateError) {
                    console.error(`Error updating record ${id}:`, updateError);
                    stats.errors.push(`Failed to update record ${id}: ${updateError.message}`);
                }

                conversionLog.push({
                    id,
                    policy_number,
                    original: result.original,
                    standardized: result.standardized,
                    format: result.format,
                    status: 'CONVERTED',
                    validationIssues: validationIssues.length > 0 ? validationIssues : null
                });

                // Progress indicator
                if (stats.converted % 10 === 0) {
                    process.stdout.write(`\rConverted: ${stats.converted} records...`);
                }
            }
        } else {
            // Invalid date
            stats.invalidDates++;
            conversionLog.push({
                id,
                policy_number,
                original: result.original,
                standardized: null,
                status: 'INVALID',
                error: result.error
            });
            stats.errors.push(`Invalid date for policy ${policy_number} (ID: ${id}): ${result.original} - ${result.error}`);
        }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('STANDARDIZATION COMPLETE');
    console.log('='.repeat(80));
    generateReport();
}

/**
 * Generate summary report
 */
function generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    console.log('\n📊 SUMMARY REPORT');
    console.log('─'.repeat(80));
    console.log(`Total Records Processed:      ${stats.totalRecords}`);
    console.log(`Already Standardized:         ${stats.alreadyStandardized} (${((stats.alreadyStandardized / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Successfully Converted:       ${stats.converted} (${((stats.converted / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Invalid/Unparseable Dates:    ${stats.invalidDates} (${((stats.invalidDates / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Missing Dates:                ${stats.missingDates} (${((stats.missingDates / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Future Dates Detected:        ${stats.futureDates}`);
    console.log(`\nConversion Success Rate:      ${(((stats.alreadyStandardized + stats.converted) / stats.totalRecords) * 100).toFixed(1)}%`);
    console.log('─'.repeat(80));

    // Date format breakdown
    const formatCounts = {};
    conversionLog.forEach(log => {
        if (log.format) {
            formatCounts[log.format] = (formatCounts[log.format] || 0) + 1;
        }
    });

    console.log('\n📋 DATE FORMATS FOUND:');
    console.log('─'.repeat(80));
    Object.entries(formatCounts).forEach(([format, count]) => {
        console.log(`  ${format}: ${count} records`);
    });

    // Issues requiring manual review
    if (stats.invalidDates > 0 || stats.futureDates > 0 || stats.missingDates > 0) {
        console.log('\n⚠️  ISSUES REQUIRING MANUAL REVIEW:');
        console.log('─'.repeat(80));

        if (stats.invalidDates > 0) {
            console.log(`\n❌ Invalid/Unparseable Dates (${stats.invalidDates}):`);
            conversionLog
                .filter(log => log.status === 'INVALID')
                .slice(0, 10)
                .forEach(log => {
                    console.log(`  - Policy ${log.policy_number}: "${log.original}" - ${log.error}`);
                });
            if (stats.invalidDates > 10) {
                console.log(`  ... and ${stats.invalidDates - 10} more (see full log)`);
            }
        }

        if (stats.futureDates > 0) {
            console.log(`\n⏰ Future Dates Detected (${stats.futureDates}):`);
            stats.errors
                .filter(err => err.includes('Future date'))
                .slice(0, 10)
                .forEach(err => console.log(`  - ${err}`));
            if (stats.futureDates > 10) {
                console.log(`  ... and ${stats.futureDates - 10} more (see full log)`);
            }
        }

        if (stats.missingDates > 0) {
            console.log(`\n📭 Missing Dates (${stats.missingDates}):`);
            conversionLog
                .filter(log => log.status === 'MISSING')
                .slice(0, 10)
                .forEach(log => {
                    console.log(`  - Policy ${log.policy_number} (ID: ${log.id})`);
                });
            if (stats.missingDates > 10) {
                console.log(`  ... and ${stats.missingDates - 10} more (see full log)`);
            }
        }
    }

    // Save detailed log to file
    const logFilename = `inception-date-conversion-log-${timestamp}.json`;
    fs.writeFileSync(logFilename, JSON.stringify({
        timestamp: new Date().toISOString(),
        statistics: stats,
        conversions: conversionLog
    }, null, 2));

    console.log('\n─'.repeat(80));
    console.log(`✅ Detailed log saved to: ${logFilename}`);
    console.log('─'.repeat(80));
}

// Run the process
processInceptionDates().catch(console.error);
