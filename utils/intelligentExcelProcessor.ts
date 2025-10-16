import * as XLSX from 'xlsx';

/**
 * Intelligent Excel File Processor for Stone River Insurance
 * Automatically detects, normalizes, and validates uploaded Excel files
 */

// Field mapping configuration with fuzzy matching variations
const FIELD_MAPPINGS = {
    // Policyholder Information
    first_name: ['first name', 'firstname', 'fname', 'given name', 'name'],
    surname: ['surname', 'last name', 'lastname', 'lname', 'family name'],
    date_of_birth: ['date of birth', 'dob', 'birthdate', 'birth date', 'dateofbirth'],
    id_number: ['id', 'id number', 'idnumber', 'national id', 'identity number', 'nationalid', 'identity'],
    policy_number: ['policy number', 'policy no', 'policy id', 'ref no', 'policyno', 'policynumber', 'reference'],
    phone_number: ['phone number', 'phone', 'contact', 'cell', 'mobile', 'phonenumber', 'telephone', 'tel'],
    email: ['email', 'email address', 'emailaddress', 'e-mail'],
    address: ['address', 'residential address', 'location', 'street address', 'physical address', 'home address'],
    town: ['town', 'city', 'suburb', 'area'],
    postal_address: ['postal address', 'postal', 'po box', 'mailing address'],
    policy_type: ['policy type', 'plan', 'package', 'funeral package', 'policy', 'product'],
    start_date: ['start date', 'join date', 'registration date', 'inception date', 'commencement date'],
    cover_date: ['cover date', 'cover start date', 'coverage date', 'effective date'],
    premium: ['premium', 'monthly fee', 'amount', 'monthly premium', 'total premium', 'cost', 'price'],
    medical_aid: ['medical aid', 'health plan', 'insurance add-on', 'addon', 'medical'],
    spouse_name: ['spouse name', 'partner', 'wife/husband', 'spouse', 'partner name'],
    gender: ['gender', 'sex', 'm/f'],
    status: ['status', 'membership status', 'policy status', 'account status'],
    agent: ['agent', 'agent name', 'assigned agent', 'sales agent', 'broker'],

    // Dependents Section
    dependent_name: ['dependent name', 'dependant', 'child name', 'dependent', 'beneficiary name'],
    dependent_dob: ['dependent dob', 'dependent date of birth', 'dependent birthdate', 'child dob'],
    dependent_id_number: ['dependent id', 'birth certificate', 'dependent id number', 'child id'],
    dependent_relationship: ['relationship', 'relation', 'dependent relationship', 'type'],
    dependent_policy: ['dependent plan', 'dependent policy', 'cover level', 'dependent package'],
    dependent_premium: ['dependent premium', 'dependent fee', 'dependent amount', 'child premium'],
    dependent_gender: ['dependent gender', 'child gender', 'dependent sex'],

    // Receipts and Payments Section
    receipt_number: ['receipt no', 'receipt number', 'transaction id', 'receipt', 'ref', 'receiptno'],
    payment_date: ['payment date', 'date', 'receipt date', 'transaction date', 'paid date'],
    paid_amount: ['paid amount', 'amount paid', 'payment', 'amount', 'total'],
    payment_method: ['payment method', 'mode of payment', 'method', 'payment type'],
    payment_period: ['payment period', 'period', 'month', 'payment month', 'for month'],
    cashier: ['cashier', 'received by', 'collector', 'agent']
};

// Sheet type detection keywords
const SHEET_TYPE_KEYWORDS = {
    policyholder: ['policyholder', 'main', 'customer', 'client', 'policy holder', 'member'],
    dependent: ['dependent', 'dependant', 'child', 'spouse', 'beneficiary', 'family'],
    receipt: ['receipt', 'payment', 'transaction', 'cash', 'payment history']
};

export type SheetType = 'policyholder' | 'dependent' | 'receipt' | 'unknown';

export interface NormalizedSheet {
    sheetName: string;
    originalSheetName: string;
    sheetType: SheetType;
    headers: string[];
    data: Record<string, any>[];
    rowCount: number;
    mappedFields: Record<string, string>;
    unmappedFields: string[];
}

