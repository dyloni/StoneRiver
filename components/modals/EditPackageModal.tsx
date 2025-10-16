import React, { useState } from 'react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';

interface PackageConfig {
  id: number;
  package_type: string;
  package_key: string;
  display_name: string;
  description: string;
  price: number;
  sum_assured: number;
  payout: number;
  benefits: string[];
  rules: string[];
  is_active: boolean;
  sort_order: number;
}

interface EditPackageModalProps {
  package: PackageConfig;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPackageModal: React.FC<EditPackageModalProps> = ({ package: pkg, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    display_name: pkg.display_name,
    description: pkg.description || '',
    price: pkg.price.toString(),
    sum_assured: pkg.sum_assured.toString(),
    payout: pkg.payout.toString(),
    benefits: pkg.benefits.join('\n'),
    rules: pkg.rules.join('\n'),
    is_active: pkg.is_active,
    sort_order: pkg.sort_order.toString(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const benefitsArray = formData.benefits.split('\n').filter(b => b.trim());
      const rulesArray = formData.rules.split('\n').filter(r => r.trim());

      console.log('Updating package:', pkg.id);

      const { data, error: updateError } = await supabase
        .from('package_configurations')
        .update({
          display_name: formData.display_name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price) || 0,
          sum_assured: parseFloat(formData.sum_assured) || 0,
          payout: parseFloat(formData.payout) || 0,
          benefits: benefitsArray,
          rules: rulesArray,
          is_active: formData.is_active,
          sort_order: parseInt(formData.sort_order) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pkg.id)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Package updated successfully:', data);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update package:', err);
      setError(err.message || 'Failed to update package');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Deleting package:', pkg.id);

      const { error: deleteError } = await supabase
        .from('package_configurations')
        .delete()
        .eq('id', pkg.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      console.log('Package deleted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete package:', err);
      setError(err.message || 'Failed to delete package');
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (pkg.package_type) {
      case 'funeral': return 'Funeral Package';
      case 'medical': return 'Medical Package';
      case 'cashback': return 'Cash Back Add-on';
      default: return 'Package';
    }
  };

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-md">
          <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Confirm Delete</h3>
          <p className="text-brand-text-secondary mb-6">
            Are you sure you want to delete <strong>{pkg.display_name}</strong>? This action cannot be undone.
          </p>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-2xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-brand-text-primary">Edit {getTypeLabel()}</h3>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-100 hover:bg-red-200 text-red-700"
          >
            Delete
          </Button>
        </div>

        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Package Key:</strong> {pkg.package_key}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-2">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-2">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              />
            </div>

            {pkg.package_type === 'funeral' && (
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-2">Sum Assured ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sum_assured}
                  onChange={(e) => setFormData({ ...formData, sum_assured: e.target.value })}
                  className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                />
              </div>
            )}

            {pkg.package_type === 'cashback' && (
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-2">Payout ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.payout}
                  onChange={(e) => setFormData({ ...formData, payout: e.target.value })}
                  className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-2">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-2">
              Benefits (one per line)
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-2">
              Rules (one per line)
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary resize-none"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-brand-pink border-brand-border rounded focus:ring-brand-pink"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-brand-text-primary">
              Active
            </label>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPackageModal;
