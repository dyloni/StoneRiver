import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import MakePaymentModal from '../components/modals/MakePaymentModal';
import UploadPaymentModal from '../components/modals/UploadPaymentModal';

const PaymentPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useData();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showMakePayment, setShowMakePayment] = useState(false);
  const [showUploadPayment, setShowUploadPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const myCustomers = useMemo(() => {
    return state.customers
      .filter(c => c.assignedAgentId === user?.id)
      .filter(c =>
        c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.policyNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [state.customers, user?.id, searchTerm]);

  const handleMakePayment = (customer: any) => {
    setSelectedCustomer(customer);
    setShowMakePayment(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">Payments</h1>
        <Button onClick={() => setShowUploadPayment(true)}>
          Upload Bulk Payments
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or policy number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {myCustomers.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            {searchTerm ? 'No customers found' : 'No customers yet'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="text-brand-primary hover:text-brand-primary-dark font-medium"
                      >
                        {customer.policyNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {customer.firstName} {customer.surname}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.funeralPackage}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${customer.totalPremium?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Button
                        size="sm"
                        onClick={() => handleMakePayment(customer)}
                      >
                        Make Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showMakePayment && selectedCustomer && (
        <MakePaymentModal
          customer={selectedCustomer}
          onClose={() => {
            setShowMakePayment(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {showUploadPayment && (
        <UploadPaymentModal onClose={() => setShowUploadPayment(false)} />
      )}
    </div>
  );
};

export default PaymentPage;
