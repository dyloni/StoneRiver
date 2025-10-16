import { createClient } from '@supabase/supabase-js';
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
    totalRecords: 0,
    uniqueIds: 0,
    duplicateGroups: 0,
    duplicateRecords: 0,
    recordsDeleted: 0,
    recordsKept: 0,
    errors: []
};

const deduplicationLog = [];

/**
 * Calculate data completeness score for a record
 */
function calculateCompletenessScore(record) {
    let score = 0;
    const fields = [
        'first_name', 'surname', 'id_number', 'date_of_birth', 'gender',
        'phone', 'email', 'street_address', 'town', 'postal_address',
        'funeral_package', 'total_premium'
    ];

    fields.forEach(field => {
        if (record[field] && record[field] !== '' && record[field] !== 'N/A' && record[field] !== null) {
            score++;
        }
    });

    // Add points for having participants
    const participantCount = record.participants ? record.participants.length : 0;
    score += participantCount * 2; // Each participant adds 2 points

    // Add points for having payments/receipts
    if (record.latest_receipt_date) score += 3;

    return score;
}

/**
 * Select the best record to keep from duplicates
 */
function selectRecordToKeep(duplicates) {
    // Sort by multiple criteria
    const sorted = [...duplicates].sort((a, b) => {
        // 1. Most recently updated (if timestamps exist)
        if (a.last_updated && b.last_updated) {
            const dateA = new Date(a.last_updated);
            const dateB = new Date(b.last_updated);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
        } else if (a.last_updated && !b.last_updated) {
            return -1;
        } else if (!a.last_updated && b.last_updated) {
            return 1;
        }

        // 2. Data completeness
        const scoreA = calculateCompletenessScore(a);
        const scoreB = calculateCompletenessScore(b);
        if (scoreA > scoreB) return -1;
        if (scoreA < scoreB) return 1;

        // 3. Most recent creation date
        if (a.date_created && b.date_created) {
            const dateA = new Date(a.date_created);
            const dateB = new Date(a.date_created);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
        }

        // 4. Highest ID (last inserted)
        return b.id - a.id;
    });

    return sorted[0];
}

/**
 * Find all duplicate groups
 */
async function findDuplicates() {
    console.log('🔍 Scanning for duplicate Policy Holder IDs...\n');

    // Direct query
    const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .order('id_number');

    if (fetchError) {
        console.error('❌ Error fetching customers:', fetchError);
        return [];
    }

    if (!customers) {
        console.error('❌ No customer data returned');
        return [];
    }

    stats.totalRecords = customers.length;

    // Group by id_number
    const groups = {};
    customers.forEach(customer => {
        if (!groups[customer.id_number]) {
            groups[customer.id_number] = [];
        }
        groups[customer.id_number].push(customer);
    });

    // Filter to only groups with duplicates
    const duplicates = Object.entries(groups)
        .filter(([id, records]) => records.length > 1)
        .map(([id, records]) => ({ id_number: id, records }));

    stats.uniqueIds = Object.keys(groups).length;
    stats.duplicateGroups = duplicates.length;
    stats.duplicateRecords = duplicates.reduce((sum, group) => sum + group.records.length - 1, 0);

    return duplicates;
}

/**
 * Generate detailed duplicate report
 */
function generateDuplicateReport(duplicates) {
    console.log('📊 DUPLICATE ANALYSIS REPORT');
    console.log('─'.repeat(80));
    console.log(`Total Records in Database:     ${stats.totalRecords}`);
    console.log(`Unique Policy Holder IDs:      ${stats.uniqueIds}`);
    console.log(`Duplicate Groups Found:        ${stats.duplicateGroups}`);
    console.log(`Duplicate Records to Remove:   ${stats.duplicateRecords}`);
    console.log('─'.repeat(80));

    if (duplicates.length === 0) {
        console.log('\n✅ No duplicates found! Database is clean.\n');
        return;
    }

    console.log(`\n⚠️  DUPLICATE POLICY HOLDER IDs DETECTED:\n`);

    duplicates.forEach((group, index) => {
        console.log(`\n${index + 1}. Policy Holder ID: ${group.id_number}`);
        console.log(`   Duplicate Count: ${group.records.length} records\n`);

        group.records.forEach((record, idx) => {
            const completenessScore = calculateCompletenessScore(record);
            const participantCount = record.participants ? record.participants.length : 0;

            console.log(`   Record ${idx + 1}:`);
            console.log(`      Database ID: ${record.id}`);
            console.log(`      Policy Number: ${record.policy_number}`);
            console.log(`      Name: ${record.first_name} ${record.surname}`);
            console.log(`      Status: ${record.status}`);
            console.log(`      Created: ${record.date_created || 'Unknown'}`);
            console.log(`      Updated: ${record.last_updated || 'Never'}`);
            console.log(`      Participants: ${participantCount}`);
            console.log(`      Completeness Score: ${completenessScore}`);
            console.log(`      Premium: $${record.total_premium || '0'}`);
        });

        // Show which record will be kept
        const toKeep = selectRecordToKeep(group.records);
        console.log(`\n   ✅ WILL KEEP: Record with Database ID ${toKeep.id} (${toKeep.policy_number})`);
        console.log(`   ❌ WILL DELETE: ${group.records.length - 1} duplicate record(s)`);
    });

    console.log('\n' + '─'.repeat(80));
}

