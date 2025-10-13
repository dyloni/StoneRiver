import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import TimePeriodSelector from '../components/analytics/TimePeriodSelector';
import AnalyticsCard from '../components/analytics/AnalyticsCard';

const AdminSales: React.FC = () => {
  const { payments, customers, agents } = useData();
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    if (timePeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timePeriod === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const periodPayments = payments.filter(p =>
      new Date(p.payment_date) >= startDate
    );

    const totalRevenue = periodPayments.reduce((sum, p) =>
      sum + parseFloat(p.payment_amount), 0
    );

    const agentPerformance = agents?.map(agent => {
      const agentPayments = periodPayments.filter(p =>
        p.recorded_by_agent_id === agent.id
      );
      const revenue = agentPayments.reduce((sum, p) =>
        sum + parseFloat(p.payment_amount), 0
      );
      return {
        agent,
        revenue,
        paymentCount: agentPayments.length,
      };
    }).sort((a, b) => b.revenue - a.revenue) || [];

    const newPolicies = customers.filter(c =>
      new Date(c.inceptionDate) >= startDate
    ).length;

    return {
      totalRevenue,
      paymentCount: periodPayments.length,
      averagePayment: periodPayments.length > 0
        ? totalRevenue / periodPayments.length
        : 0,
      newPolicies,
      agentPerformance,
    };
  }, [payments, customers, agents, timePeriod]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="green"
        />
        <AnalyticsCard
          title="Payments Collected"
          value={stats.paymentCount.toString()}
          color="blue"
        />
        <AnalyticsCard
          title="Average Payment"
          value={`$${stats.averagePayment.toFixed(2)}`}
          color="purple"
        />
        <AnalyticsCard
          title="New Policies"
          value={stats.newPolicies.toString()}
          color="orange"
        />
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Agent Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Payments</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Payment</th>
              </tr>
            </thead>
            <tbody>
              {stats.agentPerformance.map((item, index) => (
                <tr key={item.agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {item.agent.firstName} {item.agent.surname}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    ${item.revenue.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">{item.paymentCount}</td>
                  <td className="py-3 px-4 text-right">
                    ${item.paymentCount > 0 ? (item.revenue / item.paymentCount).toFixed(2) : '0.00'}
                  </td>
                </tr>
              ))}
              {stats.agentPerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No data available for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Payments</h2>
        <div className="space-y-3">
          {payments
            .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
            .slice(0, 10)
            .map(payment => {
              const customer = customers.find(c => c.id === payment.customer_id);
              const agent = agents?.find(a => a.id === payment.recorded_by_agent_id);
              return (
                <div
                  key={payment.id}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <div>
                    <div className="font-medium">
                      {customer ? `${customer.firstName} ${customer.surname}` : payment.policy_number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {agent ? `${agent.firstName} ${agent.surname}` : 'Unknown Agent'} • {new Date(payment.payment_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      ${parseFloat(payment.payment_amount).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">{payment.payment_method}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
};

export default AdminSales;
