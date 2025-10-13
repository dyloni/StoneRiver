import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { PolicyStatus } from '../types';
import { calculateStatusFromData } from '../utils/statusHelpers';
import { formatPolicyNumber } from '../utils/policyHelpers';

const AgentCustomers: React.FC = () => {
  const { user } = useAuth();
  const { state } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const myCustomers = useMemo(() => {
    return state.customers.filter(c => c.assignedAgentId === user?.id);
  }, [state.customers, user?.id]);

  const filteredCustomers = useMemo(() => {
    return myCustomers.filter(customer => {
      const matchesSearch =
        customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const actualStatus = calculateStatusFromData(customer, state.payments);
      const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [myCustomers, searchTerm, statusFilter, state.payments]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">My Customers</h1>
        <Link to="/new-policy">
          <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors">
            New Policy
          </button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by name, policy number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Statuses</option>
            <option value={PolicyStatus.ACTIVE}>Active</option>
            <option value={PolicyStatus.SUSPENDED}>Suspended</option>
            <option value={PolicyStatus.OVERDUE}>Overdue</option>
            <option value={PolicyStatus.INACTIVE}>Inactive</option>
            <option value={PolicyStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>

        {filteredCustomers.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            {searchTerm || statusFilter !== 'all' ? 'No customers found matching your criteria' : 'No customers yet'}
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
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map(customer => {
                  const actualStatus = calculateStatusFromData(customer, state.payments);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-brand-primary hover:text-brand-primary-dark font-medium"
                        >
                          {formatPolicyNumber(customer.policyNumber)}
                        </Link>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.firstName} {customer.surname}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.funeralPackage}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          actualStatus === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                          actualStatus === PolicyStatus.SUSPENDED ? 'bg-yellow-100 text-yellow-800' :
                          actualStatus === PolicyStatus.OVERDUE ? 'bg-red-100 text-red-800' :
                          actualStatus === PolicyStatus.CANCELLED ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {actualStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${customer.totalPremium?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-sm text-gray-500 text-center">
        Showing {filteredCustomers.length} of {myCustomers.length} customers
      </div>
    </div>
  );
};

export default AgentCustomers;
