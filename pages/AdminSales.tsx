import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import TimePeriodSelector from '../components/analytics/TimePeriodSelector';
import { PolicyStatus } from '../types';
import { calculateStatusFromData } from '../utils/statusHelpers';

const AdminSales: React.FC = () => {
  const { state } = useData();
  const [timePeriod, setTimePeriod] = useState('all');

  const stats = useMemo(() => {
    const totalRevenue = state.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPolicies = state.customers.length;

    const activeCustomers = state.customers.filter(c => {
      const actualStatus = calculateStatusFromData(c, state.payments);
      return actualStatus === PolicyStatus.ACTIVE;
    });

    const monthlyRevenue = activeCustomers.reduce((sum, c) => sum + (c.totalPremium || 0), 0);

    const agentPerformance = state.agents.map(agent => {
      const agentCustomers = state.customers.filter(c => c.assignedAgentId === agent.id);
      const agentActive = agentCustomers.filter(c => {
        const actualStatus = calculateStatusFromData(c, state.payments);
        return actualStatus === PolicyStatus.ACTIVE;
      });
      const agentRevenue = agentActive.reduce((sum, c) => sum + (c.totalPremium || 0), 0);

      return {
        agent,
        totalCustomers: agentCustomers.length,
        activeCustomers: agentActive.length,
        revenue: agentRevenue,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalPolicies,
      activeCustomers: activeCustomers.length,
      monthlyRevenue,
      agentPerformance,
    };
  }, [state.customers, state.agents, state.payments]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">Sales Analytics</h1>
        <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-green-700">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Policies</p>
            <p className="text-3xl font-bold text-blue-700">{stats.totalPolicies}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Active Customers</p>
            <p className="text-3xl font-bold text-purple-700">{stats.activeCustomers}</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Monthly Revenue</p>
            <p className="text-3xl font-bold text-teal-700">${stats.monthlyRevenue.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-brand-text-primary mb-4">Agent Performance</h2>
        {stats.agentPerformance.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No agents yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Customers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Customers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.agentPerformance.map((perf, index) => (
                  <tr key={perf.agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">#{index + 1}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-semibold text-sm">
                          {perf.agent.firstName[0]}{perf.agent.surname[0]}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {perf.agent.firstName} {perf.agent.surname}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.totalCustomers}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.activeCustomers}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${perf.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminSales;
