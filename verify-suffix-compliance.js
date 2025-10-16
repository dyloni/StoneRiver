import { createClient } from '@supabase/supabase-js';
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

async function verifyCompliance() {
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║     PARTICIPANT SUFFIX SYSTEM - COMPLIANCE VERIFICATION                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

    const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('id');

    if (error) {
        console.error('❌ Error fetching customers:', error);
        return;
    }

    const stats = {
        totalCustomers: customers.length,
        totalParticipants: 0,
        principalMembers: 0,
        spouses: 0,
        children: 0,
        dependents: 0,
        compliant: 0,
        nonCompliant: 0,
        issues: []
    };

    customers.forEach(customer => {
        if (!customer.participants || customer.participants.length === 0) return;

        customer.participants.forEach(p => {
            stats.totalParticipants++;

            const suffixNum = parseInt(p.suffix);
            const relationship = p.relationship;

            // Check principal (000)
            if (relationship === 'Self' || relationship === 'Principal Member') {
                stats.principalMembers++;
                if (suffixNum === 0) {
                    stats.compliant++;
                } else {
                    stats.nonCompliant++;
                    stats.issues.push(`Policy ${customer.policy_number}: Principal has wrong suffix ${p.suffix}`);
                }
            }
            // Check spouse (101-199)
            else if (relationship === 'Spouse') {
                stats.spouses++;
                if (suffixNum >= 101 && suffixNum <= 199) {
                    stats.compliant++;
                } else {
                    stats.nonCompliant++;
                    stats.issues.push(`Policy ${customer.policy_number}: Spouse has wrong suffix ${p.suffix}`);
                }
            }
            // Check children (201-299)
            else if (['Child', 'Stepchild', 'Grandchild'].includes(relationship)) {
                stats.children++;
                if (suffixNum >= 201 && suffixNum <= 299) {
                    stats.compliant++;
                } else {
                    stats.nonCompliant++;
                    stats.issues.push(`Policy ${customer.policy_number}: Child has wrong suffix ${p.suffix}`);
                }
            }
            // Check dependents (301-399)
            else {
                stats.dependents++;
                if (suffixNum >= 301 && suffixNum <= 399) {
                    stats.compliant++;
                } else {
                    stats.nonCompliant++;
                    stats.issues.push(`Policy ${customer.policy_number}: Dependent has wrong suffix ${p.suffix}`);
                }
            }
        });
    });

    const complianceRate = (stats.compliant / stats.totalParticipants * 100).toFixed(2);

    console.log('📊 VERIFICATION RESULTS');
    console.log('─'.repeat(80));
    console.log(`Total Customers:              ${stats.totalCustomers}`);
    console.log(`Total Participants:           ${stats.totalParticipants}`);
    console.log('─'.repeat(80));
    console.log(`Principal Members (000):      ${stats.principalMembers}`);
    console.log(`Spouses (101-199):            ${stats.spouses}`);
    console.log(`Children (201-299):           ${stats.children}`);
    console.log(`Other Dependents (301-399):   ${stats.dependents}`);
    console.log('─'.repeat(80));
    console.log(`Compliant Suffixes:           ${stats.compliant}`);
    console.log(`Non-Compliant Suffixes:       ${stats.nonCompliant}`);
    console.log(`\n✅ COMPLIANCE RATE: ${complianceRate}%`);
    console.log('─'.repeat(80));

    if (stats.issues.length > 0) {
        console.log(`\n⚠️  ISSUES FOUND (${stats.issues.length}):`);
        stats.issues.slice(0, 10).forEach(issue => console.log(`   • ${issue}`));
        if (stats.issues.length > 10) {
            console.log(`   ... and ${stats.issues.length - 10} more`);
        }
    } else {
        console.log('\n✅ NO ISSUES FOUND - 100% COMPLIANCE ACHIEVED!');
    }

    console.log('\n' + '═'.repeat(80));
}

verifyCompliance().catch(console.error);
