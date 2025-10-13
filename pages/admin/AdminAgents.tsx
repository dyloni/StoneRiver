import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import CreateAgentModal from '../../components/modals/CreateAgentModal';
import { supabase } from '../../utils/supabase';

const AdminAgents: React.FC = () => {
    const { state, refreshData } = useData();
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null);

    const handleDeleteAgent = async (agentId: number, agentName: string) => {
        const customerCount = state.customers.filter(c => c.assignedAgentId === agentId).length;

        if (customerCount > 0) {
            alert(`Cannot delete agent ${agentName}. They have ${customerCount} customer(s) assigned to them. Please reassign these customers first.`);
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to delete agent ${agentName}? This action cannot be undone.`);

        if (!confirmed) return;

        try {
            setDeletingAgentId(agentId);

            const { error } = await supabase
                .from('agents')
                .delete()
                .eq('id', agentId);

            if (error) throw error;

            await refreshData();
        } catch (error: any) {
            console.error('Error deleting agent:', error);
            alert('Failed to delete agent: ' + (error.message || 'Unknown error'));
        } finally {
            setDeletingAgentId(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-extrabold text-brand-text-primary">All Agents</h2>
                <Button onClick={() => setShowCreateModal(true)}>
                    Create New Agent
                </Button>
            </div>
            <Card className="p-0">
              <>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Agent ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Customers</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-brand-surface divide-y divide-brand-border">
                            {state.agents.map((agent) => {
                                const customerCount = state.customers.filter(c => c.assignedAgentId === agent.id).length;
                                const agentName = `${agent.firstName} ${agent.surname}`;
                                return (
                                    <tr key={agent.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-text-primary">{agentName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{agent.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{customerCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                            <button
                                                onClick={() => navigate(`/agents/${agent.id}`)}
                                                className="text-brand-pink hover:text-brand-light-pink"
                                            >
                                                View Profile
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAgent(agent.id, agentName)}
                                                disabled={deletingAgentId === agent.id}
                                                className={`${
                                                    deletingAgentId === agent.id
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-red-600 hover:text-red-800'
                                                }`}
                                            >
                                                {deletingAgentId === agent.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              </>
            </Card>
            {showCreateModal && (
                <CreateAgentModal onClose={() => setShowCreateModal(false)} />
            )}
        </div>
    );
};

export default AdminAgents;
