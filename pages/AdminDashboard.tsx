import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { PolicyStatus, RequestStatus } from '../types';
import { calculateStatusFromData } from '../utils/statusHelpers';
import TimePeriodSelector from '../components/analytics/TimePeriodSelector';

const AdminDashboard: React.FC = () => {
  const { state } = useData();
  const [timePeriod, setTimePeriod] = React.useState('all');

  const stats = useMemo(() => {
    const active = state.customers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.ACTIVE;
    }).length;

    const suspended = state.customers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.SUSPENDED;
    }).length;

    const overdue = state.customers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.OVERDUE;
    }).length;

    const pendingRequests = state.requests.filter(r => r.status === RequestStatus.PENDING).length;

    const totalRevenue = state.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalCustomers: state.customers.length,
      totalAgents: state.agents.length,
      active,
      suspended,
      overdue,
      pendingRequests,
      totalRevenue,
    };
  }, [state.customers, state.agents, state.requests, state.payments]);

  const recentCustomers = useMemo(() => {
    return [...state.customers]
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      .slice(0, 5);
  }, [state.customers]);

  const pendingRequests = useMemo(() => {
    return state.requests
      .filter(r => r.status === RequestStatus.PENDING)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [state.requests]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">Admin Dashboard</h1>
        <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Customers</p>
            <p className="text-3xl font-bold text-blue-700">{stats.totalCustomers}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Active Policies</p>
            <p className="text-3xl font-bold text-green-700">{stats.active}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Agents</p>
            <p className="text-3xl font-bold text-purple-700">{stats.totalAgents}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="text-3xl font-bold text-orange-700">{stats.pendingRequests}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Suspended</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.suspended}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-3xl font-bold text-red-700">{stats.overdue}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-teal-700">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-text-primary">Recent Customers</h2>
            <Link to="/customers" className="text-brand-primary hover:text-brand-primary-dark text-sm font-medium">
              View All
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No customers yet</p>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map(customer => {
                const actualStatus = calculateStatusFromData(customer, state.payments);
                const agent = state.agents.find(a => a.id === customer.assignedAgentId);
                return (
                  <Link
                    key={customer.id}
                    to={`/customers/${customer.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{customer.firstName} {customer.surname}</p>
                        <p className="text-sm text-gray-600">{customer.policyNumber}</p>
                        {agent && (
                          <p className="text-xs text-gray-500">Agent: {agent.firstName} {agent.surname}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        actualStatus === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                        actualStatus === PolicyStatus.SUSPENDED ? 'bg-yellow-100 text-yellow-800' :
                        actualStatus === PolicyStatus.OVERDUE ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {actualStatus}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-text-primary">Pending Requests</h2>
            <Link to="/requests" className="text-brand-primary hover:text-brand-primary-dark text-sm font-medium">
              View All
            </Link>
          </div>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map(request => {
                const agent = state.agents.find(a => a.id === request.agentId);
                return (
                  <div key={request.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{request.requestType}</p>
                        {agent && (
                          <p className="text-sm text-gray-600">By: {agent.firstName} {agent.surname}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        Pending
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
