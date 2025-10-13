import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { supabase } from '../utils/supabase';

interface PackageConfig {
  id: number;
  package_name: string;
  package_type: string;
  base_premium: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

const AdminPackages: React.FC = () => {
  const [packages, setPackages] = useState<PackageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('package_configurations')
        .select('*')
        .order('package_type', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Package Configuration</h1>
        <p className="text-gray-600 mt-1">Manage insurance package offerings</p>
      </div>

      {loading ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">Loading packages...</p>
          </div>
        </Card>
      ) : packages.length > 0 ? (
        <div className="grid gap-4">
          {packages.map(pkg => (
            <Card key={pkg.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{pkg.package_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      pkg.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {pkg.package_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <div>
                      <span className="font-medium">Base Premium:</span> ${pkg.base_premium.toFixed(2)}
                    </div>
                    {pkg.description && (
                      <div className="mt-2">
                        <span className="font-medium">Description:</span> {pkg.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Packages Configured</h2>
            <p className="text-gray-600">
              Package configurations will appear here once they are added to the database.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPackages;
