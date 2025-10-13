import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import CreateAgentModal from '../components/modals/CreateAgentModal';
import ReassignCustomersModal from '../components/modals/ReassignCustomersModal';

const AdminAgents: React.FC = () => {
  const navigate = useNavigate();
  const { agents, customers } = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reassignAgentId, setReassignAgentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents?.filter(agent =>
    agent.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getAgentCustomerCount = (agentId: number) => {
    return customers.filter(c => c.assignedAgentId === agentId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Agents</h1>
          <p className="text-gray-600 mt-1">{agents?.length || 0} total agents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Agent
        </button>
      </div>

      <Card>
        <input
          type="text"
          placeholder="Search agents by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </Card>

      <div className="grid gap-4">
        {filteredAgents.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No agents found</p>
            </div>
          </Card>
        ) : (
          filteredAgents.map(agent => {
            const customerCount = getAgentCustomerCount(agent.id);
            return (
              <Card
                key={agent.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/agents/${agent.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {agent.firstName} {agent.surname}
                      </h3>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Agent ID:</span> {agent.id}
                      </div>
                      {agent.email && (
                        <div>
                          <span className="font-medium">Email:</span> {agent.email}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Customers:</span> {customerCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {customerCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignAgentId(agent.id);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Reassign Customers
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agents/${agent.id}`);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {showCreateModal && (
        <CreateAgentModal onClose={() => setShowCreateModal(false)} />
      )}

      {reassignAgentId && (
        <ReassignCustomersModal
          agentId={reassignAgentId}
          onClose={() => setReassignAgentId(null)}
        />
      )}
    </div>
  );
};

export default AdminAgents;