export interface ProcessedExcelFile {
    fileName: string;
    sheets: NormalizedSheet[];
    errors: string[];
    warnings: string[];
    isValid: boolean;
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Find best matching field for a column header
 */
function findBestMatch(header: string): { field: string; confidence: number } | null {
    const normalized = normalizeString(header);

    let bestMatch: { field: string; confidence: number } | null = null;

    for (const [targetField, variations] of Object.entries(FIELD_MAPPINGS)) {
        for (const variation of variations) {
            const normalizedVariation = normalizeString(variation);

            // Exact match
            if (normalized === normalizedVariation) {
                return { field: targetField, confidence: 1.0 };
            }

            // Contains match
            if (normalized.includes(normalizedVariation) || normalizedVariation.includes(normalized)) {
                const confidence = Math.min(normalized.length, normalizedVariation.length) /
                                 Math.max(normalized.length, normalizedVariation.length);

                if (!bestMatch || confidence > bestMatch.confidence) {
                    bestMatch = { field: targetField, confidence };
                }
            }
        }
    }

    // Return match if confidence is high enough
    return bestMatch && bestMatch.confidence > 0.6 ? bestMatch : null;
}

/**
 * Detect sheet type based on name and content
 */
function detectSheetType(sheetName: string, headers: string[]): SheetType {
    const normalizedName = normalizeString(sheetName);
    const normalizedHeaders = headers.map(h => normalizeString(h)).join(' ');

    // Check sheet name first
    for (const [type, keywords] of Object.entries(SHEET_TYPE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (normalizedName.includes(keyword)) {
                return type as SheetType;
            }
        }
    }

    // Check headers
    for (const [type, keywords] of Object.entries(SHEET_TYPE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (normalizedHeaders.includes(keyword)) {
                return type as SheetType;
            }
        }
    }

    // Detect by field patterns
    if (headers.some(h => normalizeString(h).includes('dependent') || normalizeString(h).includes('child'))) {
        return 'dependent';
    }

    if (headers.some(h => normalizeString(h).includes('receipt') || normalizeString(h).includes('payment'))) {
        return 'receipt';
    }

    // Default to policyholder if has typical fields
    if (headers.some(h => {
        const norm = normalizeString(h);
        return norm.includes('policy') || norm.includes('customer') || norm.includes('id number');
    })) {
        return 'policyholder';
    }

    return 'unknown';
}

/**
 * Parse and normalize date to YYYY-MM-DD format
 */
function normalizeDate(value: any): string | null {
    if (!value) return null;

    // Already in correct format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    // Excel serial number
    if (typeof value === 'number') {
        try {
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
                const year = date.y;
                const month = String(date.m).padStart(2, '0');
                const day = String(date.d).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            // Fall through to string parsing
        }
    }

    // Try parsing as date string
    if (typeof value === 'string') {
        const trimmed = value.trim();

        // Handle DD-MMM-YYYY format (e.g., "01-Aug-2023")
        const monthMap: Record<string, string> = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };

        const dateParts = trimmed.split(/[-\/\s]/);
        if (dateParts.length === 3) {
            let day, month, year;

            // Check if middle part is month name
            if (isNaN(Number(dateParts[1]))) {
                day = dateParts[0].padStart(2, '0');
                month = monthMap[dateParts[1].toLowerCase().substring(0, 3)] || dateParts[1];
                year = dateParts[2];
            } else if (dateParts[2].length === 4) {
                // DD-MM-YYYY or MM-DD-YYYY
                day = dateParts[0].padStart(2, '0');
                month = dateParts[1].padStart(2, '0');
                year = dateParts[2];
            } else {
                // DD-MM-YY
                day = dateParts[0].padStart(2, '0');
                month = dateParts[1].padStart(2, '0');
                year = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
            }

            return `${year}-${month}-${day}`;
        }

        // Try standard Date parsing
        try {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            // Invalid date
        }
    }

    return null;
}

/**
 * Clean and normalize text value
 */
function normalizeText(value: any): string {
    if (value === null || value === undefined) return '';

    return String(value)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
}

/**
 * Parse and normalize numeric value
 */
function normalizeNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;

    // Already a number
    if (typeof value === 'number') return value;

    // Parse string
    if (typeof value === 'string') {
        // Remove currency symbols and spaces
        const cleaned = value.replace(/[$,\s]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }

    return null;
}

/**
 * Clean and normalize a row of data
 */
function normalizeRow(row: Record<string, any>, mappedFields: Record<string, string>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [originalField, value] of Object.entries(row)) {
        const mappedField = mappedFields[originalField] || toSnakeCase(originalField);

        // Determine field type and normalize accordingly
        if (mappedField.includes('date') || mappedField.includes('dob')) {
            normalized[mappedField] = normalizeDate(value);
        } else if (mappedField.includes('premium') || mappedField.includes('amount') || mappedField.includes('fee')) {
            normalized[mappedField] = normalizeNumber(value);
        } else if (mappedField.includes('phone') || mappedField.includes('number')) {
            normalized[mappedField] = normalizeText(value);
        } else {
            normalized[mappedField] = normalizeText(value);
        }
    }

    return normalized;
}

