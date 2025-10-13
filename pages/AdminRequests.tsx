import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { RequestStatus } from '../types';
import ViewRequestModal from '../components/modals/ViewRequestModal';

const AdminRequests: React.FC = () => {
  const { state } = useData();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const filteredRequests = useMemo(() => {
    return state.requests
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.requests, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case RequestStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text-primary">All Requests</h1>

      <Card>
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Statuses</option>
            <option value={RequestStatus.PENDING}>Pending</option>
            <option value={RequestStatus.APPROVED}>Approved</option>
            <option value={RequestStatus.REJECTED}>Rejected</option>
          </select>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            {statusFilter !== 'all' ? 'No requests found' : 'No requests yet'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map(request => {
                  const agent = state.agents.find(a => a.id === request.agentId);
                  const customer = state.customers.find(c => c.id === request.customerId);
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.requestType}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agent ? `${agent.firstName} ${agent.surname}` : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {customer ? (
                          <div className="text-sm text-gray-900">
                            {customer.firstName} {customer.surname}
                            <div className="text-xs text-gray-500">{customer.policyNumber}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {request.customerData ?
                              `${request.customerData.firstName} ${request.customerData.surname}` :
                              'N/A'
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="text-brand-primary hover:text-brand-primary-dark"
                        >
                          View
                        </button>
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
        Showing {filteredRequests.length} of {state.requests.length} requests
      </div>

      {showRequestModal && selectedRequest && (
        <ViewRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminRequests;
