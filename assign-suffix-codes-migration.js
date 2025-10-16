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

// Migration statistics
const stats = {
    totalCustomers: 0,
    customersWithParticipants: 0,
    customersWithoutParticipants: 0,
    principalMembersAdded: 0,
    suffixesAssigned: 0,
    suffixesAlreadyCorrect: 0,
    suffixesCorrected: 0,
    errors: []
};

const migrationLog = [];

/**
 * Determine participant category based on relationship
 */
function getParticipantCategory(relationship) {
    const relationshipMap = {
        'Self': 'PRINCIPAL',
        'Principal Member': 'PRINCIPAL',
        'Spouse': 'SPOUSE',
        'Child': 'CHILD',
        'Stepchild': 'CHILD',
        'Grandchild': 'CHILD',
        'Sibling': 'DEPENDENT',
        'Parent': 'DEPENDENT',
        'Grandparent': 'DEPENDENT',
        'Other': 'DEPENDENT'
    };

    return relationshipMap[relationship] || 'DEPENDENT';
}

/**
 * Assign suffix codes to participants according to the system rules
 */
function assignSuffixCodes(participants, policyholderInfo) {
    const categorized = {
        PRINCIPAL: [],
        SPOUSE: [],
        CHILD: [],
        DEPENDENT: []
    };

    // Categorize existing participants
    participants.forEach(participant => {
        const category = getParticipantCategory(participant.relationship);
        categorized[category].push(participant);
    });

    // Add policyholder as principal if not present
    let principalAdded = false;
    if (categorized.PRINCIPAL.length === 0) {
        categorized.PRINCIPAL.push({
            id: 0,
            uuid: crypto.randomUUID(),
            firstName: policyholderInfo.first_name,
            surname: policyholderInfo.surname,
            relationship: 'Self',
            dateOfBirth: policyholderInfo.date_of_birth || '1990-01-01',
            idNumber: policyholderInfo.id_number || '',
            gender: policyholderInfo.gender || 'Male',
            phone: policyholderInfo.phone || '',
            email: policyholderInfo.email || '',
            streetAddress: policyholderInfo.street_address || '',
            town: policyholderInfo.town || '',
            postalAddress: policyholderInfo.postal_address || '',
            medicalPackage: 'No Medical Aid',
            cashBackAddon: 'No Cash Back',
            isStudent: false,
            suffix: '000'
        });
        principalAdded = true;
        stats.principalMembersAdded++;
    }

    // Assign suffix codes
    const result = [];

    // Principal: 000
    categorized.PRINCIPAL.forEach((participant, index) => {
        const suffix = '000';
        result.push({
            ...participant,
            suffix,
            id: index === 0 ? 0 : participant.id
        });
    });

    // Spouses: 101, 102, 103, etc.
    categorized.SPOUSE.forEach((participant, index) => {
        const suffix = (101 + index).toString().padStart(3, '0');
        result.push({
            ...participant,
            suffix
        });
    });

    // Children: 201, 202, 203, etc.
    categorized.CHILD.forEach((participant, index) => {
        const suffix = (201 + index).toString().padStart(3, '0');
        result.push({
            ...participant,
            suffix
        });
    });

    // Other Dependents: 301, 302, 303, etc.
    categorized.DEPENDENT.forEach((participant, index) => {
        const suffix = (301 + index).toString().padStart(3, '0');
        result.push({
            ...participant,
            suffix
        });
    });

    return { participants: result, principalAdded };
}

/**
 * Validate and fix suffix assignments
 */
