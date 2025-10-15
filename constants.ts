import { faker } from '@faker-js/faker';
import { 
    Agent, Admin, AdminRole, FuneralPackage, MedicalPackage, CashBackAddon, 
    Customer, Participant, AppRequest, PolicyStatus, RequestType, MakePaymentRequest, 
    RequestStatus, PaymentMethod, ChatMessage 
} from './types';
import { calculatePremiumComponents, getNextPaymentPeriod } from './utils/policyHelpers';

// --- STATIC DATA ---

export const AGENTS: Agent[] = [];

export const ADMINS: Admin[] = [];

export const SUM_ASSURED_AMOUNTS: Record<FuneralPackage, number> = {
    [FuneralPackage.LITE]: 500,
    [FuneralPackage.STANDARD]: 1000,
    [FuneralPackage.PREMIUM]: 1500,
};

export const SUM_ASSURED_CAP = 2000;

export const FUNERAL_PACKAGE_DETAILS: Record<string, { description: string; sumAssured: number; benefits: string[], rules?: string[] }> = {
    [FuneralPackage.LITE]: {
        description: "Affordable coverage for your entire family with essential funeral services.",
        sumAssured: 500,
        benefits: [
            "$500 Sum Assured per person",
            "2 Tier Casket",
            "$50 Grocery voucher",
            "Hearse within 50km radius",
            "Bus transportation at $1.50 per km",
            "Grave equipment included"
        ],
        rules: [
            "Family package price: $5.00 per month",
            "Covers: Member, Spouse, and up to 4 children (biological/step/grand/siblings)",
            "Children covered up to age 18 (or 23 if student with school ID)",
            "Dependents above 64 years: +$2.50 per person (Premium package only)"
        ]
    },
    [FuneralPackage.STANDARD]: {
        description: "Enhanced coverage with better benefits and quality casket options.",
        sumAssured: 1000,
        benefits: [
            "$1,000 Sum Assured per person",
            "Boston Dome Casket",
            "$80 Grocery voucher",
            "Hearse transportation",
            "Bus transportation at $1.50 per km",
            "Grave equipment included"
        ],
        rules: [
            "Family package price: $8.00 per month",
            "Covers: Member, Spouse, and up to 4 children (biological/step/grand/siblings)",
            "Children covered up to age 18 (or 23 if student with school ID)",
            "Dependents above 64 years: +$2.50 per person (Premium package only)"
        ]
    },
    [FuneralPackage.PREMIUM]: {
        description: "Comprehensive coverage with premium benefits and full transportation support.",
        sumAssured: 1500,
        benefits: [
            "$1,500 Sum Assured per person",
            "Wrap Around Dome Casket",
            "$150 Grocery voucher",
            "Hearse transportation",
            "Bus transportation included",
            "Grave equipment included"
        ],
        rules: [
            "Family package price: $15.00 per month",
            "Covers: Member, Spouse, and up to 4 children (biological/step/grand/siblings)",
            "Children covered up to age 18 (or 23 if student with school ID)",
            "No additional charge for dependents above 64 years"
        ]
    }
};

export const MEDICAL_PACKAGE_DETAILS: Record<MedicalPackage, { name: string; price: number }> = {
    [MedicalPackage.NONE]: { name: 'No Medical Aid', price: 0 },
    [MedicalPackage.ZIMHEALTH]: { name: 'ZimHealth', price: 1.00 },
    [MedicalPackage.FAMILY_LIFE]: { name: 'Family Life', price: 7.00 },
    [MedicalPackage.ALKAANE]: { name: 'Alkaane', price: 18.00 },
};

export const CASH_BACK_DETAILS: Record<CashBackAddon, { name: string; price: number; payout: number }> = {
    [CashBackAddon.NONE]: { name: 'No Cash Back', price: 0, payout: 0 },
    [CashBackAddon.CB1]: { name: 'CB1 ($250 Payout)', price: 1.00, payout: 250 },
    [CashBackAddon.CB2]: { name: 'CB2 ($500 Payout)', price: 2.00, payout: 500 },
    [CashBackAddon.CB3]: { name: 'CB3 ($750 Payout)', price: 3.00, payout: 750 },
    [CashBackAddon.CB4]: { name: 'CB4 ($1000 Payout)', price: 4.00, payout: 1000 },
};

export const SUFFIX_CODE_RANGES = {
    PRINCIPAL: { base: 0, start: 0, end: 0, code: '000' },
    SPOUSE: { base: 100, start: 101, end: 199 },
    CHILD: { base: 200, start: 201, end: 299 },
    DEPENDENT: { base: 300, start: 301, end: 399 }
} as const;

export const PARTICIPANT_TYPE_SUFFIX_MAP: Record<string, keyof typeof SUFFIX_CODE_RANGES> = {
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


// --- DYNAMIC MOCK DATA GENERATION ---

const generateMockData = () => {
    const customers: Customer[] = [];
    const requests: AppRequest[] = [];
    const messages: ChatMessage[] = [];

    return { customers, requests, messages };
};


const mockData = generateMockData();
export const CUSTOMERS = mockData.customers;
export const REQUESTS = mockData.requests;
export const MESSAGES = mockData.messages;