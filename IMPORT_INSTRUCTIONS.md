# Bulk Import Instructions

This script allows you to import customers, dependents, and receipts from an Excel file into the Supabase database.

## File Location

Place your Excel file at: `public/Untitled spreadsheet (2).xlsx`

## Excel Format

The script expects the following columns in your Excel file. Column names are flexible (the script checks multiple variations):

### Record Type Column
- **Column Name**: `RecordType`, `Type`, or `type`
- **Values**:
  - `P` = Policy Holder (customer)
  - `PHnD` or `D` = Dependent
  - `R` = Receipt/Payment

### Policy Holder (P) Columns

Required:
- `PolicyNumber` / `policy_number` / `Policy`
- `FirstName` / `first_name` / `Name`
- `Surname` / `surname` / `LastName`

Optional:
- `IDNumber` / `id_number` / `ID`
- `Phone` / `phone` / `Mobile`
- `Email` / `email`
- `DateOfBirth` / `date_of_birth` / `DOB`
- `Gender` / `gender`
- `Town` / `town` / `City`
- `StreetAddress` / `street_address` / `Address`
- `PostalAddress` / `postal_address`
- `FuneralPackage` / `funeral_package` / `Package`
- `Status` / `status`
- `InceptionDate` / `inception_date` / `StartDate`
- `CoverDate` / `cover_date`
- `PolicyPremium` / `policy_premium` / `Premium`
- `AddonPremium` / `addon_premium`
- `TotalPremium` / `total_premium`
- `PremiumPeriod` / `premium_period`
- `AgentID` / `assigned_agent_id`

### Dependent (PHnD or D) Columns

Required:
- `PolicyNumber` / `policy_number` / `Policy` (to link to policy holder)
- `PolicyHolderID` / `policy_holder_id` / `HolderID` (policy holder's ID number)
- `FirstName` / `first_name` / `Name`
- `Surname` / `surname` / `LastName`

Optional:
- `Relationship` / `relationship` (e.g., Child, Spouse, Parent)
- `DateOfBirth` / `date_of_birth` / `DOB`
- `IDNumber` / `id_number` / `ID`
- `Gender` / `gender`
- `Phone` / `phone`
- `Email` / `email`

### Receipt/Payment (R) Columns

Required:
- `PolicyNumber` / `policy_number` / `Policy`
- `PaymentAmount` / `payment_amount` / `Amount`

Optional:
- `PaymentMethod` / `payment_method` / `Method`
- `PaymentPeriod` / `payment_period` / `Period`
- `PaymentDate` / `payment_date` / `Date`
- `ReceiptFilename` / `receipt_filename` / `Receipt`
- `AgentID` / `recorded_by_agent_id`

## How It Works

1. **Matches Existing Customers**: The script checks for existing customers by policy number and ID number to avoid duplicates
2. **Updates Existing Records**: If a customer already exists, it updates their information
3. **Links Dependents**: Dependents are matched to policy holders using policy number or policy holder ID number
4. **Imports Receipts**: Receipts are linked to customers by policy number

## Running the Import

```bash
node bulk-import.js
```

## Output

The script will show:
- Number of records found and categorized (P, PHnD/D, R)
- Number of new customers to insert
- Number of existing customers to update
- Number of dependents added
- Number of payments/receipts imported
- Any errors encountered

## Notes

- If a record doesn't have a `RecordType` column, it will be treated as a Policy Holder (P)
- Records with missing required fields will be skipped
- Dependents with the same ID number as an existing dependent will be skipped
- Receipts without a matching policy number will be skipped
