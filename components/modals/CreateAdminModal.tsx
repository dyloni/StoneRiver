import React, { useState } from 'react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';
import { useData } from '../../contexts/DataContext';

interface CreateAdminModalProps {
  onClose: () => void;
}

const CreateAdminModal: React.FC<CreateAdminModalProps> = ({ onClose }) => {
  const { refreshData } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
    idNumber: '',
    phone: '',
    streetAddress: '',
    town: '',
    postalAddress: '',
    role: 'overview',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const emailLower = formData.email.toLowerCase().trim();
      const authId = crypto.randomUUID();
      const defaultPassword = 'Stoneriver@#12';

      const { error: insertError } = await supabase
        .from('admins')
        .insert({
          auth_user_id: authId,
          first_name: formData.firstName.trim(),
          surname: formData.surname.trim(),
          email: emailLower,
          id_number: formData.idNumber.trim(),
          phone: formData.phone.trim(),
          street_address: formData.streetAddress.trim(),
          town: formData.town.trim(),
          postal_address: formData.postalAddress.trim(),
          role: formData.role,
          admin_role: formData.role,
          password: defaultPassword,
          requires_password_change: true,
          is_super_admin: false,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Error creating admin:', err);
      setError(err.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-brand-text-primary mb-6">Create New Admin</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                First Name <span className="text-red-500">*</span>
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
                Surname <span className="text-red-500">*</span>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Email <span className="text-red-500">*</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => handleChange('idNumber', e.target.value)}
                required
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                placeholder="Enter ID number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.streetAddress}
              onChange={(e) => handleChange('streetAddress', e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              placeholder="Enter street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Town/City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.town}
                onChange={(e) => handleChange('town', e.target.value)}
                required
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                placeholder="Enter town/city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Postal Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.postalAddress}
                onChange={(e) => handleChange('postalAddress', e.target.value)}
                required
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                placeholder="Enter postal address"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Admin Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              required
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
            >
              <option value="overview">Overview</option>
              <option value="sales">Sales</option>
              <option value="agents">Agents</option>
              <option value="tech">Tech</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Note: Super Admin role can only be granted through database access
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium">Default Password</p>
            <p className="mt-1">New admins will be assigned the default password: <span className="font-mono font-bold">Stoneriver@#12</span></p>
            <p className="mt-1 text-xs">They will be required to change it on first login.</p>
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
              {loading ? 'Creating...' : 'Create Admin'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAdminModal;
