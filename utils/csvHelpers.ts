// This file provides functions for exporting customer data to CSV and XLSX formats.
import { Customer, Agent, Participant, PolicyStatus, FuneralPackage, MedicalPackage, CashBackAddon } from '../types';
import * as XLSX from 'xlsx';
import { faker } from '@faker-js/faker';
import { calculatePremiumComponents, generatePolicyNumber } from './policyHelpers';
import { getEffectivePolicyStatus } from './statusHelpers';
import { assignSuffixCodes } from './participantHelpers';


const EXPORT_HEADERS = [
    'Policy Number', 'Suffix Code', 'Full ID', 'Relationship', 'First Name', 'Surname', 'Status', 'ID Number', 'Date of Birth', 'Gender', 'Phone', 'Email', 'Address', 'Postal Address',
    'Assigned Agent', 'Inception Date', 'Cover Date', 'Funeral Package', 'Medical Package', 'CashBack Addon'
];

// Helper to format a single participant into a row for export
const flattenParticipantToRow = (participant: Participant, customer: Customer, agentName: string, effectiveStatus: PolicyStatus) => {
    // The main policyholder's row contains all the policy-level info.
    // Dependent rows only contain their specific info + the linking Policy Number.
    const isHolder = participant.relationship === 'Self';
    const suffixCode = participant.suffix || '000';
    const fullId = `${customer.policyNumber}-${suffixCode}`;

    return {
        'Policy Number': customer.policyNumber,
        'Suffix Code': suffixCode,
        'Full ID': fullId,
        'Relationship': participant.relationship,
        'First Name': participant.firstName,
        'Surname': participant.surname,
        'Status': isHolder ? effectiveStatus : '',
        'ID Number': participant.idNumber || '',
        'Date of Birth': participant.dateOfBirth ? new Date(participant.dateOfBirth).toLocaleDateString() : '',
        'Gender': participant.gender || '',
        'Phone': isHolder ? customer.phone : (participant.phone || ''),
        'Email': isHolder ? customer.email : (participant.email || ''),
        'Address': isHolder ? `${customer.streetAddress}, ${customer.town}`: '',
        'Postal Address': isHolder ? customer.postalAddress : '',
        'Assigned Agent': isHolder ? agentName : '',
        'Inception Date': isHolder ? new Date(customer.inceptionDate).toLocaleDateString() : '',
        'Cover Date': isHolder ? new Date(customer.coverDate).toLocaleDateString() : '',
        'Funeral Package': isHolder ? customer.funeralPackage : '',
        'Medical Package': participant.medicalPackage || '',
        'CashBack Addon': participant.cashBackAddon || '',
    };
};

const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

// --- CORE EXPORT LOGIC ---

