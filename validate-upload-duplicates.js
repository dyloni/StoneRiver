import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

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

/**
 * Pre-Upload Validation Utility
 * Prevents duplicate Policy Holder IDs from being uploaded
 */

class UploadValidator {
    constructor() {
        this.existingIds = new Set();
        this.validationReport = {
            totalRecords: 0,
            validRecords: 0,
            duplicatesInFile: [],
            duplicatesWithDatabase: [],
            otherErrors: []
        };
    }

    /**
     * Load existing Policy Holder IDs from database
     */
    async loadExistingIds() {
        console.log('📥 Loading existing Policy Holder IDs from database...\n');

        const { data: customers, error } = await supabase
            .from('customers')
            .select('id_number');

        if (error) {
            throw new Error(`Failed to load existing IDs: ${error.message}`);
        }

        customers.forEach(customer => {
            if (customer.id_number) {
                this.existingIds.add(customer.id_number.trim());
            }
        });

        console.log(`✅ Loaded ${this.existingIds.size} existing Policy Holder IDs\n`);
    }

    /**
     * Parse Excel/CSV file
     */
    parseFile(filePath) {
        console.log(`📄 Parsing file: ${filePath}\n`);

        const fileExtension = filePath.split('.').pop().toLowerCase();

        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(worksheet);
        } else if (fileExtension === 'csv') {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const workbook = XLSX.read(fileContent, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(worksheet);
        } else if (fileExtension === 'json') {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
            throw new Error(`Unsupported file format: ${fileExtension}`);
        }
    }

    /**
     * Extract Policy Holder ID from record (handles various field names)
     */
    extractPolicyHolderId(record) {
        const possibleFields = [
            'id_number', 'ID Number', 'idNumber', 'PolicyHolderID',
            'policy_holder_id', 'ID_Number', 'Id Number', 'IDNUMBER'
        ];

        for (const field of possibleFields) {
            if (record[field]) {
                return String(record[field]).trim();
            }
        }

        return null;
    }

    /**
     * Validate records for duplicates
     */
    validateRecords(records) {
        console.log(`🔍 Validating ${records.length} records...\n`);

        this.validationReport.totalRecords = records.length;
        const uploadIds = new Map(); // Track IDs in this upload file

        records.forEach((record, index) => {
            const recordNum = index + 1;
            const policyHolderId = this.extractPolicyHolderId(record);

            // Check if Policy Holder ID exists
            if (!policyHolderId) {
                this.validationReport.otherErrors.push({
                    recordNumber: recordNum,
                    error: 'Missing Policy Holder ID',
                    record
                });
                return;
            }

            // Check for duplicates within the upload file
            if (uploadIds.has(policyHolderId)) {
                this.validationReport.duplicatesInFile.push({
                    policyHolderId,
                    recordNumbers: [uploadIds.get(policyHolderId), recordNum],
                    record
                });
            } else {
                uploadIds.set(policyHolderId, recordNum);
            }

            // Check against existing database records
            if (this.existingIds.has(policyHolderId)) {
                this.validationReport.duplicatesWithDatabase.push({
                    policyHolderId,
                    recordNumber: recordNum,
                    record
                });
            }
        });

        this.validationReport.validRecords =
            records.length -
            this.validationReport.duplicatesInFile.length -
            this.validationReport.duplicatesWithDatabase.length -
            this.validationReport.otherErrors.length;
    }

