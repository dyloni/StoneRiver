import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import CreateAgentModal from '../../components/modals/CreateAgentModal';
import ReassignCustomersModal from '../../components/modals/ReassignCustomersModal';
import { supabase } from '../../utils/supabase';

const AdminAgents: React.FC = () => {
    const { state, refreshData } = useData();
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [processingAgentId, setProcessingAgentId] = useState<number | null>(null);
    const [reassignModal, setReassignModal] = useState<{
        agent: { id: number; firstName: string; surname: string };
        customerCount: number;
        actionType: 'suspend' | 'deactivate' | 'delete';
    } | null>(null);

    const handleAgentAction = (agent: any, actionType: 'suspend' | 'deactivate' | 'delete') => {
        const customerCount = state.customers.filter(c => c.assignedAgentId === agent.id).length;

        if (customerCount > 0) {
            setReassignModal({
                agent: { id: agent.id, firstName: agent.firstName, surname: agent.surname },
                customerCount,
                actionType,
            });
        } else {
            executeAgentAction(agent.id, actionType);
        }
    };

    const executeAgentAction = async (agentId: number, actionType: 'suspend' | 'deactivate' | 'delete') => {
        const actionMessages = {
            suspend: 'suspend',
            deactivate: 'deactivate',
            delete: 'delete',
        };

        const confirmed = window.confirm(
            `Are you sure you want to ${actionMessages[actionType]} this agent?${actionType === 'delete' ? ' This action cannot be undone.' : ''}`
        );

        if (!confirmed) return;

        try {
            setProcessingAgentId(agentId);

            if (actionType === 'delete') {
                const { error } = await supabase.from('agents').delete().eq('id', agentId);
                if (error) throw error;
            } else {
                const status = actionType === 'suspend' ? 'suspended' : 'deactivated';
                const { error } = await supabase
                    .from('agents')
                    .update({ status })
                    .eq('id', agentId);
                if (error) throw error;
            }

            await refreshData();
        } catch (error: any) {
            console.error(`Error ${actionMessages[actionType]}ing agent:`, error);
            alert(`Failed to ${actionMessages[actionType]} agent: ` + (error.message || 'Unknown error'));
        } finally {
            setProcessingAgentId(null);
        }
    };

    const handleReassignAndAction = async (toAgentId: number) => {
        if (!reassignModal) return;

        const { agent, actionType } = reassignModal;

        const { error: reassignError } = await supabase
            .from('customers')
            .update({ assigned_agent_id: toAgentId })
            .eq('assigned_agent_id', agent.id);

        if (reassignError) throw reassignError;

        await executeAgentAction(agent.id, actionType);
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Customers</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-brand-surface divide-y divide-brand-border">
                            {state.agents.map((agent) => {
                                const customerCount = state.customers.filter(c => c.assignedAgentId === agent.id).length;
                                const agentName = `${agent.firstName} ${agent.surname}`;
                                const status = agent.status || 'active';
                                const statusColors = {
                                    active: 'bg-green-100 text-green-800',
                                    suspended: 'bg-orange-100 text-orange-800',
                                    deactivated: 'bg-gray-100 text-gray-800',
                                };
                                return (
                                    <tr key={agent.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-text-primary">{agentName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{agent.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{customerCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                            <button
                                                onClick={() => navigate(`/agents/${agent.id}`)}
                                                className="text-brand-pink hover:text-brand-light-pink"
                                            >
                                                View Profile
                                            </button>
                                            <button
                                                onClick={() => handleAgentAction(agent, 'suspend')}
                                                disabled={processingAgentId === agent.id}
                                                className={`${
                                                    processingAgentId === agent.id
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-orange-600 hover:text-orange-800'
                                                }`}
                                            >
                                                Suspend
                                            </button>
                                            <button
                                                onClick={() => handleAgentAction(agent, 'deactivate')}
                                                disabled={processingAgentId === agent.id}
                                                className={`${
                                                    processingAgentId === agent.id
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-yellow-600 hover:text-yellow-800'
                                                }`}
                                            >
                                                Deactivate
                                            </button>
                                            <button
                                                onClick={() => handleAgentAction(agent, 'delete')}
                                                disabled={processingAgentId === agent.id}
                                                className={`${
                                                    processingAgentId === agent.id
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-red-600 hover:text-red-800'
                                                }`}
                                            >
                                                Delete
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
            {reassignModal && (
                <ReassignCustomersModal
                    fromAgent={reassignModal.agent}
                    customerCount={reassignModal.customerCount}
                    availableAgents={state.agents}
                    actionType={reassignModal.actionType}
                    onClose={() => setReassignModal(null)}
                    onReassign={handleReassignAndAction}
                />
            )}
        </div>
    );
};

export default AdminAgents;
