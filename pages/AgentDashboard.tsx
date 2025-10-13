import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { PolicyStatus } from '../types';

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers, requests, payments } = useData();

  const stats = useMemo(() => {
    const myCustomers = customers.filter(c => c.assignedAgentId === user?.id);
    const myRequests = requests.filter(r => r.agentId === user?.id);
    const myPayments = payments.filter(p =>
      myCustomers.some(c => c.id === p.customer_id)
    );

    const activeCustomers = myCustomers.filter(c => c.status === PolicyStatus.ACTIVE).length;
    const suspendedCustomers = myCustomers.filter(c => c.status === PolicyStatus.SUSPENDED).length;
    const overdueCustomers = myCustomers.filter(c => c.status === PolicyStatus.OVERDUE).length;
    const pendingRequests = myRequests.filter(r => r.status === 'Pending').length;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const paymentsThisMonth = myPayments.filter(p =>
      p.payment_date.startsWith(thisMonth)
    );
    const revenueThisMonth = paymentsThisMonth.reduce((sum, p) =>
      sum + parseFloat(p.payment_amount), 0
    );

    return {
      totalCustomers: myCustomers.length,
      activeCustomers,
      suspendedCustomers,
      overdueCustomers,
      pendingRequests,
      paymentsThisMonth: paymentsThisMonth.length,
      revenueThisMonth,
    };
  }, [customers, requests, payments, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.firstName}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/customers')}
        >
          <div className="text-sm text-gray-600 mb-1">Total Customers</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalCustomers}</div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/customers')}
        >
          <div className="text-sm text-gray-600 mb-1">Active Policies</div>
          <div className="text-3xl font-bold text-green-600">{stats.activeCustomers}</div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/customers')}
        >
          <div className="text-sm text-gray-600 mb-1">Overdue</div>
          <div className="text-3xl font-bold text-red-600">{stats.overdueCustomers}</div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/requests')}
        >
          <div className="text-sm text-gray-600 mb-1">Pending Requests</div>
          <div className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">This Month</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payments Collected</span>
              <span className="text-lg font-semibold">{stats.paymentsThisMonth}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue</span>
              <span className="text-lg font-semibold text-green-600">
                ${stats.revenueThisMonth.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Suspended Policies</span>
              <span className="text-lg font-semibold text-orange-600">{stats.suspendedCustomers}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/new-policy')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
            >
              <div className="font-semibold">New Policy</div>
              <div className="text-sm opacity-90">Register a new customer</div>
            </button>
            <button
              onClick={() => navigate('/payment')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
            >
              <div className="font-semibold">Record Payment</div>
              <div className="text-sm opacity-90">Process customer payment</div>
            </button>
            <button
              onClick={() => navigate('/customers')}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <div className="font-semibold">View Customers</div>
              <div className="text-sm opacity-90">Manage your customer list</div>
            </button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {requests
            .filter(r => r.agentId === user?.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(request => (
              <div
                key={request.id}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <div>
                  <div className="font-medium">{request.requestType}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.status}
                </span>
              </div>
            ))}
          {requests.filter(r => r.agentId === user?.id).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AgentDashboard;
