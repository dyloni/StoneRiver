import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { PolicyStatus } from '../types';
import { calculateStatusFromData } from '../utils/statusHelpers';

const AgentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useData();

  const agent = useMemo(() => {
    return state.agents.find(a => a.id === parseInt(id || '0'));
  }, [state.agents, id]);

  const agentCustomers = useMemo(() => {
    return state.customers.filter(c => c.assignedAgentId === agent?.id);
  }, [state.customers, agent]);

  const stats = useMemo(() => {
    const active = agentCustomers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.ACTIVE;
    }).length;

    const revenue = agentCustomers
      .filter(c => {
        const actualStatus = calculateStatusFromData(c, state.payments);
        return actualStatus === PolicyStatus.ACTIVE;
      })
      .reduce((sum, c) => sum + (c.totalPremium || 0), 0);

    return { total: agentCustomers.length, active, revenue };
  }, [agentCustomers, state.payments]);

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Agent not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-brand-primary text-white flex items-center justify-center text-2xl font-semibold">
            {agent.firstName[0]}{agent.surname[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-text-primary">
              {agent.firstName} {agent.surname}
            </h1>
            <p className="text-gray-600">{agent.email || 'No email'}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
              agent.status === 'active' ? 'bg-green-100 text-green-800' :
              agent.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {agent.status || 'active'}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Customers</p>
            <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Active Customers</p>
            <p className="text-3xl font-bold text-green-700">{stats.active}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Monthly Revenue</p>
            <p className="text-3xl font-bold text-teal-700">${stats.revenue.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-brand-text-primary mb-4">Customers</h2>
        {agentCustomers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No customers assigned</p>
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
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agentCustomers.map(customer => {
                  const actualStatus = calculateStatusFromData(customer, state.payments);
                  return (
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          actualStatus === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                          actualStatus === PolicyStatus.SUSPENDED ? 'bg-yellow-100 text-yellow-800' :
                          actualStatus === PolicyStatus.OVERDUE ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
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
    </div>
  );
};

export default AgentProfilePage;
