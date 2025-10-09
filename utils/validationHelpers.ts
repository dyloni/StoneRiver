import { Customer, Participant, FuneralPackage, MedicalPackage, CashBackAddon } from '../types';
import { CASH_BACK_DETAILS, MEDICAL_PACKAGE_DETAILS } from '../constants';

export function validateDependentAge(
    dependent: Partial<Participant>,
    policyHolder: Customer
): { valid: boolean; error?: string } {
    if (!dependent.dateOfBirth) {
        return { valid: true };
    }

    const birthDate = new Date(dependent.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear() -
        (today.getMonth() < birthDate.getMonth() ||
         (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

    if (age > 65 && policyHolder.funeralPackage !== FuneralPackage.PREMIUM) {
        return {
            valid: false,
            error: 'Dependents over 65 years old are only allowed on Premium package policies.'
        };
    }

    return { valid: true };
}

export function validateDependentCashBack(
    dependentCashBack: CashBackAddon,
    policyHolderCashBack: CashBackAddon
): { valid: boolean; error?: string } {
    const dependentPayout = CASH_BACK_DETAILS[dependentCashBack].payout;
    const policyHolderPayout = CASH_BACK_DETAILS[policyHolderCashBack].payout;

    if (dependentPayout > policyHolderPayout) {
        return {
            valid: false,
            error: `Dependent's cash back (${dependentCashBack}) cannot exceed policy holder's cash back (${policyHolderCashBack}).`
        };
    }

    return { valid: true };
}

export function validateDependentMedicalAid(
    dependentMedical: MedicalPackage,
    policyHolderMedical: MedicalPackage
): { valid: boolean; error?: string } {
    if (dependentMedical === MedicalPackage.NONE || policyHolderMedical === MedicalPackage.NONE) {
        return { valid: true };
    }

    const dependentPrice = MEDICAL_PACKAGE_DETAILS[dependentMedical].price;
    const policyHolderPrice = MEDICAL_PACKAGE_DETAILS[policyHolderMedical].price;

    if (dependentPrice > policyHolderPrice) {
        return {
            valid: false,
            error: `Dependent's medical aid (${dependentMedical}) cannot exceed policy holder's medical aid (${policyHolderMedical}).`
        };
    }

    return { valid: true };
}

export function validateDependent(
    dependent: Partial<Participant>,
    policyHolder: Customer
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const ageValidation = validateDependentAge(dependent, policyHolder);
    if (!ageValidation.valid && ageValidation.error) {
        errors.push(ageValidation.error);
    }

    const policyHolderParticipant = policyHolder.participants.find(p => p.relationship === 'Self');
    if (policyHolderParticipant) {
        if (dependent.cashBackAddon) {
            const cashBackValidation = validateDependentCashBack(
                dependent.cashBackAddon,
                policyHolderParticipant.cashBackAddon || CashBackAddon.NONE
            );
            if (!cashBackValidation.valid && cashBackValidation.error) {
                errors.push(cashBackValidation.error);
            }
        }

        if (dependent.medicalPackage) {
            const medicalValidation = validateDependentMedicalAid(
                dependent.medicalPackage,
                policyHolderParticipant.medicalPackage || MedicalPackage.NONE
            );
            if (!medicalValidation.valid && medicalValidation.error) {
                errors.push(medicalValidation.error);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
