import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { RequestStatus } from '../types';
import { formatDate } from '../utils/dateHelpers';

const AgentRequests: React.FC = () => {
  const { user } = useAuth();
  const { state } = useData();

  const myRequests = useMemo(() => {
    return state.requests
      .filter(r => r.agentId === user?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.requests, user?.id]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text-primary">My Requests</h1>

      <Card>
        {myRequests.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Type
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
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myRequests.map(request => {
                  const customer = state.customers.find(c => c.id === request.customerId);
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.requestType}</div>
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
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {request.adminNotes || '-'}
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
        Showing {myRequests.length} request{myRequests.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default AgentRequests;
