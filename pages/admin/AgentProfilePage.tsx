import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PolicyStatusBadge from '../../components/ui/PolicyStatusBadge';
import Badge from '../../components/ui/Badge';
import { MakePaymentRequest, RequestType } from '../../types';
import { supabase } from '../../utils/supabase';
import ReassignCustomersModal from '../../components/modals/ReassignCustomersModal';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';

const AgentProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { state, refreshData } = useData();
    const navigate = useNavigate();
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [reassignModal, setReassignModal] = useState<{
        actionType: 'suspend' | 'deactivate' | 'delete';
    } | null>(null);
    const [processing, setProcessing] = useState(false);

    const agent = state.agents.find(a => a.id === Number(id));

    if (!agent) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-brand-text-primary">Agent not found</h2>
                <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
            </div>
        );
    }
    
    const assignedCustomers = state.customers.filter(c => c.assignedAgentId === agent.id);
    const agentPaymentRequests = state.requests
        .filter((r): r is MakePaymentRequest => r.agentId === agent.id && r.requestType === RequestType.MAKE_PAYMENT)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const handleMessageAgent = () => {
        navigate('/messages', { state: { agentId: agent.id } });
    };

    const handleAgentAction = (actionType: 'suspend' | 'deactivate' | 'delete') => {
        const customerCount = assignedCustomers.length;

        if (customerCount > 0) {
            setReassignModal({ actionType });
        } else {
            executeAgentAction(actionType);
        }
    };

    const executeAgentAction = async (actionType: 'suspend' | 'deactivate' | 'delete') => {
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
            setProcessing(true);

            if (actionType === 'delete') {
                const { error } = await supabase.from('agents').delete().eq('id', agent.id);
                if (error) throw error;
                navigate('/agents');
            } else {
                const status = actionType === 'suspend' ? 'suspended' : 'deactivated';
                const { error } = await supabase
                    .from('agents')
                    .update({ status })
                    .eq('id', agent.id);
                if (error) throw error;
                await refreshData();
            }
        } catch (error: any) {
            console.error(`Error ${actionMessages[actionType]}ing agent:`, error);
            alert(`Failed to ${actionMessages[actionType]} agent: ` + (error.message || 'Unknown error'));
        } finally {
            setProcessing(false);
        }
    };

    const handleReassignAndAction = async (toAgentId: number) => {
        if (!reassignModal) return;

        const { actionType } = reassignModal;

        const { error: reassignError } = await supabase
            .from('customers')
            .update({ assigned_agent_id: toAgentId })
            .eq('assigned_agent_id', agent.id);

        if (reassignError) throw reassignError;

        await executeAgentAction(actionType);
    };

    const handleActivateAgent = async () => {
        const confirmed = window.confirm('Are you sure you want to activate this agent?');
        if (!confirmed) return;

        try {
            setProcessing(true);
            const { error } = await supabase
                .from('agents')
                .update({ status: 'active' })
                .eq('id', agent.id);

            if (error) throw error;
            await refreshData();
        } catch (error: any) {
            console.error('Error activating agent:', error);
            alert('Failed to activate agent: ' + (error.message || 'Unknown error'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-semibold text-brand-text-primary">{`${agent.firstName} ${agent.surname}`}</h2>
                        {agent.status && (
                            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                                agent.status === 'active' ? 'bg-green-100 text-green-800' :
                                agent.status === 'suspended' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-brand-text-secondary">Agent ID: {agent.id}</p>
                    {agent.email && <p className="mt-1 text-brand-text-secondary">Email: {agent.email}</p>}
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleMessageAgent}>Message Agent</Button>
                </div>
            </div>

            <Card title="Account Management">
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={() => setShowPasswordModal(true)}
                            disabled={processing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Reset Password
                        </Button>

                        {agent.status !== 'active' && (
                            <Button
                                onClick={handleActivateAgent}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Activate Agent
                            </Button>
                        )}

                        {(!agent.status || agent.status === 'active') && (
                            <>
                                <Button
                                    onClick={() => handleAgentAction('suspend')}
                                    disabled={processing}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    Suspend Agent
                                </Button>
                                <Button
                                    onClick={() => handleAgentAction('deactivate')}
                                    disabled={processing}
                                    className="bg-yellow-600 hover:bg-yellow-700"
                                >
                                    Deactivate Agent
                                </Button>
                            </>
                        )}

                        <Button
                            onClick={() => handleAgentAction('delete')}
                            disabled={processing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Agent
                        </Button>
                    </div>
                    <p className="text-sm text-brand-text-secondary">
                        Manage agent account status, reset passwords, or permanently delete the account.
                    </p>
                </div>
            </Card>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="Assigned Customers">
                    {assignedCustomers.length > 0 ? (
                        <ul className="divide-y divide-brand-border">
                            {assignedCustomers.map(customer => (
                                <li key={customer.id} className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded-md" onClick={() => navigate(`/customers/${customer.id}`)}>
                                    <span className="text-sm font-medium text-brand-text-primary">{`${customer.firstName} ${customer.surname}`}</span>
                                    <PolicyStatusBadge status={customer.status} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-brand-text-secondary">No customers assigned.</p>
                    )}
                </Card>
                <Card title="Recent Payments Logged">
                    {agentPaymentRequests.length > 0 ? (
                        <ul className="divide-y divide-brand-border">
                             {agentPaymentRequests.slice(0, 10).map(request => (
                                <li key={request.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-brand-text-primary">{`$${request.paymentAmount.toFixed(2)} - ${request.paymentMethod}`}</p>
                                        <p className="text-xs text-brand-text-secondary">
                                            {`Customer ID: ${request.customerId}`}
                                        </p>
                                    </div>
                                    <Badge status={request.status} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-center text-brand-text-secondary">No payments logged.</p>
                    )}
                </Card>
            </div>

            {showPasswordModal && (
                <ChangePasswordModal
                    userId={agent.id}
                    userType="agent"
                    onClose={() => setShowPasswordModal(false)}
                    onPasswordChanged={() => {
                        setShowPasswordModal(false);
                        alert('Password reset successfully. The agent will be required to change it on next login.');
                    }}
                />
            )}

            {reassignModal && (
                <ReassignCustomersModal
                    fromAgent={agent}
                    customerCount={assignedCustomers.length}
                    availableAgents={state.agents}
                    actionType={reassignModal.actionType}
                    onClose={() => setReassignModal(null)}
                    onReassign={handleReassignAndAction}
                />
            )}
        </div>
    );
};

export default AgentProfilePage;