import React, { useState } from 'react';
import { Customer, Participant, MedicalPackage, CashBackAddon } from '../../types';
import Button from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { validateDependent } from '../../utils/validationHelpers';
import { supabaseService } from '../../services/supabaseService';
import { calculatePremiumComponents } from '../../utils/policyHelpers';
import { assignSuffixCodes } from '../../utils/participantHelpers';

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`}>
        {props.children}
    </select>
);

interface AddDependentModalProps {
    customer: Customer;
    onClose: () => void;
}

const AddDependentModal: React.FC<AddDependentModalProps> = ({ customer, onClose }) => {
    const { dispatch } = useData();
    const [participant, setParticipant] = useState<Omit<Participant, 'id' | 'uuid'>>({
        firstName: '',
        surname: '',
        relationship: 'Child',
        dateOfBirth: '',
        idNumber: '',
        gender: 'Male',
        phone: '',
        email: '',
        streetAddress: customer.streetAddress, // Pre-fill from policyholder
        town: customer.town,
        postalAddress: customer.postalAddress,
        medicalPackage: MedicalPackage.NONE,
        cashBackAddon: CashBackAddon.NONE,
    });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setParticipant({ ...participant, [e.target.name]: e.target.value });
        setValidationErrors([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validation = validateDependent(participant, customer);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            return;
        }

        try {
            const newParticipant: Participant = {
                ...participant,
                id: Date.now(),
                uuid: crypto.randomUUID(),
                suffix: '000', // Temporary, will be reassigned
            };

            const tempParticipants = [...customer.participants, newParticipant];
            const updatedParticipants = assignSuffixCodes(tempParticipants);

            const premiumComponents = calculatePremiumComponents({
                ...customer,
                participants: updatedParticipants,
            });

            const updatedCustomer: Customer = {
                ...customer,
                participants: updatedParticipants,
                ...premiumComponents,
                lastUpdated: new Date().toISOString(),
            };

            await supabaseService.saveCustomer(updatedCustomer);
            dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });

            alert('Dependent added successfully!');
            onClose();
        } catch (error) {
            console.error('Error adding dependent:', error);
            alert('Error adding dependent. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-6">Add Participant to {`${customer.firstName} ${customer.surname}`}'s Policy</h3>

                {validationErrors.length > 0 && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-800 mb-2">Validation Errors:</p>
                        <ul className="list-disc list-inside space-y-1">
                            {validationErrors.map((error, index) => (
                                <li key={index} className="text-sm text-red-700">{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">First Name(s)</label>
                            <FormInput name="firstName" value={participant.firstName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Surname</label>
                            <FormInput name="surname" value={participant.surname} onChange={handleChange} required />
                        </div>
                    </div>
                     <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Relationship</label>
                        <FormSelect name="relationship" value={participant.relationship} onChange={handleChange} required>
                            <option>Spouse</option>
                            <option>Child</option>
                            <option>Stepchild</option>
                            <option>Grandchild</option>
                            <option>Sibling</option>
                            <option>Parent</option>
                            <option>Grandparent</option>
                            <option>Other Dependent</option>
                        </FormSelect>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">ID Number</label>
                            <FormInput name="idNumber" value={participant.idNumber || ''} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Date of Birth</label>
                            <FormInput name="dateOfBirth" type="date" value={participant.dateOfBirth} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Gender</label>
                        <FormSelect name="gender" value={participant.gender} onChange={handleChange} required>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </FormSelect>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Phone Number</label>
                        <FormInput name="phone" type="tel" value={participant.phone || ''} onChange={handleChange} required />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Email Address</label>
                        <FormInput name="email" type="email" value={participant.email || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Street Address</label>
                        <FormInput name="streetAddress" value={participant.streetAddress} onChange={handleChange} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Town</label>
                            <FormInput name="town" value={participant.town} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Postal Address</label>
                            <FormInput name="postalAddress" value={participant.postalAddress} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Medical Aid Package</label>
                        <FormSelect name="medicalPackage" value={participant.medicalPackage} onChange={handleChange}>
                            <option value="None">None</option>
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="Platinum">Platinum</option>
                        </FormSelect>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">CashBack Add-on</label>
                        <FormSelect name="cashBackAddon" value={participant.cashBackAddon} onChange={handleChange}>
                            <option value="None">None</option>
                            <option value="Level 1">Level 1</option>
                            <option value="Level 2">Level 2</option>
                            <option value="Level 3">Level 3</option>
                            <option value="Level 4">Level 4</option>
                        </FormSelect>
                    </div>
                    {['Child', 'Stepchild', 'Grandchild'].includes(participant.relationship) && (
                        <div>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="isStudent"
                                    checked={participant.isStudent || false}
                                    onChange={e => handleChange({ target: { name: 'isStudent', value: e.target.checked } } as any)}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-brand-text-secondary">Is currently a student (ages 19-23 require school ID)</span>
                            </label>
                        </div>
                    )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end pt-4 mt-6 space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
                    <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
                    <Button type="submit" className="w-full sm:w-auto">Add Dependent</Button>
                </div>
            </form>
        </div>
    );
};

export default AddDependentModal;