import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useData } from '../../contexts/DataContext';
import { Customer, PaymentMethod, PolicyStatus } from '../../types';
import { calculatePremium } from '../../utils/policyHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`}>
        {props.children}
    </select>
);


const PaymentPage: React.FC = () => {
    const { user } = useAuth();
    const { state } = useData();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [receiptFilename, setReceiptFilename] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [balance, setBalance] = useState<{ balance: number; monthsDue: number } | null>(null);
    const [nextPeriod, setNextPeriod] = useState<string>('');
    const [isLegacyReceipt, setIsLegacyReceipt] = useState(false);
    const [legacyReceiptNotes, setLegacyReceiptNotes] = useState('');

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        return state.customers.filter(c =>
            `${c.firstName} ${c.surname}`.toLowerCase().includes(lowercasedTerm) ||
            c.policyNumber.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, state.customers]);

    const handleSelectCustomer = async (customer: Customer) => {
        setSelectedCustomer(customer);
        const premium = calculatePremium(customer);
        setPaymentAmount(premium.toFixed(2));
        setSearchTerm('');

        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('customer_id', customer.id);

        const paymentCount = payments?.length || 0;
        const policyStartDate = new Date(customer.inceptionDate);
        const today = new Date();
        const monthsSinceStart = ((today.getFullYear() - policyStartDate.getFullYear()) * 12) + (today.getMonth() - policyStartDate.getMonth()) + 1;
        const monthsDue = monthsSinceStart - paymentCount;
        const outstandingBalance = monthsDue > 0 ? monthsDue * premium : 0;

        setBalance({
            balance: outstandingBalance,
            monthsDue: monthsDue > 0 ? monthsDue : 0,
        });

        const nextPaymentDate = new Date(policyStartDate);
        nextPaymentDate.setMonth(policyStartDate.getMonth() + paymentCount);
        setNextPeriod(nextPaymentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReceiptFile(file);
            setReceiptFilename(file.name);
        }
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !user) return;

        setIsUploading(true);

        try {
            const { data: allPayments } = await supabase
                .from('payments')
                .select('*')
                .eq('customer_id', selectedCustomer.id);

            const paymentCount = allPayments?.length || 0;
            const policyStartDate = new Date(selectedCustomer.inceptionDate);
            const nextPaymentDate = new Date(policyStartDate);
            nextPaymentDate.setMonth(policyStartDate.getMonth() + paymentCount);
            const paymentPeriod = nextPaymentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            let uploadedReceiptUrl: string | null = null;

            if (receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${selectedCustomer.policyNumber}_${Date.now()}.${fileExt}`;
                const filePath = `receipts/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('payment-receipts')
                    .upload(filePath, receiptFile);

                if (uploadError) {
                    console.error('Error uploading receipt:', uploadError);
                } else {
                    const { data: urlData } = supabase.storage
                        .from('payment-receipts')
                        .getPublicUrl(filePath);
                    uploadedReceiptUrl = urlData.publicUrl;
                }
            }

            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    customer_id: selectedCustomer.id,
                    policy_number: selectedCustomer.policyNumber,
                    payment_amount: parseFloat(paymentAmount),
                    payment_method: paymentMethod,
                    payment_period: paymentPeriod,
                    receipt_filename: uploadedReceiptUrl || receiptFilename || null,
                    recorded_by_agent_id: user.id,
                    payment_date: new Date().toISOString(),
                    is_legacy_receipt: isLegacyReceipt,
                    legacy_receipt_notes: isLegacyReceipt ? legacyReceiptNotes : null,
                });

            if (paymentError) throw paymentError;

            const { error: updateError } = await supabase
                .from('customers')
                .update({
                    status: PolicyStatus.ACTIVE,
                    latest_receipt_date: new Date().toISOString(),
                    premium_period: paymentPeriod,
                    last_updated: new Date().toISOString(),
                })
                .eq('id', selectedCustomer.id);

            if (updateError) throw updateError;

            alert('Payment recorded successfully! Customer status updated to Active.');
            navigate(`/customers`);
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Error recording payment. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-brand-text-primary mb-6">Make a Payment</h2>
            <Card>
                {!selectedCustomer ? (
                    <div>
                        <h3 className="text-2xl font-bold text-brand-text-primary">Search for Customer</h3>
                        <p className="text-brand-text-secondary mb-4">Find a customer to record a new payment.</p>
                        <FormInput
                            type="text"
                            placeholder="Search by name or policy ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {filteredCustomers.length > 0 && (
                            <ul className="mt-2 border border-brand-border rounded-lg max-h-60 overflow-y-auto">
                                {filteredCustomers.map(c => (
                                    <li key={c.id} onClick={() => handleSelectCustomer(c)} className="p-4 hover:bg-brand-pink/10 cursor-pointer border-b border-brand-border last:border-b-0">
                                        {`${c.firstName} ${c.surname}`} (Policy: {c.policyNumber})
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div>
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                            <h3 className="text-2xl font-bold text-brand-text-primary">Payment for: {`${selectedCustomer.firstName} ${selectedCustomer.surname}`}</h3>
                            <Button variant="secondary" onClick={() => setSelectedCustomer(null)} className="mt-2 sm:mt-0 w-full sm:w-auto">Change Customer</Button>
                         </div>
                         <div className="p-4 bg-gray-100 rounded-lg mb-6 space-y-2 text-center sm:text-left text-brand-text-secondary">
                            <p><strong>Policy Premium:</strong> ${calculatePremium(selectedCustomer).toFixed(2)} / month</p>
                            {balance && balance.monthsDue > 0 && <p><strong>Outstanding Balance:</strong> ${balance.balance.toFixed(2)} ({balance.monthsDue} months)</p>}
                            <p><strong>Next Payment Period:</strong> {nextPeriod}</p>
                         </div>
                         <form onSubmit={handleSubmitPayment} className="space-y-4">
                             <div>
                                <label className="block text-base font-semibold text-brand-text-secondary mb-2">Payment Amount</label>
                                <FormInput type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                             </div>
                             <div>
                                <label className="block text-base font-semibold text-brand-text-secondary mb-2">Payment Method</label>
                                <FormSelect value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                                </FormSelect>
                             </div>
                              <div>
                                <label className="block text-base font-semibold text-brand-text-secondary mb-2">Upload Receipt (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink"
                                />
                                {receiptFilename && (
                                    <p className="mt-2 text-sm text-brand-text-secondary">Selected: {receiptFilename}</p>
                                )}
                             </div>
                              <div>
                                <label className="block text-base font-semibold text-brand-text-secondary mb-2">Receipt Reference (Optional)</label>
                                <FormInput
                                    type="text"
                                    value={receiptFilename}
                                    onChange={(e) => setReceiptFilename(e.target.value)}
                                    placeholder="Or enter receipt reference number"
                                />
                             </div>
                             <div className="col-span-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <label className="flex items-center space-x-3 cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        checked={isLegacyReceipt}
                                        onChange={(e) => setIsLegacyReceipt(e.target.checked)}
                                        className="w-4 h-4 text-brand-pink rounded focus:ring-2 focus:ring-brand-pink"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">Legacy Receipt (Historical Payment)</span>
                                </label>
                                {isLegacyReceipt && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                                        <textarea
                                            value={legacyReceiptNotes}
                                            onChange={(e) => setLegacyReceiptNotes(e.target.value)}
                                            placeholder="Add notes about this legacy receipt (e.g., original payment date, source)"
                                            className="block w-full px-3 py-2 text-sm text-brand-text-primary bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink"
                                            rows={3}
                                        />
                                    </div>
                                )}
                             </div>
                             <Button type="submit" disabled={isUploading} className="w-full">
                                {isUploading ? 'Processing Payment...' : 'Record Payment'}
                             </Button>
                         </form>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PaymentPage;