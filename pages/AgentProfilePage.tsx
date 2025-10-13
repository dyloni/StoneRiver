import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import AssignAgentModal from '../components/modals/AssignAgentModal';

const AgentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agents, customers, payments } = useData();
  const [showAssignModal, setShowAssignModal] = React.useState(false);

  const agent = useMemo(() => {
    return agents?.find(a => a.id === parseInt(id || '0'));
  }, [agents, id]);

  const agentCustomers = useMemo(() => {
    return customers.filter(c => c.assignedAgentId === parseInt(id || '0'));
  }, [customers, id]);

  const agentStats = useMemo(() => {
    const agentPayments = payments.filter(p =>
      p.recorded_by_agent_id === parseInt(id || '0')
    );

    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthPayments = agentPayments.filter(p =>
      p.payment_date.startsWith(thisMonth)
    );
    const revenue = thisMonthPayments.reduce((sum, p) =>
      sum + parseFloat(p.payment_amount), 0
    );

    return {
      totalCustomers: agentCustomers.length,
      activeCustomers: agentCustomers.filter(c => c.status === 'Active').length,
      paymentsThisMonth: thisMonthPayments.length,
      revenueThisMonth: revenue,
    };
  }, [agentCustomers, payments, id]);

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Agent Not Found</h2>
        <button
          onClick={() => navigate('/agents')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Agents
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/agents')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {agent.firstName} {agent.surname}
        </h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          agent.status === 'active'
            ? 'bg-green-100 text-green-800'
            : agent.status === 'suspended'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {agent.status || 'active'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Total Customers</div>
          <div className="text-3xl font-bold text-blue-600">{agentStats.totalCustomers}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Active Policies</div>
          <div className="text-3xl font-bold text-green-600">{agentStats.activeCustomers}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Payments This Month</div>
          <div className="text-3xl font-bold text-purple-600">{agentStats.paymentsThisMonth}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Revenue This Month</div>
          <div className="text-3xl font-bold text-green-600">${agentStats.revenueThisMonth.toFixed(2)}</div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Agent Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Agent ID:</span>
            <div className="text-lg">{agent.id}</div>
          </div>
          {agent.email && (
            <div>
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <div className="text-lg">{agent.email}</div>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <div className="text-lg capitalize">{agent.status || 'active'}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Assigned Customers ({agentCustomers.length})
          </h2>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Assign Customer
          </button>
        </div>
        <div className="space-y-3">
          {agentCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No customers assigned to this agent
            </div>
          ) : (
            agentCustomers.slice(0, 10).map(customer => (
              <div
                key={customer.id}
                className="flex justify-between items-center py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div>
                  <div className="font-medium">
                    {customer.firstName} {customer.surname}
                  </div>
                  <div className="text-sm text-gray-600">
                    {customer.policyNumber} • {customer.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${customer.totalPremium.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">{customer.premiumPeriod}</div>
                </div>
              </div>
            ))
          )}
          {agentCustomers.length > 10 && (
            <div className="text-center pt-4">
              <button className="text-blue-600 hover:text-blue-700">
                View all {agentCustomers.length} customers
              </button>
            </div>
          )}
        </div>
      </Card>

      {showAssignModal && (
        <AssignAgentModal
          agentId={agent.id}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};

export default AgentProfilePage;
