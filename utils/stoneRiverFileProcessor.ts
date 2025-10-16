import * as XLSX from 'xlsx';
import { Customer, Participant, Payment, FuneralPackage, MedicalPackage, CashBackAddon, PolicyStatus, PaymentMethod } from '../types';

export interface StoneRiverProcessResult {
  customers: Customer[];
  participants: Participant[];
  payments: Payment[];
  errors: Array<{ row: number; sheet: string; error: string }>;
}

interface RawPolicyHolder {
  policyNumber: string;
  fullName: string;
  membershipStatus: string;
  gender: string;
  nationalId: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  physicalAddress: string;
  policy: string;
  policyPremium: number;
  addonPremium: number;
  totalPremium: number;
  creationPeriod: string;
  premiumPeriod: string;
  inceptionDate: string;
  coverDate: string;
  latestReceiptDate: string;
  latestReceiptMonth: string;
  agent: string;
  dateCreated: string;
  lastUpdated: string;
  uuid: string;
}

interface RawDependent {
  policyHolder: string;
  policyNumber: string;
  relationship: string;
  firstName: string;
  middleName: string;
  lastName: string;
  sex: string;
  type: string;
  idBcNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  policy: string;
  policyPremium: number;
  addonPremium: number;
  totalPremium: number;
  totalSumAssured: number;
  agent: string;
  depStatus: string;
  subStatus: string;
  uuid: string;
  subscriberUuid: string;
}

interface RawReceipt {
  systemReceiptNumber: string;
  physicalReceiptNumber: string;
  subscriber: string;
  date: string;
  amount: number;
  exchangeRate: number;
  category: string;
  account: string;
  user: string;
  comments: string;
  physicalReceiptNumber2: string;
  paymentPeriod: string;
  premiumPeriod: string;
  createdAt: string;
  updatedAt: string;
  subscriberUuid: string;
  subscriberNationalId: string;
  uuid: string;
}

const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
};

const detectColumnMapping = (headers: string[]): Map<string, number> => {
  const mapping = new Map<string, number>();

  const columnPatterns: { [key: string]: string[] } = {
    policyNumber: ['policynumber', 'policy', 'policyno'],
    fullName: ['fullname', 'name'],
    membershipStatus: ['membershipstatus', 'status'],
    gender: ['gender', 'sex'],
    nationalId: ['nationalid', 'idnumber', 'id'],
    dateOfBirth: ['dateofbirth', 'dob', 'birthdate'],
    phoneNumber: ['phonenumber', 'phone', 'mobile', 'contact'],
    email: ['email', 'emailaddress'],
    physicalAddress: ['physicaladdress', 'address'],
    policy: ['policy'],
    policyPremium: ['policypremium', 'premium'],
    addonPremium: ['addonpremium', 'addon'],
    totalPremium: ['totalpremium', 'total'],
    creationPeriod: ['creationperiod', 'created'],
    premiumPeriod: ['premiumperiod', 'period'],
    inceptionDate: ['inceptiondate', 'inception'],
    coverDate: ['coverdate', 'cover'],
    latestReceiptDate: ['latestreceiptdate', 'receiptdate', 'lastreceipt'],
    latestReceiptMonth: ['latestreceiptmonth', 'receiptmonth'],
    agent: ['agent', 'agentname'],
    dateCreated: ['datecreated', 'createdat'],
    lastUpdated: ['lastupdated', 'updatedat'],
    uuid: ['uuid', 'id'],
    policyHolder: ['policyholder', 'holder'],
    relationship: ['relationship', 'relation'],
    firstName: ['firstname', 'fname'],
    middleName: ['middlename', 'mname'],
    lastName: ['lastname', 'lname', 'surname'],
    type: ['type'],
    idBcNumber: ['idbcnumber', 'idnumber', 'id'],
    totalSumAssured: ['totalsumassured', 'sumassured'],
    depStatus: ['depstatus', 'dependentstatus'],
    subStatus: ['substatus', 'subscriberstatus'],
    subscriberUuid: ['subscriberuuid', 'parentuuid'],
    systemReceiptNumber: ['systemreceiptnumber', 'receiptnumber', 'receiptno'],
    physicalReceiptNumber: ['physicalreceiptnumber', 'physical'],
    subscriber: ['subscriber', 'customer'],
    date: ['date', 'paymentdate'],
    amount: ['amount', 'paymentamount'],
    exchangeRate: ['exchangerate', 'rate'],
    category: ['category'],
    account: ['account', 'paymentmethod'],
    user: ['user', 'recordedby'],
    comments: ['comments', 'notes'],
    paymentPeriod: ['paymentperiod', 'period'],
    createdAt: ['createdat', 'created'],
    updatedAt: ['updatedat', 'updated'],
    subscriberNationalId: ['subscribernationalid', 'nationalid'],
  };

  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);

    for (const [key, patterns] of Object.entries(columnPatterns)) {
      if (patterns.some(pattern => normalized.includes(pattern) || pattern.includes(normalized))) {
        mapping.set(key, index);
        break;
      }
    }
  });

  return mapping;
};