/**
 * Process a single worksheet
 */
function processWorksheet(worksheet: XLSX.WorkSheet, sheetName: string): NormalizedSheet {
    // Read data with headers
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
        return {
            sheetName: toSnakeCase(sheetName),
            originalSheetName: sheetName,
            sheetType: 'unknown',
            headers: [],
            data: [],
            rowCount: 0,
            mappedFields: {},
            unmappedFields: []
        };
    }

    // Extract original headers
    const originalHeaders = Object.keys(rawData[0]);

    // Map headers to standard fields
    const mappedFields: Record<string, string> = {};
    const unmappedFields: string[] = [];

    for (const header of originalHeaders) {
        const match = findBestMatch(header);
        if (match) {
            mappedFields[header] = match.field;
        } else {
            unmappedFields.push(header);
            mappedFields[header] = toSnakeCase(header);
        }
    }

    // Detect sheet type
    const sheetType = detectSheetType(sheetName, originalHeaders);

    // Normalize all rows
    const normalizedData = rawData.map(row => normalizeRow(row, mappedFields));

    // Get standardized headers
    const standardHeaders = Object.values(mappedFields);

    return {
        sheetName: toSnakeCase(sheetName),
        originalSheetName: sheetName,
        sheetType,
        headers: standardHeaders,
        data: normalizedData,
        rowCount: normalizedData.length,
        mappedFields,
        unmappedFields
    };
}

/**
 * Process entire Excel file
 */
export async function processExcelFile(file: File): Promise<ProcessedExcelFile> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Read file
        const buffer = await file.arrayBuffer();

        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        } catch (e) {
            errors.push('Invalid or corrupted Excel file. Please upload a valid Excel file (.xlsx or .xls).');
            return {
                fileName: file.name,
                sheets: [],
                errors,
                warnings,
                isValid: false
            };
        }

        // Check if workbook has sheets
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            errors.push('Invalid or empty file. Please upload a valid Excel file (.xlsx or .xls).');
            return {
                fileName: file.name,
                sheets: [],
                errors,
                warnings,
                isValid: false
            };
        }

        // Process all sheets
        const sheets: NormalizedSheet[] = [];

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];

            try {
                const normalizedSheet = processWorksheet(worksheet, sheetName);

                if (normalizedSheet.rowCount === 0) {
                    warnings.push(`Sheet "${sheetName}" is empty and will be skipped.`);
                    continue;
                }

                if (normalizedSheet.unmappedFields.length > 0) {
                    warnings.push(`Sheet "${sheetName}": ${normalizedSheet.unmappedFields.length} column(s) could not be auto-mapped: ${normalizedSheet.unmappedFields.slice(0, 3).join(', ')}${normalizedSheet.unmappedFields.length > 3 ? '...' : ''}`);
                }

                sheets.push(normalizedSheet);
            } catch (e: any) {
                errors.push(`Error processing sheet "${sheetName}": ${e.message}`);
            }
        }

        // Validate results
        if (sheets.length === 0) {
            errors.push('No valid data found in any sheet. Please check your file format.');
        }

        return {
            fileName: file.name,
            sheets,
            errors,
            warnings,
            isValid: errors.length === 0 && sheets.length > 0
        };

    } catch (e: any) {
        errors.push(`Failed to process file: ${e.message}`);
        return {
            fileName: file.name,
            sheets: [],
            errors,
            warnings,
            isValid: false
        };
    }
}

/**
 * Generate summary of processed file
 */
export function generateProcessingSummary(result: ProcessedExcelFile): string {
    const lines: string[] = [];

    lines.push(`File: ${result.fileName}`);
    lines.push(`Sheets Processed: ${result.sheets.length}`);
    lines.push('');

    for (const sheet of result.sheets) {
        lines.push(`Sheet: ${sheet.originalSheetName}`);
        lines.push(`  Type: ${sheet.sheetType}`);
        lines.push(`  Rows: ${sheet.rowCount}`);
        lines.push(`  Fields: ${sheet.headers.length}`);
        lines.push(`  Mapped: ${Object.keys(sheet.mappedFields).length - sheet.unmappedFields.length}`);
        if (sheet.unmappedFields.length > 0) {
            lines.push(`  Unmapped: ${sheet.unmappedFields.length}`);
        }
        lines.push('');
    }

    if (result.warnings.length > 0) {
        lines.push('Warnings:');
        result.warnings.forEach(w => lines.push(`  - ${w}`));
        lines.push('');
    }

    if (result.errors.length > 0) {
        lines.push('Errors:');
        result.errors.forEach(e => lines.push(`  - ${e}`));
    }

    return lines.join('\n');
}
