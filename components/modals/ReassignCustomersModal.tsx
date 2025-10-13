import React, { useState } from 'react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';

interface Agent {
  id: number;
  firstName: string;
  surname: string;
  status?: string;
}

interface ReassignCustomersModalProps {
  fromAgent: Agent;
  customerCount: number;
  availableAgents: Agent[];
  onClose: () => void;
  onReassign: (toAgentId: number) => Promise<void>;
  actionType: 'suspend' | 'deactivate' | 'delete';
}

const ReassignCustomersModal: React.FC<ReassignCustomersModalProps> = ({
  fromAgent,
  customerCount,
  availableAgents,
  onClose,
  onReassign,
  actionType,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeAgents = availableAgents.filter(
    (agent) => agent.id !== fromAgent.id && (!agent.status || agent.status === 'active')
  );

  const actionLabels = {
    suspend: 'Suspend',
    deactivate: 'Deactivate',
    delete: 'Delete',
  };

  const actionDescriptions = {
    suspend: 'suspending',
    deactivate: 'deactivating',
    delete: 'deleting',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAgentId) {
      setError('Please select an agent to reassign customers to');
      return;
    }

    try {
      setLoading(true);
      await onReassign(selectedAgentId);
      onClose();
    } catch (err: any) {
      console.error('Error reassigning customers:', err);
      setError(err.message || 'Failed to reassign customers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-brand-text-primary mb-4">
          {actionLabels[actionType]} Agent: {fromAgent.firstName} {fromAgent.surname}
        </h2>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            This agent has <strong>{customerCount}</strong> customer{customerCount !== 1 ? 's' : ''} assigned.
            Before {actionDescriptions[actionType]} this agent, please select another agent to reassign
            these customers to.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Reassign Customers To
            </label>
            {activeAgents.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                No active agents available to reassign customers to. Please create or activate another
                agent first.
              </div>
            ) : (
              <select
                value={selectedAgentId || ''}
                onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                required
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              >
                <option value="">Select an agent...</option>
                {activeAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.surname} (ID: {agent.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || activeAgents.length === 0}
            >
              {loading ? 'Processing...' : `Reassign & ${actionLabels[actionType]}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignCustomersModal;