function validateSuffixAssignment(participants) {
    const issues = [];
    const suffixCounts = {};

    participants.forEach((p, index) => {
        // Check if suffix exists
        if (!p.suffix) {
            issues.push(`Participant ${index + 1} (${p.firstName} ${p.surname}) missing suffix`);
        }

        // Check for duplicates
        if (p.suffix) {
            suffixCounts[p.suffix] = (suffixCounts[p.suffix] || 0) + 1;
        }

        // Validate suffix format
        if (p.suffix && !/^\d{3}$/.test(p.suffix)) {
            issues.push(`Participant ${index + 1} (${p.firstName} ${p.surname}) has invalid suffix format: ${p.suffix}`);
        }

        // Validate suffix matches category
        const category = getParticipantCategory(p.relationship);
        const suffixNum = parseInt(p.suffix);

        if (category === 'PRINCIPAL' && suffixNum !== 0) {
            issues.push(`Principal member has wrong suffix: ${p.suffix}`);
        } else if (category === 'SPOUSE' && (suffixNum < 101 || suffixNum > 199)) {
            issues.push(`Spouse has wrong suffix range: ${p.suffix}`);
        } else if (category === 'CHILD' && (suffixNum < 201 || suffixNum > 299)) {
            issues.push(`Child has wrong suffix range: ${p.suffix}`);
        } else if (category === 'DEPENDENT' && (suffixNum < 301 || suffixNum > 399)) {
            issues.push(`Dependent has wrong suffix range: ${p.suffix}`);
        }
    });

    // Check for duplicate suffixes
    Object.entries(suffixCounts).forEach(([suffix, count]) => {
        if (count > 1) {
            issues.push(`Duplicate suffix ${suffix} found ${count} times`);
        }
    });

    return issues;
}

/**
 * Process a single customer record
 */
async function processCustomer(customer) {
    const { id, policy_number, first_name, surname, participants } = customer;

    const logEntry = {
        customerId: id,
        policyNumber: policy_number,
        policyholderName: `${first_name} ${surname}`,
        before: {
            participantCount: participants ? participants.length : 0,
            participants: participants || []
        },
        after: null,
        changes: [],
        principalAdded: false,
        issues: []
    };

    try {
        // Handle customers without participants
        if (!participants || participants.length === 0) {
            const policyholderInfo = {
                first_name,
                surname,
                date_of_birth: customer.date_of_birth,
                id_number: customer.id_number,
                gender: customer.gender,
                phone: customer.phone,
                email: customer.email,
                street_address: customer.street_address,
                town: customer.town,
                postal_address: customer.postal_address
            };

            const { participants: newParticipants, principalAdded } = assignSuffixCodes([], policyholderInfo);

            logEntry.principalAdded = principalAdded;
            logEntry.after = {
                participantCount: newParticipants.length,
                participants: newParticipants
            };
            logEntry.changes.push('Added principal member (policyholder)');

            // Update database
            const { error } = await supabase
                .from('customers')
                .update({ participants: newParticipants })
                .eq('id', id);

            if (error) {
                throw error;
            }

            stats.suffixesAssigned += newParticipants.length;
            return logEntry;
        }

        // Process customers with participants
        const policyholderInfo = {
            first_name,
            surname,
            date_of_birth: customer.date_of_birth,
            id_number: customer.id_number,
            gender: customer.gender,
            phone: customer.phone,
            email: customer.email,
            street_address: customer.street_address,
            town: customer.town,
            postal_address: customer.postal_address
        };

        const { participants: newParticipants, principalAdded } = assignSuffixCodes(participants, policyholderInfo);

        // Validate before update
        const validationIssues = validateSuffixAssignment(newParticipants);
        if (validationIssues.length > 0) {
            logEntry.issues = validationIssues;
            stats.errors.push(`Policy ${policy_number}: ${validationIssues.join(', ')}`);
        }

        // Track changes
        participants.forEach((oldP, index) => {
            const newP = newParticipants.find(np => np.uuid === oldP.uuid || (np.firstName === oldP.firstName && np.surname === oldP.surname));
            if (newP && oldP.suffix !== newP.suffix) {
                logEntry.changes.push(`${oldP.firstName} ${oldP.surname}: ${oldP.suffix || 'none'} → ${newP.suffix}`);
                stats.suffixesCorrected++;
            } else if (oldP.suffix === newP?.suffix) {
                stats.suffixesAlreadyCorrect++;
            }
        });

        if (principalAdded) {
            logEntry.principalAdded = true;
            logEntry.changes.push('Added principal member (policyholder)');
        }

        logEntry.after = {
            participantCount: newParticipants.length,
            participants: newParticipants
        };

        // Update database
        const { error } = await supabase
            .from('customers')
            .update({ participants: newParticipants })
            .eq('id', id);

        if (error) {
            throw error;
        }

        stats.suffixesAssigned += newParticipants.length;

    } catch (error) {
        logEntry.error = error.message;
        stats.errors.push(`Policy ${policy_number}: ${error.message}`);
    }

    return logEntry;
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║     PARTICIPANT SUFFIX SYSTEM - UNIVERSAL MIGRATION                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('🎯 System Rules:');
    console.log('   • Principal Member: 000 (fixed)');
    console.log('   • Spouse(s): 101, 102, 103, etc.');
    console.log('   • Children: 201, 202, 203, etc.');
    console.log('   • Other Dependents: 301, 302, 303, etc.\n');

    console.log('📊 Fetching all customer records...\n');

    // Fetch all customers
    const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('id');

    if (error) {
        console.error('❌ Error fetching customers:', error);
        return;
    }

    stats.totalCustomers = customers.length;
    stats.customersWithParticipants = customers.filter(c => c.participants && c.participants.length > 0).length;
    stats.customersWithoutParticipants = customers.filter(c => !c.participants || c.participants.length === 0).length;

    console.log(`   Total Customers: ${stats.totalCustomers}`);
    console.log(`   With Participants: ${stats.customersWithParticipants}`);
    console.log(`   Without Participants: ${stats.customersWithoutParticipants}\n`);

    console.log('🔄 Processing records...\n');

    // Process each customer
    for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        const logEntry = await processCustomer(customer);
        migrationLog.push(logEntry);

        // Progress indicator
        if ((i + 1) % 50 === 0 || i === customers.length - 1) {
            process.stdout.write(`\r   Processed: ${i + 1}/${stats.totalCustomers} records...`);
        }
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('═'.repeat(80));
    generateReport();
}

