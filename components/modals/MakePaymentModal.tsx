import React, { useState } from 'react';
import { Customer, Payment, PaymentMethod, PolicyStatus } from '../../types';
import Button from '../ui/Button';
import { getNextPaymentPeriod, calculatePremium } from '../../utils/policyHelpers';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { updateCustomerStatusBasedOnPayments } from '../../utils/statusHelpers';

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`}>
        {props.children}
    </select>
);

interface MakePaymentModalProps {
    customer: Customer;
    onClose: () => void;
}

const MakePaymentModal: React.FC<MakePaymentModalProps> = ({ customer, onClose }) => {
    const { user } = useAuth();
    const { state, dispatch } = useData();
    const nextPaymentPeriod = getNextPaymentPeriod(customer, state.requests);

    const [paymentAmount, setPaymentAmount] = useState(calculatePremium(customer).toFixed(2));
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [receiptFilename, setReceiptFilename] = useState('');
    const [showActivationPrompt, setShowActivationPrompt] = useState(customer.status === PolicyStatus.SUSPENDED);
    const [activatePolicy, setActivatePolicy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const paymentId = state.payments.length > 0 ? Math.max(...state.payments.map(p => p.id)) + 1 : 1;

            const newPayment: Payment = {
                id: paymentId,
                customerId: customer.id,
                policyNumber: customer.policyNumber,
                agentId: user.id,
                amount: parseFloat(paymentAmount),
                paymentDate: new Date().toISOString(),
                paymentPeriod: nextPaymentPeriod,
                paymentMethod: paymentMethod,
                receiptUrl: receiptFilename,
                createdAt: new Date().toISOString(),
            };

            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    id: newPayment.id,
                    customer_id: newPayment.customerId,
                    policy_number: newPayment.policyNumber,
                    agent_id: newPayment.agentId,
                    amount: newPayment.amount,
                    payment_date: newPayment.paymentDate,
                    payment_period: newPayment.paymentPeriod,
                    payment_method: newPayment.paymentMethod,
                    receipt_url: newPayment.receiptUrl,
                    created_at: newPayment.createdAt,
                });

            if (paymentError) throw paymentError;

            dispatch({ type: 'ADD_PAYMENT', payload: newPayment });

            if (customer.status === PolicyStatus.SUSPENDED && activatePolicy) {
                const { error: customerError } = await supabase
                    .from('customers')
                    .update({
                        status: PolicyStatus.ACTIVE,
                        latest_receipt_date: new Date().toISOString(),
                        premium_period: nextPaymentPeriod,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', customer.id);

                if (customerError) throw customerError;

                const updatedCustomer = {
                    ...customer,
                    status: PolicyStatus.ACTIVE,
                    latestReceiptDate: new Date().toISOString(),
                    premiumPeriod: nextPaymentPeriod,
                    lastUpdated: new Date().toISOString()
                };
                dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
            } else {
                const { error: customerError } = await supabase
                    .from('customers')
                    .update({
                        latest_receipt_date: new Date().toISOString(),
                        premium_period: nextPaymentPeriod,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', customer.id);

                if (customerError) throw customerError;

                const updatedCustomer = {
                    ...customer,
                    latestReceiptDate: new Date().toISOString(),
                    premiumPeriod: nextPaymentPeriod,
                    lastUpdated: new Date().toISOString()
                };
                dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
            }

            await updateCustomerStatusBasedOnPayments(customer.id);

            alert(activatePolicy ? 'Payment recorded and policy activated!' : 'Payment recorded successfully!');
            onClose();
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Error recording payment. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-md">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Make Payment for {`${customer.firstName} ${customer.surname}`}</h3>
                <p className="text-base text-brand-text-secondary mb-6">Next payment is for period: <strong>{nextPaymentPeriod}</strong></p>

                {showActivationPrompt && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-800 mb-2">This policy is currently suspended</p>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={activatePolicy}
                                onChange={(e) => setActivatePolicy(e.target.checked)}
                                className="w-4 h-4 text-brand-pink rounded focus:ring-2 focus:ring-brand-pink"
                            />
                            <span className="text-sm text-yellow-700">Activate policy upon payment</span>
                        </label>
                    </div>
                )}

                <div className="space-y-4">
                     <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Payment Amount</label>
                        <FormInput type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
                     </div>
                      <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Payment Method</label>
                        <FormSelect value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                            {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                        </FormSelect>
                     </div>
                     <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">Receipt Reference/Filename</label>
                        <FormInput type="text" value={receiptFilename} onChange={e => setReceiptFilename(e.target.value)} required />
                     </div>
                </div>
                 <div className="flex flex-col-reverse sm:flex-row sm:justify-end pt-4 mt-6 space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
                    <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
                    <Button type="submit" className="w-full sm:w-auto">Submit Payment Request</Button>
                </div>
            </form>
        </div>
    );
};

export default MakePaymentModal;