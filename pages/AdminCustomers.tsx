import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import PolicyStatusBadge from '../components/ui/PolicyStatusBadge';
import { PolicyStatus } from '../types';
import UploadCustomersModal from '../components/modals/UploadCustomersModal';

const AdminCustomers: React.FC = () => {
  const navigate = useNavigate();
  const { customers, agents } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = searchTerm === '' ||
        customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: customers.length,
      [PolicyStatus.ACTIVE]: customers.filter(c => c.status === PolicyStatus.ACTIVE).length,
      [PolicyStatus.SUSPENDED]: customers.filter(c => c.status === PolicyStatus.SUSPENDED).length,
      [PolicyStatus.OVERDUE]: customers.filter(c => c.status === PolicyStatus.OVERDUE).length,
      [PolicyStatus.CANCELLED]: customers.filter(c => c.status === PolicyStatus.CANCELLED).length,
    };
  }, [customers]);

  const getAgentName = (agentId: number) => {
    const agent = agents?.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.surname}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Customers</h1>
          <p className="text-gray-600 mt-1">{customers.length} total customers</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload Customers
        </button>
      </div>

      <Card>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by name, policy number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter(PolicyStatus.ACTIVE)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === PolicyStatus.ACTIVE
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({statusCounts[PolicyStatus.ACTIVE]})
            </button>
            <button
              onClick={() => setStatusFilter(PolicyStatus.SUSPENDED)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === PolicyStatus.SUSPENDED
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Suspended ({statusCounts[PolicyStatus.SUSPENDED]})
            </button>
            <button
              onClick={() => setStatusFilter(PolicyStatus.OVERDUE)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === PolicyStatus.OVERDUE
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overdue ({statusCounts[PolicyStatus.OVERDUE]})
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredCustomers.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No customers found</p>
            </div>
          </Card>
        ) : (
          filteredCustomers.map(customer => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {customer.firstName} {customer.surname}
                    </h3>
                    <PolicyStatusBadge status={customer.status} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Policy:</span> {customer.policyNumber}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {customer.phone}
                    </div>
                    <div>
                      <span className="font-medium">Agent:</span> {getAgentName(customer.assignedAgentId)}
                    </div>
                    <div>
                      <span className="font-medium">Package:</span> {customer.funeralPackage}
                    </div>
                    <div>
                      <span className="font-medium">Premium:</span> ${customer.totalPremium.toFixed(2)}/{customer.premiumPeriod}
                    </div>
                    <div>
                      <span className="font-medium">Participants:</span> {customer.participants.length}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {showUploadModal && (
        <UploadCustomersModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
};

export default AdminCustomers;
