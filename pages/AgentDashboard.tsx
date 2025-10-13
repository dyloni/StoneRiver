import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { PolicyStatus } from '../types';
import { calculateStatusFromData } from '../utils/statusHelpers';

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { state } = useData();

  const myCustomers = useMemo(() => {
    return state.customers.filter(c => c.assignedAgentId === user?.id);
  }, [state.customers, user?.id]);

  const stats = useMemo(() => {
    const active = myCustomers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.ACTIVE;
    }).length;

    const suspended = myCustomers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.SUSPENDED;
    }).length;

    const overdue = myCustomers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.OVERDUE;
    }).length;

    const myRequests = state.requests.filter(r => r.agentId === user?.id);
    const pending = myRequests.filter(r => r.status === 'Pending').length;

    return { total: myCustomers.length, active, suspended, overdue, pending };
  }, [myCustomers, state.payments, state.requests, user?.id]);

  const recentCustomers = useMemo(() => {
    return [...myCustomers]
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      .slice(0, 5);
  }, [myCustomers]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">Dashboard</h1>
        <Link to="/new-policy">
          <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors">
            New Policy
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-gray-400">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Customers</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-yellow-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Suspended</p>
            <p className="text-3xl font-bold text-gray-900">{stats.suspended}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-red-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-3xl font-bold text-gray-900">{stats.overdue}</p>
          </div>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <div className="text-center">
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Recent Customers</h2>
          {recentCustomers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No customers yet</p>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map(customer => {
                const actualStatus = calculateStatusFromData(customer, state.payments);
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
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/new-policy"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-gray-400"
            >
              <h3 className="font-semibold text-gray-900">New Policy</h3>
              <p className="text-sm text-gray-600">Register a new customer</p>
            </Link>

            <Link
              to="/customers"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-gray-400"
            >
              <h3 className="font-semibold text-gray-900">My Customers</h3>
              <p className="text-sm text-gray-600">View and manage customers</p>
            </Link>

            <Link
              to="/requests"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-gray-400"
            >
              <h3 className="font-semibold text-gray-900">My Requests</h3>
              <p className="text-sm text-gray-600">Track request status</p>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
