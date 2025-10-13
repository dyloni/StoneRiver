import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../utils/supabase';
import AddPackageModal from '../components/modals/AddPackageModal';
import EditPackageModal from '../components/modals/EditPackageModal';

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

const AdminPackages: React.FC = () => {
  const [packages, setPackages] = useState<PackageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'funeral' | 'medical' | 'cashback'>('funeral');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageConfig | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('package_configurations')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading packages:', error);
    } else {
      setPackages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleAddClick = (type: 'funeral' | 'medical' | 'cashback') => {
    setAddModalType(type);
    setShowAddModal(true);
  };

  const handleEditClick = (pkg: PackageConfig) => {
    setEditingPackage(pkg);
    setShowEditModal(true);
  };

  const handleSuccess = () => {
    loadPackages();
  };

  const funeralPackages = packages.filter(p => p.package_type === 'funeral');
  const medicalPackages = packages.filter(p => p.package_type === 'medical');
  const cashbackPackages = packages.filter(p => p.package_type === 'cashback');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-text-primary">Package Configuration</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-text-primary">Funeral Packages</h2>
            <Button onClick={() => handleAddClick('funeral')} size="sm">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {funeralPackages.map(pkg => (
              <div
                key={pkg.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleEditClick(pkg)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{pkg.display_name}</p>
                    <p className="text-sm text-gray-600">${pkg.price}/month</p>
                    {pkg.sum_assured > 0 && (
                      <p className="text-xs text-gray-500">Sum Assured: ${pkg.sum_assured}</p>
                    )}
                  </div>
                  {!pkg.is_active && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>
                  )}
                </div>
              </div>
            ))}
            {funeralPackages.length === 0 && (
              <p className="text-gray-500 text-sm">No funeral packages configured</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-text-primary">Medical Packages</h2>
            <Button onClick={() => handleAddClick('medical')} size="sm">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {medicalPackages.map(pkg => (
              <div
                key={pkg.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleEditClick(pkg)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{pkg.display_name}</p>
                    <p className="text-sm text-gray-600">${pkg.price}/month</p>
                  </div>
                  {!pkg.is_active && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>
                  )}
                </div>
              </div>
            ))}
            {medicalPackages.length === 0 && (
              <p className="text-gray-500 text-sm">No medical packages configured</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-brand-text-primary">Cash Back Add-ons</h2>
            <Button onClick={() => handleAddClick('cashback')} size="sm">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {cashbackPackages.map(pkg => (
              <div
                key={pkg.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleEditClick(pkg)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{pkg.display_name}</p>
                    <p className="text-sm text-gray-600">${pkg.price}/month</p>
                    {pkg.payout > 0 && (
                      <p className="text-xs text-gray-500">Payout: ${pkg.payout}</p>
                    )}
                  </div>
                  {!pkg.is_active && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>
                  )}
                </div>
              </div>
            ))}
            {cashbackPackages.length === 0 && (
              <p className="text-gray-500 text-sm">No cash back packages configured</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-brand-text-primary mb-4">Package Pricing Information</h2>
        <div className="space-y-2 text-gray-600">
          <p>
            Package pricing is dynamically calculated based on the selected funeral package,
            number of dependents, medical packages, and cash back add-ons.
          </p>
          <p className="text-sm">
            Click on any package above to edit its details, pricing, benefits, and rules.
          </p>
        </div>
      </Card>

      {showAddModal && (
        <AddPackageModal
          packageType={addModalType}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showEditModal && editingPackage && (
        <EditPackageModal
          packageData={editingPackage}
          onClose={() => {
            setShowEditModal(false);
            setEditingPackage(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default AdminPackages;
