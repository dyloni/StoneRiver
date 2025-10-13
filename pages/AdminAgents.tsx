import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CreateAgentModal from '../components/modals/CreateAgentModal';
import ReassignCustomersModal from '../components/modals/ReassignCustomersModal';

const AdminAgents: React.FC = () => {
  const { state } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [showReassign, setShowReassign] = useState(false);

  const filteredAgents = useMemo(() => {
    return state.agents.filter(agent =>
      agent.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.agents, searchTerm]);

  const getAgentStats = (agentId: number) => {
    const customers = state.customers.filter(c => c.assignedAgentId === agentId);
    const activeCustomers = customers.filter(c => c.status === 'Active').length;
    return { total: customers.length, active: activeCustomers };
  };

  const handleReassign = (agent: any) => {
    setSelectedAgent(agent);
    setShowReassign(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">Manage Agents</h1>
        <Button onClick={() => setShowCreateAgent(true)}>
          Create Agent
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search agents by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {filteredAgents.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            {searchTerm ? 'No agents found' : 'No agents yet'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Customers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Customers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgents.map(agent => {
                  const stats = getAgentStats(agent.id);
                  return (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          to={`/agents/${agent.id}`}
                          className="flex items-center"
                        >
                          <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-semibold">
                            {agent.firstName[0]}{agent.surname[0]}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">
                              {agent.firstName} {agent.surname}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agent.email || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.status === 'active' ? 'bg-green-100 text-green-800' :
                          agent.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.total}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.active}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReassign(agent)}
                        >
                          Reassign
                        </Button>
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
        Showing {filteredAgents.length} of {state.agents.length} agents
      </div>

      {showCreateAgent && (
        <CreateAgentModal onClose={() => setShowCreateAgent(false)} />
      )}

      {showReassign && selectedAgent && (
        <ReassignCustomersModal
          fromAgent={selectedAgent}
          onClose={() => {
            setShowReassign(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminAgents;
