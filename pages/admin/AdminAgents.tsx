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

    const handleActivateAgent = async (agentId: number) => {
        const confirmed = window.confirm('Are you sure you want to activate this agent?');
        if (!confirmed) return;

        try {
            setProcessingAgentId(agentId);
            const { error } = await supabase
                .from('agents')
                .update({ status: 'active' })
                .eq('id', agentId);

            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            console.error('Error activating agent:', error);
            alert('Failed to activate agent: ' + (error.message || 'Unknown error'));
        } finally {
            setProcessingAgentId(null);
        }
    };

    return (
        <div className="pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary">All Agents</h2>
                <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
                    Create New Agent
                </Button>
            </div>

            <div className="space-y-4">
                {state.agents.map((agent) => {
                    const customerCount = state.customers.filter(c => c.assignedAgentId === agent.id).length;
                    const agentName = `${agent.firstName} ${agent.surname}`;
                    const status = agent.status || 'active';
                    const statusColors = {
                        active: 'bg-green-100 text-green-800',
                        suspended: 'bg-orange-100 text-orange-800',
                        deactivated: 'bg-gray-100 text-gray-800',
                    };
                    const isProcessing = processingAgentId === agent.id;

                    return (
                        <Card key={agent.id} className="p-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-brand-text-primary truncate">
                                            {agentName}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <p className="text-sm text-brand-text-secondary">ID: {agent.id}</p>
                                            <span className="text-brand-text-secondary">•</span>
                                            <p className="text-sm text-brand-text-secondary">
                                                {customerCount} {customerCount === 1 ? 'Customer' : 'Customers'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[status]}`}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                    <button
                                        onClick={() => navigate(`/agents/${agent.id}`)}
                                        className="px-3 py-2 text-sm font-medium text-white bg-brand-pink hover:bg-brand-light-pink rounded-lg transition-colors"
                                    >
                                        View
                                    </button>

                                    {status !== 'active' ? (
                                        <button
                                            onClick={() => handleActivateAgent(agent.id)}
                                            disabled={isProcessing}
                                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                isProcessing
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                        >
                                            Activate
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAgentAction(agent, 'suspend')}
                                            disabled={isProcessing}
                                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                isProcessing
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                            }`}
                                        >
                                            Suspend
                                        </button>
                                    )}

                                    {(!agent.status || agent.status === 'active') && (
                                        <button
                                            onClick={() => handleAgentAction(agent, 'deactivate')}
                                            disabled={isProcessing}
                                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                isProcessing
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                            }`}
                                        >
                                            Deactivate
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleAgentAction(agent, 'delete')}
                                        disabled={isProcessing}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors col-span-2 sm:col-span-1 ${
                                            isProcessing
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

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
