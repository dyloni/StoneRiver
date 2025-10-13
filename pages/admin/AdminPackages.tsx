import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../utils/supabase';

interface PackageConfig {
  id: number;
  package_type: 'funeral' | 'medical' | 'cashback';
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

const AdminPackages: React.FC = () => {
  const [packages, setPackages] = useState<PackageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<PackageConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('package_configurations')
        .select('*')
        .order('package_type')
        .order('sort_order');

      if (error) throw error;

      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: PackageConfig) => {
    setEditingPackage(pkg);
    setShowEditModal(true);
  };

  const handleSave = async (updatedPackage: PackageConfig) => {
    try {
      const { error } = await supabase
        .from('package_configurations')
        .update({
          display_name: updatedPackage.display_name,
          description: updatedPackage.description,
          price: updatedPackage.price,
          sum_assured: updatedPackage.sum_assured,
          payout: updatedPackage.payout,
          benefits: updatedPackage.benefits,
          rules: updatedPackage.rules,
          is_active: updatedPackage.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedPackage.id);

      if (error) throw error;

      await loadPackages();
      setShowEditModal(false);
      setEditingPackage(null);
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Failed to save package configuration');
    }
  };

  const handleToggleActive = async (pkg: PackageConfig) => {
    try {
      const { error } = await supabase
        .from('package_configurations')
        .update({ is_active: !pkg.is_active, updated_at: new Date().toISOString() })
        .eq('id', pkg.id);

      if (error) throw error;

      await loadPackages();
    } catch (error) {
      console.error('Error toggling package status:', error);
      alert('Failed to update package status');
    }
  };

  const groupedPackages = {
    funeral: packages.filter(p => p.package_type === 'funeral'),
    medical: packages.filter(p => p.package_type === 'medical'),
    cashback: packages.filter(p => p.package_type === 'cashback'),
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading packages...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-brand-text-primary">Package Management</h2>
      </div>

      <div className="space-y-6">
        <PackageSection
          title="Funeral Packages"
          packages={groupedPackages.funeral}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />

        <PackageSection
          title="Medical Packages"
          packages={groupedPackages.medical}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />

        <PackageSection
          title="Cash Back Add-ons"
          packages={groupedPackages.cashback}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      </div>

      {showEditModal && editingPackage && (
        <EditPackageModal
          package={editingPackage}
          onClose={() => {
            setShowEditModal(false);
            setEditingPackage(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

interface PackageSectionProps {
  title: string;
  packages: PackageConfig[];
  onEdit: (pkg: PackageConfig) => void;
  onToggleActive: (pkg: PackageConfig) => void;
}

const PackageSection: React.FC<PackageSectionProps> = ({ title, packages, onEdit, onToggleActive }) => {
  return (
    <Card>
      <h3 className="text-xl font-bold text-brand-text-primary mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-brand-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-brand-surface divide-y divide-brand-border">
            {packages.map((pkg) => (
              <tr key={pkg.id} className={!pkg.is_active ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-brand-text-primary">{pkg.display_name}</div>
                  <div className="text-xs text-brand-text-secondary">{pkg.package_key}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">
                  ${pkg.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-brand-text-secondary">
                  {pkg.sum_assured > 0 && <div>Sum Assured: ${pkg.sum_assured}</div>}
                  {pkg.payout > 0 && <div>Payout: ${pkg.payout}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      pkg.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEdit(pkg)}
                    className="text-brand-pink hover:text-brand-light-pink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleActive(pkg)}
                    className={pkg.is_active ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'}
                  >
                    {pkg.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

interface EditPackageModalProps {
  package: PackageConfig;
  onClose: () => void;
  onSave: (pkg: PackageConfig) => void;
}

const EditPackageModal: React.FC<EditPackageModalProps> = ({ package: pkg, onClose, onSave }) => {
  const [formData, setFormData] = useState<PackageConfig>(pkg);
  const [benefitsText, setBenefitsText] = useState(pkg.benefits.join('\n'));
  const [rulesText, setRulesText] = useState(pkg.rules.join('\n'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const benefits = benefitsText.split('\n').filter(b => b.trim());
    const rules = rulesText.split('\n').filter(r => r.trim());
    onSave({ ...formData, benefits, rules });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-brand-text-primary mb-6">Edit Package: {pkg.display_name}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
              />
            </div>

            {formData.package_type === 'funeral' && (
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Sum Assured ($)
                </label>
                <input
                  type="number"
                  value={formData.sum_assured}
                  onChange={(e) => setFormData({ ...formData, sum_assured: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                />
              </div>
            )}

            {formData.package_type === 'cashback' && (
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Payout ($)
                </label>
                <input
                  type="number"
                  value={formData.payout}
                  onChange={(e) => setFormData({ ...formData, payout: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary"
                />
              </div>
            )}
          </div>

          {formData.package_type === 'funeral' && (
            <>
              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Benefits (one per line)
                </label>
                <textarea
                  value={benefitsText}
                  onChange={(e) => setBenefitsText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                  Rules (one per line)
                </label>
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-brand-text-primary font-mono text-sm"
                />
              </div>
            </>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-brand-pink focus:ring-brand-pink border-brand-border rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-brand-text-secondary">
              Package is active and available for selection
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPackages;