    /**
     * Generate validation report
     */
    generateReport() {
        console.log('═'.repeat(80));
        console.log('UPLOAD VALIDATION REPORT');
        console.log('═'.repeat(80));
        console.log('\n📊 SUMMARY:');
        console.log('─'.repeat(80));
        console.log(`Total Records in Upload:           ${this.validationReport.totalRecords}`);
        console.log(`Valid Records (No Conflicts):      ${this.validationReport.validRecords}`);
        console.log(`Duplicates Within File:            ${this.validationReport.duplicatesInFile.length}`);
        console.log(`Duplicates With Database:          ${this.validationReport.duplicatesWithDatabase.length}`);
        console.log(`Other Errors:                      ${this.validationReport.otherErrors.length}`);
        console.log('─'.repeat(80));

        const canProceed =
            this.validationReport.duplicatesInFile.length === 0 &&
            this.validationReport.duplicatesWithDatabase.length === 0 &&
            this.validationReport.otherErrors.length === 0;

        if (canProceed) {
            console.log('\n✅ VALIDATION PASSED - Upload can proceed safely');
        } else {
            console.log('\n❌ VALIDATION FAILED - Upload must be corrected before proceeding');
        }

        // Report duplicates within file
        if (this.validationReport.duplicatesInFile.length > 0) {
            console.log('\n⚠️  DUPLICATES WITHIN UPLOAD FILE:');
            console.log('─'.repeat(80));
            this.validationReport.duplicatesInFile.forEach((dup, index) => {
                console.log(`\n${index + 1}. Policy Holder ID: ${dup.policyHolderId}`);
                console.log(`   Found in records: ${dup.recordNumbers.join(', ')}`);
            });
        }

        // Report duplicates with database
        if (this.validationReport.duplicatesWithDatabase.length > 0) {
            console.log('\n⚠️  DUPLICATES WITH EXISTING DATABASE RECORDS:');
            console.log('─'.repeat(80));
            console.log('\nThese Policy Holder IDs already exist in the database:');
            this.validationReport.duplicatesWithDatabase.slice(0, 20).forEach((dup, index) => {
                console.log(`   ${index + 1}. ${dup.policyHolderId} (Record #${dup.recordNumber})`);
            });
            if (this.validationReport.duplicatesWithDatabase.length > 20) {
                console.log(`   ... and ${this.validationReport.duplicatesWithDatabase.length - 20} more`);
            }
        }

        // Report other errors
        if (this.validationReport.otherErrors.length > 0) {
            console.log('\n⚠️  OTHER VALIDATION ERRORS:');
            console.log('─'.repeat(80));
            this.validationReport.otherErrors.slice(0, 10).forEach((err, index) => {
                console.log(`   ${index + 1}. Record #${err.recordNumber}: ${err.error}`);
            });
            if (this.validationReport.otherErrors.length > 10) {
                console.log(`   ... and ${this.validationReport.otherErrors.length - 10} more`);
            }
        }

        console.log('\n' + '═'.repeat(80));

        return canProceed;
    }

    /**
     * Save detailed report to file
     */
    saveReportToFile() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `upload-validation-report-${timestamp}.json`;

        fs.writeFileSync(filename, JSON.stringify(this.validationReport, null, 2));

        console.log(`\n📄 Detailed validation report saved to: ${filename}`);
        return filename;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║           PRE-UPLOAD VALIDATION - DUPLICATE PREVENTION                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

    // Check if file path provided
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('❌ ERROR: No file path provided\n');
        console.log('Usage: node validate-upload-duplicates.js <file-path>\n');
        console.log('Supported formats: .xlsx, .xls, .csv, .json\n');
        console.log('Example: node validate-upload-duplicates.js data.xlsx');
        process.exit(1);
    }

    const filePath = args[0];

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ERROR: File not found: ${filePath}\n`);
        process.exit(1);
    }

    try {
        const validator = new UploadValidator();

        // Load existing IDs from database
        await validator.loadExistingIds();

        // Parse upload file
        const records = validator.parseFile(filePath);
        console.log(`✅ Parsed ${records.length} records from file\n`);

        // Validate records
        validator.validateRecords(records);

        // Generate report
        const canProceed = validator.generateReport();

        // Save detailed report
        validator.saveReportToFile();

        // Exit with appropriate code
        process.exit(canProceed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ VALIDATION ERROR:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default UploadValidator;
