import { Customer, Participant, FuneralPackage, MedicalPackage, CashBackAddon, AppRequest, RequestType, RequestStatus } from '../types';
import { MEDICAL_PACKAGE_DETAILS, CASH_BACK_DETAILS } from '../constants';
import { calculateAgeSurcharge } from './participantHelpers';

export const formatPolicyNumber = (policyNumber: string): string => {
    return policyNumber.replace(/[-\s]/g, '');
};

export const generatePolicyNumber = (idNumber: string): string => {
    return idNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

const packagePremiums: Record<string, { familyRate: number; extraDependentRate: number }> = {
    [FuneralPackage.LITE]: { familyRate: 5.00, extraDependentRate: 2.50 },
    [FuneralPackage.STANDARD]: { familyRate: 8.00, extraDependentRate: 4.00 },
    [FuneralPackage.PREMIUM]: { familyRate: 15.00, extraDependentRate: 7.50 },
};

interface PremiumCalculationInput {
    funeralPackage?: FuneralPackage;
    participants?: Partial<Participant>[];
}

const isBiologicalChild = (relationship: string): boolean => {
    return ['Child', 'Stepchild', 'Grandchild'].includes(relationship);
};

export const calculatePremiumComponents = (customer: PremiumCalculationInput): { policyPremium: number, addonPremium: number, totalPremium: number } => {
    let policyPremium = 0;
    let addonPremium = 0;
    const participants = customer.participants || [];

    if (customer.funeralPackage && packagePremiums[customer.funeralPackage]) {
        policyPremium = packagePremiums[customer.funeralPackage].familyRate;

        const biologicalChildren = participants.filter(p => isBiologicalChild(p.relationship || ''));
        const extraDependents = participants.filter(p =>
            p.relationship !== 'Self' &&
            p.relationship !== 'Spouse' &&
            !isBiologicalChild(p.relationship || '')
        );

        if (biologicalChildren.length > 4) {
            const extraChildren = biologicalChildren.length - 4;
            policyPremium += extraChildren * packagePremiums[customer.funeralPackage].extraDependentRate;
        }

        policyPremium += extraDependents.length * packagePremiums[customer.funeralPackage].extraDependentRate;
    }

    participants.forEach(p => {
        if (p.medicalPackage && MEDICAL_PACKAGE_DETAILS[p.medicalPackage]) {
            addonPremium += MEDICAL_PACKAGE_DETAILS[p.medicalPackage].price;
        }
        if (p.cashBackAddon && CASH_BACK_DETAILS[p.cashBackAddon]) {
            addonPremium += CASH_BACK_DETAILS[p.cashBackAddon].price;
        }
    });

    return {
        policyPremium,
        addonPremium,
        totalPremium: policyPremium + addonPremium
    };
};

// FIX: Changed parameter type to match calculatePremiumComponents.
export const calculatePremium = (customer: PremiumCalculationInput): number => {
    return calculatePremiumComponents(customer).totalPremium;
};


// Calculates the number of months between two dates
const monthDiff = (d1: Date, d2: Date): number => {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
};

// Calculates outstanding balance and months due
export const calculateOutstandingBalance = (customer: Customer, requests: AppRequest[]) => {
    const approvedPayments = requests
        .filter(r => r.requestType === RequestType.MAKE_PAYMENT && r.customerId === customer.id && r.status === RequestStatus.APPROVED);
    
    const policyStartDate = new Date(customer.inceptionDate);
    const today = new Date();
    
    // Total months the policy should have been active (including the current month)
    const totalMonthsSinceStart = monthDiff(policyStartDate, today) + 1;
    
    // Number of payments successfully made
    const paymentsMadeCount = approvedPayments.length;
    
    const premium = calculatePremium(customer);
    const monthsDue = totalMonthsSinceStart - paymentsMadeCount;
    const balance = monthsDue * premium;

    return {
        balance: balance > 0 ? balance : 0,
        monthsDue: monthsDue > 0 ? monthsDue : 0,
        cappedMonths: monthsDue > 0 ? monthsDue : 0, // In this version, capped is same as actual
    };
};

// Determines the next payment period (e.g., "July 2024")
export const getNextPaymentPeriod = (customer: Customer, requests: AppRequest[]): string => {
    const approvedPayments = requests
        .filter(r => r.requestType === RequestType.MAKE_PAYMENT && r.customerId === customer.id && r.status === RequestStatus.APPROVED);
    
    const policyStartDate = new Date(customer.inceptionDate);
    const nextPaymentDate = new Date(policyStartDate);
    
    // Move date forward by the number of payments made
    nextPaymentDate.setMonth(policyStartDate.getMonth() + approvedPayments.length);
    
    return nextPaymentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export const getParticipantSuffix = (participant: Participant, allParticipants: Participant[]): string => {
  if (participant.relationship === 'Self') {
    return '000';
  }

  const ofSameType = allParticipants
    .filter(p => p.relationship === participant.relationship)
    .sort((a, b) => a.id - b.id);

  const index = ofSameType.findIndex((p) => p.id === participant.id);

  if (index === -1) return 'N/A';

  switch (participant.relationship) {
    case 'Spouse':
      return (101 + index).toString();
    case 'Child':
    case 'Stepchild':
    case 'Grandchild':
    case 'Sibling':
      return (201 + index).toString();
    case 'Grandparent':
      return (401 + index).toString();
    case 'Other Dependent':
      return (301 + index).toString();
    default:
      return 'N/A';
  }
};