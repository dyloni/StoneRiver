import React, { useState, useEffect } from 'react';
import { Customer, Payment, PolicyStatus } from '../../types';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';
import { formatPolicyNumber } from '../../utils/policyHelpers';
import { useData } from '../../contexts/DataContext';
import { calculateStatusFromData } from '../../utils/statusHelpers';
import { formatDate } from '../../utils/dateHelpers';

interface CustomerDetailsModalProps {
    customer: Customer;
    onClose: () => void;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ customer, onClose }) => {
    const { refreshData, state } = useData();
    const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const actualStatus = calculateStatusFromData(customer, state.payments);

    useEffect(() => {
        const loadPayments = async () => {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('customer_id', customer.id)
                .order('payment_date', { ascending: false });

            if (!error && data) {
                setPaymentHistory(data);
                setLatestPayment(data[0] || null);
            }
            setLoading(false);
        };

        loadPayments();
    }, [customer.id]);

    const handleActivate = async () => {
        if (!confirm('Are you sure you want to activate this policy?')) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    status: PolicyStatus.ACTIVE,
                    last_updated: new Date().toISOString()
                })
                .eq('id', customer.id);

            if (error) throw error;

            await refreshData();
            alert('Policy activated successfully');
            onClose();
        } catch (error: any) {
            console.error('Error activating policy:', error);
            alert('Failed to activate policy: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!confirm('Are you sure you want to suspend this policy?')) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    status: PolicyStatus.SUSPENDED,
                    last_updated: new Date().toISOString()
                })
                .eq('id', customer.id);

            if (error) throw error;

            await refreshData();
            alert('Policy suspended successfully');
            onClose();
        } catch (error: any) {
            console.error('Error suspending policy:', error);
            alert('Failed to suspend policy: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to DELETE this policy permanently? This action cannot be undone.')) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', customer.id);

            if (error) throw error;

            await refreshData();
            alert('Policy deleted successfully');
            onClose();
        } catch (error: any) {
            console.error('Error deleting policy:', error);
            alert('Failed to delete policy: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{`${customer.firstName} ${customer.surname}`}</h3>

                <div className="space-y-4">
                    <div>
                        <h4 className="text-lg font-semibold mb-2">Policy Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-gray-600">Policy Number:</p>
                            <p className="font-medium">{formatPolicyNumber(customer.policyNumber)}</p>
                            <p className="text-gray-600">Status:</p>
                            <p className="font-medium">{actualStatus}</p>
                            <p className="text-gray-600">Premium:</p>
                            <p className="font-medium">${customer.totalPremium.toFixed(2)}/month</p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-gray-500">Loading payment information...</p>
                    ) : (
                        <>
                            {latestPayment && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="text-lg font-semibold mb-2 text-green-800">Latest Payment</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <p className="text-gray-600">Amount:</p>
                                        <p className="font-medium">${parseFloat(latestPayment.payment_amount).toFixed(2)}</p>
                                        <p className="text-gray-600">Date:</p>
                                        <p className="font-medium">{formatDate(latestPayment.payment_date)}</p>
                                        <p className="text-gray-600">Period:</p>
                                        <p className="font-medium">{latestPayment.payment_period}</p>
                                        <p className="text-gray-600">Method:</p>
                                        <p className="font-medium">{latestPayment.payment_method}</p>
                                    </div>
                                </div>
                            )}

                            {paymentHistory.length > 1 && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">Payment History</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {paymentHistory.slice(1, 6).map((payment) => (
                                            <div key={payment.id} className="border border-gray-200 rounded p-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="font-medium">${parseFloat(payment.payment_amount).toFixed(2)}</span>
                                                    <span className="text-gray-600">{formatDate(payment.payment_date)}</span>
                                                </div>
                                                <div className="text-gray-600">{payment.payment_period}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {paymentHistory.length > 6 && (
                                        <p className="text-sm text-gray-500 mt-2">+ {paymentHistory.length - 6} more payments</p>
                                    )}
                                </div>
                            )}

                            {paymentHistory.length === 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-yellow-800">No payment history available</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="border-t pt-4 mt-4">
                    <h4 className="text-lg font-semibold mb-3">Policy Actions</h4>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleActivate}
                            disabled={actionLoading || actualStatus === PolicyStatus.ACTIVE}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                        >
                            {actionLoading ? 'Processing...' : 'Activate'}
                        </Button>
                        <Button
                            onClick={handleSuspend}
                            disabled={actionLoading || actualStatus === PolicyStatus.SUSPENDED}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300"
                        >
                            {actionLoading ? 'Processing...' : 'Suspend'}
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
                        >
                            {actionLoading ? 'Processing...' : 'Delete'}
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailsModal;
