import React, { useState } from 'react';
import { Agent, Customer } from '../../types';
import Button from '../ui/Button';

interface AssignAgentModalProps {
    customers: Customer[];
    agents: Agent[];
    onClose: () => void;
    onAssign: (agentId: number | null) => void;
}

const AssignAgentModal: React.FC<AssignAgentModalProps> = ({ customers, agents, onClose, onAssign }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');

    const handleAssign = () => {
        if (selectedAgentId === '') {
            alert('Please select an agent');
            return;
        }

        const agentId = selectedAgentId === 'unassigned' ? null : parseInt(selectedAgentId);
        onAssign(agentId);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-brand-text-primary mb-4">
                    Assign Agent
                </h2>

                <div className="mb-6">
                    <p className="text-brand-text-secondary mb-4">
                        Reassign {customers.length} customer{customers.length !== 1 ? 's' : ''} to a new agent:
                    </p>

                    <div className="bg-gray-50 rounded p-3 mb-4 max-h-32 overflow-y-auto">
                        {customers.slice(0, 5).map(customer => (
                            <div key={customer.id} className="text-sm text-brand-text-secondary">
                                {customer.firstName} {customer.surname}
                            </div>
                        ))}
                        {customers.length > 5 && (
                            <div className="text-sm text-brand-text-secondary font-semibold">
                                ...and {customers.length - 5} more
                            </div>
                        )}
                    </div>

                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                        Select Agent
                    </label>
                    <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                    >
                        <option value="">-- Select Agent --</option>
                        <option value="unassigned">Unassigned (Shared Pool)</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id.toString()}>
                                {agent.firstName} {agent.surname}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign}>
                        Assign Agent
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AssignAgentModal;