/**
 * Generate comprehensive report
 */
function generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    console.log('\n📊 MIGRATION SUMMARY');
    console.log('─'.repeat(80));
    console.log(`Total Customers Processed:           ${stats.totalCustomers}`);
    console.log(`Principal Members Added:             ${stats.principalMembersAdded}`);
    console.log(`Total Suffixes Assigned:             ${stats.suffixesAssigned}`);
    console.log(`Suffixes Already Correct:            ${stats.suffixesAlreadyCorrect}`);
    console.log(`Suffixes Corrected:                  ${stats.suffixesCorrected}`);
    console.log(`Errors Encountered:                  ${stats.errors.length}`);
    console.log('─'.repeat(80));

    // Calculate compliance rate
    const compliance = ((stats.totalCustomers - stats.errors.length) / stats.totalCustomers * 100).toFixed(2);
    console.log(`\n✅ Compliance Rate: ${compliance}%`);

    // Changes breakdown
    const customersWithChanges = migrationLog.filter(log => log.changes.length > 0).length;
    console.log(`\n📝 Changes Made:`);
    console.log(`   Customers Modified: ${customersWithChanges}`);
    console.log(`   Customers Unchanged: ${stats.totalCustomers - customersWithChanges}`);

    // Show sample changes
    if (customersWithChanges > 0) {
        console.log(`\n📋 Sample Changes (first 5):`);
        migrationLog
            .filter(log => log.changes.length > 0)
            .slice(0, 5)
            .forEach(log => {
                console.log(`\n   Policy: ${log.policyNumber} - ${log.policyholderName}`);
                log.changes.forEach(change => {
                    console.log(`      • ${change}`);
                });
            });
    }

    // Show errors if any
    if (stats.errors.length > 0) {
        console.log(`\n⚠️  Errors/Issues (first 10):`);
        stats.errors.slice(0, 10).forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
        if (stats.errors.length > 10) {
            console.log(`   ... and ${stats.errors.length - 10} more (see full log)`);
        }
    }

    // Save detailed log
    const logFilename = `suffix-migration-log-${timestamp}.json`;
    fs.writeFileSync(logFilename, JSON.stringify({
        timestamp: new Date().toISOString(),
        statistics: stats,
        migrationLog
    }, null, 2));

    console.log('\n─'.repeat(80));
    console.log(`✅ Detailed log saved to: ${logFilename}`);
    console.log('─'.repeat(80));
}

// Run migration
runMigration().catch(console.error);