/**
 * Execute deduplication
 */
async function executeDuplication(duplicates, dryRun = false) {
    if (duplicates.length === 0) {
        return;
    }

    console.log(`\n🔧 ${dryRun ? 'DRY RUN - NO CHANGES WILL BE MADE' : 'EXECUTING DEDUPLICATION'}...\n`);

    for (const group of duplicates) {
        const recordToKeep = selectRecordToKeep(group.records);
        const recordsToDelete = group.records.filter(r => r.id !== recordToKeep.id);

        const logEntry = {
            id_number: group.id_number,
            recordKept: {
                id: recordToKeep.id,
                policy_number: recordToKeep.policy_number,
                name: `${recordToKeep.first_name} ${recordToKeep.surname}`,
                last_updated: recordToKeep.last_updated,
                participants: recordToKeep.participants ? recordToKeep.participants.length : 0,
                completeness: calculateCompletenessScore(recordToKeep)
            },
            recordsDeleted: []
        };

        for (const record of recordsToDelete) {
            logEntry.recordsDeleted.push({
                id: record.id,
                policy_number: record.policy_number,
                name: `${record.first_name} ${record.surname}`,
                last_updated: record.last_updated,
                participants: record.participants ? record.participants.length : 0,
                completeness: calculateCompletenessScore(record)
            });

            if (!dryRun) {
                const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', record.id);

                if (error) {
                    console.error(`   ❌ Error deleting record ${record.id}:`, error);
                    stats.errors.push(`Failed to delete ID ${record.id}: ${error.message}`);
                } else {
                    console.log(`   ✅ Deleted duplicate: ID ${record.id} (${record.policy_number})`);
                    stats.recordsDeleted++;
                }
            } else {
                console.log(`   🔍 Would delete: ID ${record.id} (${record.policy_number})`);
                stats.recordsDeleted++;
            }
        }

        stats.recordsKept++;
        deduplicationLog.push(logEntry);
    }
}

/**
 * Verify cleanup results
 */
async function verifyCleanup() {
    console.log('\n🔍 Verifying cleanup results...\n');

    // Direct verification
    const { data: customers } = await supabase
        .from('customers')
        .select('id_number')
        .order('id_number');

    const groups = {};
    customers.forEach(customer => {
        groups[customer.id_number] = (groups[customer.id_number] || 0) + 1;
    });

    const stillDuplicated = Object.entries(groups).filter(([id, count]) => count > 1);

    if (stillDuplicated.length === 0) {
        console.log('✅ VERIFICATION PASSED: No duplicate Policy Holder IDs found!\n');
        return true;
    } else {
        console.log(`⚠️  VERIFICATION FAILED: ${stillDuplicated.length} duplicate groups still exist!\n`);
        stillDuplicated.forEach(([id, count]) => {
            console.log(`   - ${id}: ${count} records`);
        });
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║        POLICY HOLDER DEDUPLICATION SYSTEM                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 VALIDATION RULE: Each Policy Holder ID must be unique (no exceptions)\n');
    console.log('═'.repeat(80));

    // Step 1: Find duplicates
    const duplicates = await findDuplicates();

    // Step 2: Generate report
    generateDuplicateReport(duplicates);

    if (duplicates.length === 0) {
        console.log('═'.repeat(80));
        console.log('✅ DATABASE IS CLEAN - NO ACTION REQUIRED');
        console.log('═'.repeat(80));
        return;
    }

    // Step 3: Execute deduplication
    await executeDuplication(duplicates, false);

    // Step 4: Verify cleanup
    const verified = await verifyCleanup();

    // Step 5: Generate summary
    console.log('═'.repeat(80));
    console.log('DEDUPLICATION COMPLETE');
    console.log('═'.repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`Records Kept:              ${stats.recordsKept}`);
    console.log(`Records Deleted:           ${stats.recordsDeleted}`);
    console.log(`Errors:                    ${stats.errors.length}`);
    console.log(`Verification Status:       ${verified ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('─'.repeat(80));

    if (stats.errors.length > 0) {
        console.log('\n⚠️  ERRORS ENCOUNTERED:');
        stats.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }

    // Save log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFilename = `deduplication-log-${timestamp}.json`;
    fs.writeFileSync(logFilename, JSON.stringify({
        timestamp: new Date().toISOString(),
        statistics: stats,
        deduplicationLog
    }, null, 2));

    console.log(`\n✅ Audit log saved to: ${logFilename}`);
    console.log('─'.repeat(80));
}

main().catch(console.error);
