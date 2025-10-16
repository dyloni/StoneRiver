import React, { useState } from 'react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';

interface AddPackageModalProps {
  packageType: 'funeral' | 'medical' | 'cashback';
  onClose: () => void;
  onSuccess: () => void;
}

const AddPackageModal: React.FC<AddPackageModalProps> = ({ packageType, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    package_key: '',
    display_name: '',
    description: '',
    price: '',
    sum_assured: '',
    payout: '',
    benefits: '',
    rules: '',
    is_active: true,
    sort_order: '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const benefitsArray = formData.benefits.split('\n').filter(b => b.trim());
      const rulesArray = formData.rules.split('\n').filter(r => r.trim());

      console.log('Inserting package:', {
        package_type: packageType,
        package_key: formData.package_key.trim(),
        display_name: formData.display_name.trim(),
      });

      const { data, error: insertError } = await supabase
        .from('package_configurations')
        .insert({
          package_type: packageType,
          package_key: formData.package_key.trim(),
          display_name: formData.display_name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price) || 0,
          sum_assured: parseFloat(formData.sum_assured) || 0,
          payout: parseFloat(formData.payout) || 0,
          benefits: benefitsArray,
          rules: rulesArray,
          is_active: formData.is_active,
          sort_order: parseInt(formData.sort_order) || 0,
        })
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Package created successfully:', data);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create package:', err);
      setError(err.message || 'Failed to create package');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (packageType) {
      case 'funeral': return 'Funeral Package';
      case 'medical': return 'Medical Package';
      case 'cashback': return 'Cash Back Add-on';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-2xl my-8">
        <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Add {getTypeLabel()}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-2">
                Package Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.package_key}
                onChange={(e) => setFormData({ ...formData, package_key: e.target.value })}
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                placeholder="e.g., chitomborwizi_premium"
              />
            </div>

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
                placeholder="e.g., Chitomborwizi Premium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary resize-none"
              placeholder="Brief description of the package"
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

            {packageType === 'funeral' && (
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

            {packageType === 'cashback' && (
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
              placeholder="Enter each benefit on a new line"
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
              placeholder="Enter each rule on a new line"
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
              {loading ? 'Creating...' : 'Create Package'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPackageModal;
