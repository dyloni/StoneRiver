# Intelligent Excel Import System - User Guide

**Implementation Date:** October 16, 2025
**Status:** Fully Operational

---

## Overview

The Intelligent Excel Import System automatically detects, normalizes, and validates uploaded Excel files for Stone River Insurance. It handles various column naming conventions, cleans data, and provides a preview before importing.

---

## Key Features

### 1. Automatic Column Detection

The system intelligently maps your column headers to Stone River's standard fields, even if the names differ:

| Your Column Name | Mapped To |
|-----------------|-----------|
| "First Name", "Firstname", "Fname", "Given Name" | `first_name` |
| "Surname", "Last Name", "Lname" | `surname` |
| "DOB", "Date of Birth", "Birthdate" | `date_of_birth` |
| "ID", "ID Number", "National ID" | `id_number` |
| "Policy No", "Policy Number", "Ref No" | `policy_number` |
| "Phone", "Contact", "Cell", "Mobile" | `phone_number` |
| "Email", "Email Address" | `email` |
| "Address", "Location", "Residential Address" | `address` |
| "Start Date", "Join Date", "Inception Date" | `start_date` |
| "Premium", "Monthly Fee", "Amount" | `premium` |

**And many more...** (60+ field mappings supported)

### 2. Multi-Sheet Processing

The system reads **ALL sheets** in your Excel file and automatically detects the type of each sheet:

#### Policyholder Sheets
Detected by keywords: "policyholder", "main", "customer", "client", "member"

**Contains fields like:**
- Policy Number
- Personal Information (Name, ID, DOB)
- Contact Details (Phone, Email, Address)
- Policy Details (Package, Premium, Dates)

#### Dependent Sheets
Detected by keywords: "dependent", "child", "spouse", "beneficiary", "family"

**Contains fields like:**
- Dependent Name
- Relationship to Policy Holder
- Date of Birth
- ID Number
- Coverage Details

#### Receipt/Payment Sheets
Detected by keywords: "receipt", "payment", "transaction", "cash"

**Contains fields like:**
- Receipt Number
- Payment Date
- Amount Paid
- Payment Method
- Payment Period

### 3. Data Normalization

The system automatically:

#### Date Standardization
- Converts all date formats to `YYYY-MM-DD`
- Handles: DD-MMM-YYYY, DD/MM/YYYY, MM-DD-YY, Excel serial numbers
- Examples:
  - "01-Aug-2023" → "2023-08-01"
  - "8/1/23" → "2023-08-01"
  - 44774 (Excel number) → "2023-08-01"

#### Text Cleaning
- Removes extra spaces
- Removes special characters and control codes
- Trims leading/trailing whitespace
- Standardizes text formatting

#### Numeric Validation
- Extracts numbers from currency strings ($10.50 → 10.50)
- Removes thousands separators (1,000 → 1000)
- Validates numeric fields

#### Column Name Standardization
- Converts to lowercase
- Replaces spaces with underscores
- Removes special characters
- Example: "Date of Birth" → "date_of_birth"

---

## How to Use

### Step 1: Prepare Your Excel File

Your Excel file can contain one or more sheets with any of these data types:
- **Policyholders** (main customer data)
- **Dependents** (family members/beneficiaries)
- **Receipts** (payment records)

**Column headers can vary!** The system will automatically detect them.

### Step 2: Upload File

1. Click "Import Data" or "Upload" button
2. Select your Excel file (.xlsx or .xls)
3. Click "Analyze File"

### Step 3: Review Preview

The system will show you:

✅ **Success Summary**
- Number of sheets detected
- Total rows found
- Sheet types identified

