import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';

const AgentClaims: React.FC = () => {
  const { user } = useAuth();
  const { state } = useData();

  const myClaims = useMemo(() => {
    const myCustomerIds = state.customers
      .filter(c => c.assignedAgentId === user?.id)
      .map(c => c.id);

    return state.requests
      .filter(r => r.requestType === 'Claim' && myCustomerIds.includes(r.customerId || 0))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.requests, state.customers, user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text-primary">My Claims</h1>

      <Card>
        {myClaims.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No claims yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claim ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Filed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myClaims.map(claim => {
                  const customer = state.customers.find(c => c.id === claim.customerId);
                  return (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">CLM-{claim.id}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {customer ? (
                          <div className="text-sm text-gray-900">
                            {customer.firstName} {customer.surname}
                            <div className="text-xs text-gray-500">{customer.policyNumber}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">N/A</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${claim.claimAmount?.toFixed(2) || '0.00'}
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
        Showing {myClaims.length} claim{myClaims.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default AgentClaims;
