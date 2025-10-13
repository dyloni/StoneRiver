import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { PolicyStatus, RequestStatus, ClaimStatus } from '../types';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { customers, agents, requests, payments, claims } = useData();

  const stats = useMemo(() => {
    const activeCustomers = customers.filter(c => c.status === PolicyStatus.ACTIVE).length;
    const suspendedCustomers = customers.filter(c => c.status === PolicyStatus.SUSPENDED).length;
    const overdueCustomers = customers.filter(c => c.status === PolicyStatus.OVERDUE).length;
    const activeAgents = agents?.filter(a => a.status === 'active').length || 0;
    const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING).length;
    const pendingClaims = claims.filter(c => c.status === ClaimStatus.PENDING).length;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const paymentsThisMonth = payments.filter(p => p.payment_date.startsWith(thisMonth));
    const revenueThisMonth = paymentsThisMonth.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    const paymentsLastMonth = payments.filter(p => p.payment_date.startsWith(lastMonthStr));
    const revenueLastMonth = paymentsLastMonth.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);

    return {
      totalCustomers: customers.length,
      activeCustomers,
      suspendedCustomers,
      overdueCustomers,
      totalAgents: agents?.length || 0,
      activeAgents,
      pendingRequests,
      pendingClaims,
      paymentsThisMonth: paymentsThisMonth.length,
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowth: revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
        : '0',
    };
  }, [customers, agents, requests, payments, claims]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">System overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/customers')}
        >
          <div className="text-sm text-gray-600 mb-1">Total Customers</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalCustomers}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.activeCustomers} active, {stats.overdueCustomers} overdue
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/agents')}
        >
          <div className="text-sm text-gray-600 mb-1">Active Agents</div>
          <div className="text-3xl font-bold text-green-600">{stats.activeAgents}</div>
          <div className="text-xs text-gray-500 mt-1">of {stats.totalAgents} total agents</div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/requests')}
        >
          <div className="text-sm text-gray-600 mb-1">Pending Requests</div>
          <div className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</div>
          <div className="text-xs text-gray-500 mt-1">Requires action</div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/claims')}
        >
          <div className="text-sm text-gray-600 mb-1">Pending Claims</div>
          <div className="text-3xl font-bold text-red-600">{stats.pendingClaims}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">This Month</div>
              <div className="text-3xl font-bold text-green-600">
                ${stats.revenueThisMonth.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {stats.paymentsThisMonth} payments collected
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Last Month</div>
              <div className="text-xl font-semibold text-gray-700">
                ${stats.revenueLastMonth.toFixed(2)}
              </div>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              parseFloat(stats.revenueGrowth) >= 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {parseFloat(stats.revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(stats.revenueGrowth))}% vs last month
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Policy Status Breakdown</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Policies</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(stats.activeCustomers / stats.totalCustomers) * 100}%` }}
                  />
                </div>
                <span className="text-lg font-semibold w-12 text-right">{stats.activeCustomers}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Suspended</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${(stats.suspendedCustomers / stats.totalCustomers) * 100}%` }}
                  />
                </div>
                <span className="text-lg font-semibold w-12 text-right">{stats.suspendedCustomers}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Overdue</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${(stats.overdueCustomers / stats.totalCustomers) * 100}%` }}
                  />
                </div>
                <span className="text-lg font-semibold w-12 text-right">{stats.overdueCustomers}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Requests</h2>
        <div className="space-y-3">
          {requests
            .filter(r => r.status === RequestStatus.PENDING)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(request => (
              <div
                key={request.id}
                className="flex justify-between items-center py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                onClick={() => navigate('/requests')}
              >
                <div>
                  <div className="font-medium">{request.requestType}</div>
                  <div className="text-sm text-gray-600">
                    Agent ID: {request.agentId} • {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
            ))}
          {requests.filter(r => r.status === RequestStatus.PENDING).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No pending requests
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/agents')}>
          <div className="text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-bold text-lg">Manage Agents</h3>
            <p className="text-sm text-gray-600 mt-1">Add, edit, or deactivate agents</p>
          </div>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/customers')}>
          <div className="text-center">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="font-bold text-lg">View All Customers</h3>
            <p className="text-sm text-gray-600 mt-1">Browse and manage customer policies</p>
          </div>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/sales')}>
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-bold text-lg">Sales Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">View detailed sales reports</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
