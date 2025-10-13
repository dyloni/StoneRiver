import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
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
        <div className="max-w-4xl mx-auto px-4 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto text-sm"
                >
                    + Create Agent
                </Button>
            </div>

            <div className="space-y-3">
                {state.agents.map((agent) => {
                    const customerCount = state.customers.filter(c => c.assignedAgentId === agent.id).length;
                    const agentName = `${agent.firstName} ${agent.surname}`;
                    const status = agent.status || 'active';
                    const isProcessing = processingAgentId === agent.id;

                    return (
                        <div
                            key={agent.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">
                                        {agentName}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                        <span>ID {agent.id}</span>
                                        <span>•</span>
                                        <span>{customerCount} {customerCount === 1 ? 'customer' : 'customers'}</span>
                                    </div>
                                </div>
                                <span
                                    className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                        status === 'active'
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : status === 'suspended'
                                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                                    }`}
                                >
                                    {status === 'active' ? 'Active' : status === 'suspended' ? 'Suspended' : 'Deactivated'}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => navigate(`/agents/${agent.id}`)}
                                    className="flex-1 min-w-[calc(50%-0.25rem)] px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 border-2 border-blue-300 rounded-lg transition-colors"
                                >
                                    View
                                </button>

                                {status !== 'active' ? (
                                    <button
                                        onClick={() => handleActivateAgent(agent.id)}
                                        disabled={isProcessing}
                                        className={`flex-1 min-w-[calc(50%-0.25rem)] px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                            isProcessing
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                                                : 'text-green-800 bg-green-100 hover:bg-green-200 border-2 border-green-400'
                                        }`}
                                    >
                                        Activate
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAgentAction(agent, 'suspend')}
                                        disabled={isProcessing}
                                        className={`flex-1 min-w-[calc(50%-0.25rem)] px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                            isProcessing
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                                                : 'text-orange-800 bg-orange-100 hover:bg-orange-200 border-2 border-orange-400'
                                        }`}
                                    >
                                        Suspend
                                    </button>
                                )}

                                {(!agent.status || agent.status === 'active') && (
                                    <button
                                        onClick={() => handleAgentAction(agent, 'deactivate')}
                                        disabled={isProcessing}
                                        className={`flex-1 min-w-[calc(50%-0.25rem)] px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                            isProcessing
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                                                : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-2 border-amber-400'
                                        }`}
                                    >
                                        Deactivate
                                    </button>
                                )}

                                <button
                                    onClick={() => handleAgentAction(agent, 'delete')}
                                    disabled={isProcessing}
                                    className={`flex-1 min-w-[calc(50%-0.25rem)] px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                        isProcessing
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                                            : 'text-red-800 bg-red-100 hover:bg-red-200 border-2 border-red-400'
                                    }`}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
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
