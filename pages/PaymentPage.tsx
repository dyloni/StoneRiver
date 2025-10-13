import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { PaymentMethod, RequestType, RequestStatus } from '../types';
import { supabase } from '../utils/supabase';
import CameraCapture from '../components/ui/CameraCapture';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { customers, dispatch } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const preselectedCustomerId = location.state?.customerId;

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(preselectedCustomerId || null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentPeriod, setPaymentPeriod] = useState('');
  const [paymentType, setPaymentType] = useState<'Initial' | 'Renewal'>('Renewal');
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const myCustomers = useMemo(() => {
    return customers.filter(c => c.assignedAgentId === user?.id);
  }, [customers, user?.id]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return myCustomers;
    return myCustomers.filter(c =>
      c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.policyNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myCustomers, searchTerm]);

  const selectedCustomer = useMemo(() => {
    return myCustomers.find(c => c.id === selectedCustomerId);
  }, [myCustomers, selectedCustomerId]);

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!selectedCustomerId) {
        throw new Error('Please select a customer');
      }
      if (!receiptPhoto) {
        throw new Error('Please capture payment receipt');
      }

      const receiptFilename = await uploadFile(receiptPhoto);

      const requestData = {
        request_type: RequestType.MAKE_PAYMENT,
        agent_id: user?.id,
        status: RequestStatus.PENDING,
        customer_id: selectedCustomerId,
        payment_amount: parseFloat(paymentAmount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        payment_period: paymentPeriod,
        receipt_filename: receiptFilename,
      };

      const { data, error: insertError } = await supabase
        .from('requests')
        .insert([requestData])
        .select()
        .single();

      if (insertError) throw insertError;

      dispatch({ type: 'ADD_REQUEST', payload: data });
      navigate('/requests');
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
        <p className="text-gray-600 mt-1">Submit a payment record for admin approval</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Customer</h2>
          {!selectedCustomerId ? (
            <>
              <input
                type="text"
                placeholder="Search by name or policy number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="font-medium">
                      {customer.firstName} {customer.surname}
                    </div>
                    <div className="text-sm text-gray-600">
                      Policy: {customer.policyNumber} | Premium: ${customer.totalPremium.toFixed(2)}/{customer.premiumPeriod}
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No customers found
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">
                    {selectedCustomer?.firstName} {selectedCustomer?.surname}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Policy: {selectedCustomer?.policyNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    Premium: ${selectedCustomer?.totalPremium.toFixed(2)}/{selectedCustomer?.premiumPeriod}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </Card>

        {selectedCustomerId && (
          <>
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                  <select
                    required
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as 'Initial' | 'Renewal')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Renewal">Renewal Payment</option>
                    <option value="Initial">Initial Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select
                    required
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={PaymentMethod.CASH}>Cash</option>
                    <option value={PaymentMethod.ECOCASH}>EcoCash</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                    <option value={PaymentMethod.STOP_ORDER}>Stop Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Period *</label>
                  <input
                    type="month"
                    required
                    value={paymentPeriod}
                    onChange={(e) => setPaymentPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Receipt</h2>
              <CameraCapture
                onCapture={(file) => setReceiptPhoto(file)}
                label={receiptPhoto ? 'Receipt Captured' : 'Capture Receipt'}
              />
            </Card>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default PaymentPage;
