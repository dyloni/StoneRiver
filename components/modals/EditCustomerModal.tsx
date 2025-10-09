import React, { useState } from 'react';
import { Customer } from '../../types';
import Button from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { supabaseService } from '../../services/supabaseService';

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
);

interface EditCustomerModalProps {
    customer: Customer;
    onClose: () => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ customer, onClose }) => {
    const { dispatch } = useData();
    const [newValues, setNewValues] = useState({
        firstName: customer.firstName,
        surname: customer.surname,
        email: customer.email,
        phone: customer.phone,
        streetAddress: customer.streetAddress,
        town: customer.town,
        postalAddress: customer.postalAddress,
    });
    
    const oldValues = {
        firstName: customer.firstName,
        surname: customer.surname,
        email: customer.email,
        phone: customer.phone,
        streetAddress: customer.streetAddress,
        town: customer.town,
        postalAddress: customer.postalAddress,
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewValues({ ...newValues, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const updatedCustomer: Customer = {
                ...customer,
                ...newValues,
                lastUpdated: new Date().toISOString(),
            };

            await supabaseService.saveCustomer(updatedCustomer);
            dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });

            alert('Customer details updated successfully!');
            onClose();
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Error updating customer. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-6">Edit Details for {`${customer.firstName} ${customer.surname}`}</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">First Name(s)</label>
                            <FormInput name="firstName" value={newValues.firstName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Surname</label>
                            <FormInput name="surname" value={newValues.surname} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Email Address</label>
                        <FormInput name="email" type="email" value={newValues.email} onChange={handleChange} required />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Phone Number</label>
                        <FormInput name="phone" value={newValues.phone} onChange={handleChange} required />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Street Address</label>
                        <FormInput name="streetAddress" value={newValues.streetAddress} onChange={handleChange} required />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Town</label>
                            <FormInput name="town" value={newValues.town} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="block text-base font-semibold text-brand-text-secondary mb-2">Postal Address</label>
                            <FormInput name="postalAddress" value={newValues.postalAddress} onChange={handleChange} required />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end pt-4 mt-6 space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
                    <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
                    <Button type="submit" className="w-full sm:w-auto">Save Changes</Button>
                </div>
            </form>
        </div>
    );
};

export default EditCustomerModal;