export const exportCustomersToFile = async (customers: Customer[], agents: Agent[], format: 'csv' | 'xlsx') => {
    if (customers.length === 0) {
        alert('No customers to export.');
        return;
    }

    const allRows: any[] = [];
    for (const customer of customers) {
        const agent = agents.find(a => a.id === customer.assignedAgentId);
        const agentName = agent ? `${agent.firstName} ${agent.surname}` : 'N/A';
        const effectiveStatus = await getEffectivePolicyStatus(customer);
        customer.participants.forEach(p => {
            allRows.push(flattenParticipantToRow(p, customer, agentName, effectiveStatus));
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(allRows, { header: EXPORT_HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    const filename = `customers_export_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(workbook, filename);
};


// --- CORE IMPORT LOGIC ---

const mapStatusFromFile = (statusString: string): PolicyStatus => {
    const normalized = statusString?.toLowerCase().trim();
    if (normalized === 'suspended') return PolicyStatus.SUSPENDED;
    if (normalized === 'express') return PolicyStatus.EXPRESS;
    if (normalized === 'active') return PolicyStatus.ACTIVE;
    if (normalized === 'inactive') return PolicyStatus.INACTIVE;
    if (normalized === 'overdue') return PolicyStatus.OVERDUE;
    if (normalized === 'cancelled') return PolicyStatus.CANCELLED;
    return PolicyStatus.ACTIVE;
};

const normalizeColumnName = (name: string): string => {
    return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};

const findColumn = (row: any, possibleNames: string[]): any => {
    for (const key of Object.keys(row)) {
        const normalizedKey = normalizeColumnName(key);
        if (possibleNames.some(name => normalizeColumnName(name) === normalizedKey)) {
            return row[key];
        }
    }
    return undefined;
};

export const parseCustomersFile = (
    fileData: string | ArrayBuffer,
    agents: Agent[],
    existingCustomers: Customer[],
    assignmentMode: 'file' | 'specific' | 'shared' = 'file',
    selectedAgentId: number | null = null
): { customers: Customer[], updatedCustomers: Customer[], errors: string[] } => {
    const workbook = XLSX.read(fileData, { type: 'binary', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

    const errors: string[] = [];
    const newCustomers: Customer[] = [];
    const updatedCustomers: Customer[] = [];

    // Group rows by Policy Number (normalized to uppercase)
    const groupedByPolicy = json.reduce((acc, row) => {
        const policyNumber = (findColumn(row, ['Policy Number', 'PolicyNumber', 'Policy No', 'Policy']) || findColumn(row, ['ID Number', 'IDNumber', 'ID No']))?.toString().trim().toUpperCase();
        if (policyNumber) {
            if (!acc[policyNumber]) {
                acc[policyNumber] = [];
            }
            acc[policyNumber].push(row);
        }
        return acc;
    }, {} as Record<string, any[]>);

    let customerIdCounter = Math.max(0, ...existingCustomers.map(c => c.id)) + 1;
    let participantIdCounter = Math.max(0, ...existingCustomers.flatMap(c => c.participants).map(p => p.id)) + 1;
    const existingPolicyMap = new Map(existingCustomers.map(c => [c.policyNumber.toUpperCase(), c]));


    for (const policyNumberInFile in groupedByPolicy) {
        const rows = groupedByPolicy[policyNumberInFile];
        const holderRow = rows.find(r => findColumn(r, ['Relationship', 'Type']) === 'Self') || rows[0];

        const idNumber = findColumn(holderRow, ['ID Number', 'IDNumber', 'ID No', 'National ID'])?.toString().trim();

        if (!idNumber) {
            errors.push(`Policy group '${policyNumberInFile}' is missing an ID Number for the main holder. Skipping.`);
            continue;
        }

        const derivedPolicyNumber = generatePolicyNumber(idNumber);

        if (policyNumberInFile && policyNumberInFile !== derivedPolicyNumber) {
            errors.push(`Warning for group '${policyNumberInFile}': Policy number in file does not match the one derived from the ID number ('${derivedPolicyNumber}'). Using the derived number.`);
        }

        const existingCustomer = existingPolicyMap.get(derivedPolicyNumber);
        const isUpdate = !!existingCustomer;

        let assignedAgentId: number | undefined;

        if (assignmentMode === 'specific' && selectedAgentId) {
            assignedAgentId = selectedAgentId;
        } else if (assignmentMode === 'shared') {
            assignedAgentId = undefined;
        } else {
            const agentName = findColumn(holderRow, ['Assigned Agent', 'Agent', 'Agent Name']);
            const agent = agents.find(a => `${a.firstName} ${a.surname}` === agentName);
            assignedAgentId = agent?.id;
        }

        const inceptionDateValue = findColumn(holderRow, ['Inception Date', 'InceptionDate', 'Start Date', 'Policy Date']);
        const inceptionDate = inceptionDateValue instanceof Date ? inceptionDateValue : new Date();
        const coverDateValue = findColumn(holderRow, ['Cover Date', 'CoverDate', 'Coverage Date']);
        const coverDate = coverDateValue instanceof Date ? coverDateValue : (() => {
            const defaultCover = new Date(inceptionDate);
            defaultCover.setMonth(defaultCover.getMonth() + 3);
            return defaultCover;
        })();
        const statusValue = findColumn(holderRow, ['Status', 'Policy Status', 'State']);
        const fileStatus = statusValue ? mapStatusFromFile(statusValue) : PolicyStatus.ACTIVE;

        const firstName = findColumn(holderRow, ['First Name', 'FirstName', 'Name', 'Given Name']) || '';
        const surname = findColumn(holderRow, ['Surname', 'Last Name', 'LastName', 'Family Name']) || '';
        const phone = findColumn(holderRow, ['Phone', 'Phone Number', 'PhoneNumber', 'Mobile', 'Cell']) || '';
        const email = findColumn(holderRow, ['Email', 'Email Address', 'EmailAddress']) || '';
        const gender = findColumn(holderRow, ['Gender', 'Sex']);
        const dobValue = findColumn(holderRow, ['Date of Birth', 'DateOfBirth', 'DOB', 'Birth Date', 'BirthDate']);
        const addressValue = findColumn(holderRow, ['Address', 'Street Address', 'Physical Address']);
        const postalValue = findColumn(holderRow, ['Postal Address', 'PostalAddress', 'P.O. Box', 'Postal']);
        const packageValue = findColumn(holderRow, ['Funeral Package', 'FuneralPackage', 'Package', 'Plan']);

        const customerBase: Partial<Customer> = {
            id: isUpdate ? existingCustomer.id : customerIdCounter++,
            uuid: isUpdate ? existingCustomer.uuid : faker.string.uuid(),
            policyNumber: derivedPolicyNumber,
            firstName: firstName,
            surname: surname,
            status: fileStatus,
            assignedAgentId: assignedAgentId,
            inceptionDate: inceptionDate.toISOString(),
            idNumber: idNumber,
            dateOfBirth: dobValue instanceof Date ? dobValue.toISOString() : (isUpdate ? existingCustomer.dateOfBirth : faker.date.birthdate({min: 18, max: 65, mode: 'age'}).toISOString()),
            gender: gender === 'Male' || gender === 'Female' ? gender : (isUpdate ? existingCustomer.gender : undefined),
            phone: phone,
            email: email,
            streetAddress: addressValue ? String(addressValue).split(',')[0]?.trim() : '',
            town: addressValue ? String(addressValue).split(',')[1]?.trim() : '',
            postalAddress: postalValue || '',
            funeralPackage: packageValue as FuneralPackage || FuneralPackage.STANDARD,
        };

        const participants: Participant[] = rows.map((row, index) => {
            const existingParticipant = isUpdate ? existingCustomer.participants[index] : null;
            const pFirstName = findColumn(row, ['First Name', 'FirstName', 'Name', 'Given Name']) || '';
            const pSurname = findColumn(row, ['Surname', 'Last Name', 'LastName', 'Family Name']) || '';
            const pRelationship = findColumn(row, ['Relationship', 'Type']) || 'Other Dependent';
            const pDOB = findColumn(row, ['Date of Birth', 'DateOfBirth', 'DOB', 'Birth Date']);
            const pID = findColumn(row, ['ID Number', 'IDNumber', 'ID No', 'National ID']);
            const pGender = findColumn(row, ['Gender', 'Sex']);
            const pMedical = findColumn(row, ['Medical Package', 'MedicalPackage', 'Medical', 'Medical Plan']);
            const pCashback = findColumn(row, ['CashBack Addon', 'Cashback', 'Cash Back']);

            return {
                id: existingParticipant?.id || participantIdCounter++,
                uuid: existingParticipant?.uuid || faker.string.uuid(),
                firstName: pFirstName,
                surname: pSurname,
                relationship: pRelationship,
                dateOfBirth: pDOB instanceof Date ? pDOB.toISOString() : '',
                idNumber: pID,
                gender: pGender === 'Male' || pGender === 'Female' ? pGender : undefined,
                medicalPackage: pMedical as MedicalPackage || MedicalPackage.NONE,
                cashBackAddon: pCashback as CashBackAddon || CashBackAddon.NONE,
            };
        });

        const participantsWithSuffix = assignSuffixCodes(participants);
        const premiumComponents = calculatePremiumComponents({ ...customerBase, participants: participantsWithSuffix });

        const customer: Customer = {
            ...customerBase,
            participants: participantsWithSuffix,
            ...premiumComponents,
            coverDate: coverDate.toISOString(),
            premiumPeriod: isUpdate ? existingCustomer.premiumPeriod : '',
            latestReceiptDate: isUpdate ? existingCustomer.latestReceiptDate : null,
            dateCreated: isUpdate ? existingCustomer.dateCreated : customerBase.inceptionDate!,
            lastUpdated: new Date().toISOString()
        } as Customer;

        if (isUpdate) {
            updatedCustomers.push(customer);
        } else {
            newCustomers.push(customer);
        }
    }

    return { customers: newCustomers, updatedCustomers, errors };
};

export const parseDependentsFile = (
    fileData: string | ArrayBuffer,
    existingCustomers: Customer[]
): { updatedCustomers: Customer[], errors: string[] } => {
    const workbook = XLSX.read(fileData, { type: 'binary', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

    const errors: string[] = [];
    const updatedCustomersMap = new Map<string, Customer>();

    let participantIdCounter = Math.max(0, ...existingCustomers.flatMap(c => c.participants).map(p => p.id)) + 1;

    for (let i = 0; i < json.length; i++) {
        const row = json[i];
        const rowNum = i + 2;

        const policyNumber = findColumn(row, ['Policy Number', 'PolicyNumber', 'Policy No', 'Policy'])?.toString().trim();

        if (!policyNumber) {
            errors.push(`Row ${rowNum}: Policy Number is required`);
            continue;
        }

        const normalizedPolicyNumber = policyNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const customer = existingCustomers.find(c =>
            c.policyNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === normalizedPolicyNumber
        );

        if (!customer) {
            errors.push(`Row ${rowNum}: Policy Number ${policyNumber} not found`);
            continue;
        }

        const firstName = findColumn(row, ['First Name', 'FirstName', 'Name', 'Given Name'])?.toString().trim();
        const surname = findColumn(row, ['Surname', 'Last Name', 'LastName', 'Family Name'])?.toString().trim();

        if (!firstName || !surname) {
            errors.push(`Row ${rowNum}: First Name and Surname are required`);
            continue;
        }

        const relationship = findColumn(row, ['Relationship', 'Type'])?.toString().trim() || 'Child';
        const idNumber = findColumn(row, ['ID Number', 'IDNumber', 'ID No', 'National ID'])?.toString().trim() || '';
        const dobValue = findColumn(row, ['Date of Birth', 'DateOfBirth', 'DOB', 'Birth Date']);
        const gender = findColumn(row, ['Gender', 'Sex'])?.toString().trim() || 'Male';
        const phone = findColumn(row, ['Phone', 'Phone Number', 'Mobile'])?.toString().trim() || '';
        const email = findColumn(row, ['Email', 'Email Address'])?.toString().trim() || '';
        const streetAddress = findColumn(row, ['Street Address', 'Address'])?.toString().trim() || customer.streetAddress;
        const town = findColumn(row, ['Town', 'City'])?.toString().trim() || customer.town;
        const postalAddress = findColumn(row, ['Postal Address', 'P.O. Box'])?.toString().trim() || customer.postalAddress;
        const medicalPackage = findColumn(row, ['Medical Package', 'Medical'])?.toString().trim() || 'None';
        const cashBackAddon = findColumn(row, ['CashBack Addon', 'Cashback', 'Cash Back'])?.toString().trim() || 'None';

        const newParticipant: Participant = {
            id: participantIdCounter++,
            uuid: faker.string.uuid(),
            firstName: firstName,
            surname: surname,
            relationship: relationship,
            idNumber: idNumber,
            dateOfBirth: dobValue instanceof Date ? dobValue.toISOString() : (dobValue ? dobValue.toString() : ''),
            gender: gender as 'Male' | 'Female',
            phone: phone,
            email: email,
            streetAddress: streetAddress,
            town: town,
            postalAddress: postalAddress,
            medicalPackage: medicalPackage,
            cashBackAddon: cashBackAddon,
        };

        let updatedCustomer = updatedCustomersMap.get(customer.policyNumber);
        if (!updatedCustomer) {
            updatedCustomer = { ...customer, participants: [...customer.participants] };
            updatedCustomersMap.set(customer.policyNumber, updatedCustomer);
        }

        updatedCustomer.participants.push(newParticipant);
    }

    const updatedCustomers = Array.from(updatedCustomersMap.values()).map(customer => {
        const participantsWithSuffix = assignSuffixCodes(customer.participants);
        const premiumComponents = calculatePremiumComponents({ ...customer, participants: participantsWithSuffix });

        return {
            ...customer,
            participants: participantsWithSuffix,
            ...premiumComponents,
            lastUpdated: new Date().toISOString(),
        };
    });

    return { updatedCustomers, errors };
};


// --- TEMPLATE GENERATION ---

export const generateUploadTemplate = () => {
    const exampleId = '12-345678-A90';
    const examplePolicyNumber = exampleId.replace(/[^a-zA-Z0-9]/g, '');

    const exampleData = [
        {
            'Policy Number': examplePolicyNumber,
            'Relationship': 'Self',
            'First Name': 'John',
            'Surname': 'Doe',
            'Status': 'Express',
            'ID Number': exampleId,
            'Date of Birth': '1985-05-20',
            'Gender': 'Male',
            'Phone': '0777123456',
            'Email': 'john.doe@example.com',
            'Address': '123 Example St, Harare',
            'Postal Address': 'P.O. Box 456',
            'Assigned Agent': 'Tariro Moyo',
            'Inception Date': '2023-01-15',
            'Cover Date': '2023-04-15',
            'Funeral Package': FuneralPackage.PREMIUM,
            // FIX: Property 'BASIC' does not exist on type 'typeof MedicalPackage'.
            'Medical Package': MedicalPackage.ZIMHEALTH,
            // FIX: Property 'FIVE_YEAR' does not exist on type 'typeof CashBackAddon'.
            'CashBack Addon': CashBackAddon.CB1,
        },
        {
            'Policy Number': examplePolicyNumber,
            'Relationship': 'Spouse',
            'First Name': 'Jane',
            'Surname': 'Doe',
            'Date of Birth': '1988-11-10',
            'Gender': 'Female',
            // FIX: Property 'BASIC' does not exist on type 'typeof MedicalPackage'.
            'Medical Package': MedicalPackage.ZIMHEALTH,
            'CashBack Addon': CashBackAddon.NONE,
        },
        {
            'Policy Number': examplePolicyNumber,
            'Relationship': 'Child',
            'First Name': 'Peter',
            'Surname': 'Doe',
            'Date of Birth': '2015-02-25',
            'Medical Package': MedicalPackage.NONE,
            'CashBack Addon': CashBackAddon.NONE,
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(exampleData, { header: EXPORT_HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Template');
    XLSX.writeFile(workbook, 'Customer_Upload_Template.xlsx');
};