⚠️ **Warnings** (if any)
- Unmapped columns (columns that couldn't be auto-matched)
- Empty sheets
- Missing data

📊 **Data Preview**
- First 5 rows of each sheet
- Column mappings
- Normalized data

### Step 4: Confirm Import

If the preview looks correct:
1. Click "Confirm & Import"
2. Data will be imported into the system
3. Success notification will appear

If something looks wrong:
1. Click "Back" to select a different file
2. Or click "Cancel" to exit

---

## Supported Column Names

### Policyholder Information

#### Personal Details
- **First Name:** First Name, Firstname, Fname, Given Name, Name
- **Surname:** Surname, Last Name, Lastname, Lname, Family Name
- **Date of Birth:** Date of Birth, DOB, Birthdate, Birth Date
- **ID Number:** ID, ID Number, IDNumber, National ID, Identity Number
- **Gender:** Gender, Sex, M/F
- **Phone:** Phone Number, Phone, Contact, Cell, Mobile, Telephone
- **Email:** Email, Email Address, E-mail

#### Address Information
- **Street Address:** Address, Residential Address, Location, Street Address, Physical Address
- **Town:** Town, City, Suburb, Area
- **Postal Address:** Postal Address, Postal, PO Box, Mailing Address

#### Policy Information
- **Policy Number:** Policy Number, Policy No, Policy ID, Ref No, Reference
- **Policy Type:** Policy Type, Plan, Package, Funeral Package, Product
- **Premium:** Premium, Monthly Fee, Amount, Monthly Premium, Total Premium
- **Start Date:** Start Date, Join Date, Registration Date, Inception Date
- **Cover Date:** Cover Date, Cover Start Date, Coverage Date, Effective Date
- **Status:** Status, Membership Status, Policy Status, Account Status

#### Additional Fields
- **Medical Aid:** Medical Aid, Health Plan, Insurance Add-On, Addon
- **Spouse Name:** Spouse Name, Partner, Wife/Husband, Spouse
- **Agent:** Agent, Agent Name, Assigned Agent, Sales Agent, Broker

### Dependent Information

- **Dependent Name:** Dependent Name, Dependant, Child Name, Dependent, Beneficiary Name
- **Dependent DOB:** Dependent DOB, Dependent Date of Birth, Dependent Birthdate
- **Dependent ID:** Dependent ID, Birth Certificate, Dependent ID Number, Child ID
- **Relationship:** Relationship, Relation, Dependent Relationship, Type
- **Dependent Policy:** Dependent Plan, Dependent Policy, Cover Level
- **Dependent Premium:** Dependent Premium, Dependent Fee, Dependent Amount
- **Dependent Gender:** Dependent Gender, Child Gender, Dependent Sex

### Receipt/Payment Information

- **Receipt Number:** Receipt No, Receipt Number, Transaction ID, Receipt, Ref
- **Payment Date:** Payment Date, Date, Receipt Date, Transaction Date
- **Paid Amount:** Paid Amount, Amount Paid, Payment, Amount, Total
- **Payment Method:** Payment Method, Mode of Payment, Method, Payment Type
- **Payment Period:** Payment Period, Period, Month, Payment Month, For Month
- **Cashier:** Cashier, Received By, Collector, Agent

---

## Field Mapping Examples

### Example 1: Customer Import

**Your Excel Columns:**
```
| First Name | Last Name | ID No      | Mobile No  | Plan            | Monthly Fee |
|------------|-----------|------------|------------|-----------------|-------------|
| John       | Doe       | 63-123456  | 0771234567 | Premium Package | 25.00       |
```

**Mapped Fields:**
```
| first_name | surname | id_number  | phone_number | policy_type     | premium |
|------------|---------|------------|--------------|-----------------|---------|
| John       | Doe     | 63-123456  | 0771234567   | Premium Package | 25.00   |
```

### Example 2: Dependent Import

**Your Excel Columns:**
```
| Policy No  | Child Name    | Relation | Child DOB  | Birth Certificate |
|------------|---------------|----------|------------|-------------------|
| 63123456A  | Jane Doe      | Daughter | 15-05-2010 | 63-9876543       |
```

**Mapped Fields:**
```
| policy_number | dependent_name | dependent_relationship | dependent_dob | dependent_id_number |
|---------------|----------------|------------------------|---------------|---------------------|
| 63123456A     | Jane Doe       | Daughter               | 2010-05-15    | 63-9876543          |
```

### Example 3: Receipt Import

**Your Excel Columns:**
```
| Receipt No | Date       | Amount Paid | Mode of Payment | For Month |
|------------|------------|-------------|-----------------|-----------|
| R-001234   | 10-Jan-25  | 25.00       | Cash            | 01-2025   |
```

**Mapped Fields:**
```
| receipt_number | payment_date | paid_amount | payment_method | payment_period |
|----------------|--------------|-------------|----------------|----------------|
| R-001234       | 2025-01-10   | 25.00       | Cash           | 01-2025        |
```

---

## Error Handling

### Invalid File Errors

**Error:** "Invalid or empty file. Please upload a valid Excel file (.xlsx or .xls)."

**Causes:**
- File is corrupted
- File is not an Excel file
- File has no data

**Solution:**
- Ensure file is a valid .xlsx or .xls format
- Check that file contains data
- Try re-saving the file in Excel

### Empty Sheet Warnings

**Warning:** "Sheet 'Sheet1' is empty and will be skipped."

**Causes:**
- Sheet has no data rows (only headers or completely empty)

**Action:** Sheet will be skipped, no action needed

### Unmapped Column Warnings

**Warning:** "Sheet 'Customers': 3 column(s) could not be auto-mapped: Custom Field 1, Custom Field 2..."

**Causes:**
- Column names don't match any known variations
- Custom fields not in standard mapping

**Action:**
- Review preview to ensure data is correct
- Unmapped columns will use snake_case versions of original names
- Data is still imported, just not standardized

---

## Best Practices

### 1. File Preparation

✅ **Do:**
- Use clear, descriptive column headers
- Keep one data type per sheet (policyholders, dependents, or receipts)
- Use standard date formats
- Remove empty rows/columns
- Ensure data is complete

❌ **Don't:**
- Mix different data types in one sheet
- Use merged cells
- Have multiple header rows
- Leave critical fields empty

### 2. Column Naming

The system is flexible, but these are recommended:

**For Policyholders:**
- First Name, Surname, ID Number
- Policy Number, Policy Type
- Phone Number, Email
- Inception Date, Premium

**For Dependents:**
- Policy Number (to link to policy holder)
- Dependent Name, Dependent DOB
- Relationship, Dependent ID

**For Receipts:**
- Policy Number or ID Number (to link to policy)
- Receipt Number, Payment Date
- Paid Amount, Payment Method

### 3. Data Quality

- **Dates:** Use consistent format (DD-MM-YYYY or DD/MM/YYYY)
- **Phone Numbers:** Include full number with country code if international
- **Amounts:** Can include currency symbols ($, R, etc.) - will be cleaned
- **IDs:** Use consistent format with hyphens where applicable

---

## Technical Details

### Fuzzy Matching Algorithm

The system uses intelligent fuzzy matching with 60%+ confidence threshold:

1. **Exact Match:** Column name exactly matches a variation
2. **Partial Match:** Column name contains or is contained in a variation
3. **Confidence Score:** Calculated based on string similarity
4. **Best Match:** Highest confidence match is selected

### Data Type Detection

Fields are automatically typed based on name:
- **Dates:** Fields containing "date", "dob"
- **Numbers:** Fields containing "premium", "amount", "fee"
- **Text:** All other fields

### Sheet Type Detection

Priority order:
1. Sheet name keywords
2. Header keywords
3. Field pattern analysis
4. Default to policyholder if ambiguous

---

## Troubleshooting

### Problem: File Upload Fails

**Solutions:**
1. Check file is .xlsx or .xls format
2. Ensure file isn't password protected
3. Try opening and re-saving in Excel
4. Check file size (should be reasonable, <10MB recommended)

### Problem: Wrong Sheet Type Detected

**Solutions:**
1. Rename sheet to include type keyword (e.g., "Customers", "Dependents", "Receipts")
2. Ensure columns match expected fields for that type
3. Review preview and verify data looks correct before importing

### Problem: Dates Not Formatting Correctly

**Solutions:**
1. Use DD-MM-YYYY or DD/MM/YYYY format
2. Avoid ambiguous formats like MM-DD-YY
3. Use Excel's date format (Format Cells → Date)
4. Check preview to verify dates converted correctly

### Problem: Some Columns Not Mapped

**Solutions:**
1. Check column names match supported variations
2. Rename columns to standard names if needed
3. Unmapped columns are still imported with original names (snake_case)
4. Contact support if critical fields aren't being mapped

---

## API / Integration Notes

The intelligent processor can be used programmatically:

```typescript
import { processExcelFile } from './utils/intelligentExcelProcessor';

// Process file
const result = await processExcelFile(file);

// Check if valid
if (result.isValid) {
    // Access normalized data
    for (const sheet of result.sheets) {
        console.log(`Sheet: ${sheet.originalSheetName}`);
        console.log(`Type: ${sheet.sheetType}`);
        console.log(`Rows: ${sheet.rowCount}`);
        console.log(`Data:`, sheet.data);
    }
} else {
    // Handle errors
    console.error(result.errors);
}
```

---

## Support

For assistance with:
- Custom field mappings
- Special data formats
- Integration issues
- Feature requests

Contact your system administrator or refer to the technical documentation.

---

**Version:** 1.0
**Last Updated:** October 16, 2025
**Maintained By:** Stone River Insurance Technical Team
