import React, { useState } from 'react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';
import { useData } from '../../contexts/DataContext';

interface CreateAgentModalProps {
  onClose: () => void;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ onClose }) => {
  const { refreshData } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const emailLower = formData.email.toLowerCase().trim();

      const { data: newAgent, error: insertError } = await supabase.rpc('insert_new_agent', {
        agent_email: emailLower,
        agent_first_name: formData.firstName.trim(),
        agent_surname: formData.surname.trim(),
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Error creating agent:', err);
      setError(err.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-brand-text-primary mb-6">Create New Agent</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              placeholder="Enter first name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Surname
            </label>
            <input
              type="text"
              value={formData.surname}
              onChange={(e) => handleChange('surname', e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              placeholder="Enter surname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              placeholder="Enter email address"
            />
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
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAgentModal;