const parseDate = (dateStr: string | number): string => {
  if (!dateStr) return '';

  if (typeof dateStr === 'number') {
    const date = XLSX.SSF.parse_date_code(dateStr);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  const str = String(dateStr).trim();

  const formats = [
    /(\d{1,2})-([A-Za-z]{3})-(\d{4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
  ];

  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      if (format === formats[0]) {
        const monthMap: { [key: string]: string } = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const month = monthMap[match[2].toLowerCase()];
        return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
      } else if (format === formats[1]) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      } else {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
    }
  }

  return str;
};

const parsePhone = (phone: string | number): string => {
  if (!phone) return '';
  const phoneStr = String(phone).replace(/\D/g, '');
  if (phoneStr.startsWith('263')) return phoneStr;
  if (phoneStr.startsWith('0')) return '263' + phoneStr.substring(1);
  return '263' + phoneStr;
};

const mapFuneralPackage = (packageName: string): FuneralPackage => {
  const normalized = packageName.toLowerCase();
  if (normalized.includes('lite')) return FuneralPackage.LITE;
  if (normalized.includes('standard')) return FuneralPackage.STANDARD;
  if (normalized.includes('premium')) return FuneralPackage.PREMIUM;
  return FuneralPackage.LITE;
};

const mapStatus = (status: string): PolicyStatus => {
  const normalized = status.toLowerCase();
  if (normalized.includes('active')) return PolicyStatus.ACTIVE;
  if (normalized.includes('suspend')) return PolicyStatus.SUSPENDED;
  if (normalized.includes('overdue')) return PolicyStatus.OVERDUE;
  if (normalized.includes('express')) return PolicyStatus.EXPRESS;
  if (normalized.includes('cancel')) return PolicyStatus.CANCELLED;
  return PolicyStatus.INACTIVE;
};

const mapRelationship = (rel: string): Participant['relationship'] => {
  const normalized = rel.toLowerCase();
  if (normalized.includes('self') || normalized.includes('holder')) return 'Self';
  if (normalized.includes('spouse') || normalized.includes('wife') || normalized.includes('husband')) return 'Spouse';
  if (normalized.includes('child') || normalized.includes('son') || normalized.includes('daughter')) return 'Child';
  if (normalized.includes('step')) return 'Stepchild';
  if (normalized.includes('grand') && normalized.includes('child')) return 'Grandchild';
  if (normalized.includes('sibling') || normalized.includes('brother') || normalized.includes('sister')) return 'Sibling';
  if (normalized.includes('parent') || normalized.includes('mother') || normalized.includes('father')) return 'Parent';
  if (normalized.includes('grand') && normalized.includes('parent')) return 'Grandparent';
  return 'Other Dependent';
};

export const processStoneRiverFile = async (file: File): Promise<StoneRiverProcessResult> => {
  const errors: Array<{ row: number; sheet: string; error: string }> = [];
  const customers: Customer[] = [];
  const participants: Participant[] = [];
  const payments: Payment[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);

    if (workbook.SheetNames.length !== 3) {
      throw new Error(`Expected 3 sheets (P, PHnD, R), found ${workbook.SheetNames.length}`);
    }

    const policyHolderSheet = workbook.Sheets[workbook.SheetNames[0]];
    const dependentSheet = workbook.Sheets[workbook.SheetNames[1]];
    const receiptSheet = workbook.Sheets[workbook.SheetNames[2]];

    const policyData = XLSX.utils.sheet_to_json(policyHolderSheet, { header: 1, defval: '' }) as any[][];
    const dependentData = XLSX.utils.sheet_to_json(dependentSheet, { header: 1, defval: '' }) as any[][];
    const receiptData = XLSX.utils.sheet_to_json(receiptSheet, { header: 1, defval: '' }) as any[][];

    if (policyData.length < 2) {
      throw new Error('Policy holder sheet is empty');
    }

    const policyMapping = detectColumnMapping(policyData[0]);
    const customerMap = new Map<string, Customer>();

    for (let i = 1; i < policyData.length; i++) {
      const row = policyData[i];
      if (!row || row.length === 0) continue;

      try {
        const policyNumber = String(row[policyMapping.get('policyNumber') || 0] || '').trim();
        if (!policyNumber) continue;

        const fullName = String(row[policyMapping.get('fullName') || 1] || '').trim();
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || nameParts[0];

        const customer: Customer = {
          id: i,
          uuid: String(row[policyMapping.get('uuid') || 22] || `generated-${policyNumber}`),
          policyNumber,
          firstName,
          surname,
          inceptionDate: parseDate(row[policyMapping.get('inceptionDate') || 15]),
          coverDate: parseDate(row[policyMapping.get('coverDate') || 16]),
          status: mapStatus(String(row[policyMapping.get('membershipStatus') || 2] || 'active')),
          assignedAgentId: 1,
          idNumber: String(row[policyMapping.get('nationalId') || 4] || ''),
          dateOfBirth: parseDate(row[policyMapping.get('dateOfBirth') || 5]),
          gender: String(row[policyMapping.get('gender') || 3] || 'Male') as 'Male' | 'Female',
          phone: parsePhone(row[policyMapping.get('phoneNumber') || 6]),
          email: String(row[policyMapping.get('email') || 7] || ''),
          streetAddress: String(row[policyMapping.get('physicalAddress') || 8] || ''),
          town: '',
          postalAddress: '',
          funeralPackage: mapFuneralPackage(String(row[policyMapping.get('policy') || 9] || 'Lite')),
          participants: [],
          policyPremium: Number(row[policyMapping.get('policyPremium') || 10] || 0),
          addonPremium: Number(row[policyMapping.get('addonPremium') || 11] || 0),
          totalPremium: Number(row[policyMapping.get('totalPremium') || 12] || 0),
          premiumPeriod: String(row[policyMapping.get('premiumPeriod') || 14] || ''),
          latestReceiptDate: parseDate(row[policyMapping.get('latestReceiptDate') || 17]) || null,
          dateCreated: parseDate(row[policyMapping.get('dateCreated') || 20]) || new Date().toISOString(),
          lastUpdated: parseDate(row[policyMapping.get('lastUpdated') || 21]) || new Date().toISOString(),
        };

        customers.push(customer);
        customerMap.set(customer.uuid, customer);
      } catch (error) {
        errors.push({
          row: i + 1,
          sheet: 'Policy Holders',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (dependentData.length > 1) {
      const dependentMapping = detectColumnMapping(dependentData[0]);

      for (let i = 1; i < dependentData.length; i++) {
        const row = dependentData[i];
        if (!row || row.length === 0) continue;

        try {
          const subscriberUuid = String(row[dependentMapping.get('subscriberUuid') || 20] || '');
          const customer = customerMap.get(subscriberUuid);

          const participant: Participant = {
            id: i + 10000,
            uuid: String(row[dependentMapping.get('uuid') || 19] || `dep-${i}`),
            firstName: String(row[dependentMapping.get('firstName') || 3] || ''),
            surname: String(row[dependentMapping.get('lastName') || 5] || ''),
            relationship: mapRelationship(String(row[dependentMapping.get('relationship') || 2] || 'Dependent')),
            dateOfBirth: parseDate(row[dependentMapping.get('dateOfBirth') || 10]),
            idNumber: String(row[dependentMapping.get('idBcNumber') || 8] || ''),
            gender: (String(row[dependentMapping.get('sex') || 6] || 'Male') === 'Male' ? 'Male' : 'Female') as 'Male' | 'Female',
            phone: parsePhone(row[dependentMapping.get('phoneNumber') || 9]),
            email: '',
            streetAddress: customer?.streetAddress || '',
            town: customer?.town || '',
            postalAddress: customer?.postalAddress || '',
          };

          participants.push(participant);

          if (customer) {
            customer.participants.push(participant);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            sheet: 'Dependents',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    if (receiptData.length > 1) {
      const receiptMapping = detectColumnMapping(receiptData[0]);

      for (let i = 1; i < receiptData.length; i++) {
        const row = receiptData[i];
        if (!row || row.length === 0) continue;

        try {
          const subscriberUuid = String(row[receiptMapping.get('subscriberUuid') || 15] || '');
          const customer = customerMap.get(subscriberUuid);

          if (customer) {
            const payment: Payment = {
              id: i + 20000,
              customer_id: customer.id,
              policy_number: customer.policyNumber,
              payment_amount: String(row[receiptMapping.get('amount') || 4] || '0'),
              payment_method: PaymentMethod.CASH,
              payment_period: String(row[receiptMapping.get('paymentPeriod') || 11] || ''),
              receipt_filename: null,
              recorded_by_agent_id: customer.assignedAgentId,
              payment_date: parseDate(row[receiptMapping.get('date') || 3]),
              is_legacy_receipt: true,
              legacy_receipt_notes: `System: ${row[receiptMapping.get('systemReceiptNumber') || 0]}, Physical: ${row[receiptMapping.get('physicalReceiptNumber') || 1]}`,
              created_at: parseDate(row[receiptMapping.get('createdAt') || 13]) || new Date().toISOString(),
              updated_at: parseDate(row[receiptMapping.get('updatedAt') || 14]) || new Date().toISOString(),
            };

            payments.push(payment);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            sheet: 'Receipts',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return { customers, participants, payments, errors };
  } catch (error) {
    throw new Error(`Failed to process Stone River file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
