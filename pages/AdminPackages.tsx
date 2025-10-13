import React from 'react';
import Card from '../components/ui/Card';
import { FuneralPackage, MedicalPackage, CashBackAddon } from '../types';

const AdminPackages: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text-primary">Package Configuration</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Funeral Packages</h2>
          <div className="space-y-2">
            {Object.values(FuneralPackage).map(pkg => (
              <div key={pkg} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{pkg}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Medical Packages</h2>
          <div className="space-y-2">
            {Object.values(MedicalPackage).map(pkg => (
              <div key={pkg} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{pkg}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Cash Back Add-ons</h2>
          <div className="space-y-2">
            {Object.values(CashBackAddon).map(addon => (
              <div key={addon} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{addon}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-brand-text-primary mb-4">Package Pricing</h2>
        <p className="text-gray-600">
          Package pricing is dynamically calculated based on the selected funeral package,
          number of dependents, medical packages, and cash back add-ons.
        </p>
      </Card>
    </div>
  );
};

export default AdminPackages;
