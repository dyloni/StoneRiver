import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import CreateAdminModal from '../components/modals/CreateAdminModal';

const AdminAccounts: React.FC = () => {
  const { admins } = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Accounts</h1>
          <p className="text-gray-600 mt-1">{admins?.length || 0} admin accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Admin
        </button>
      </div>

      <div className="grid gap-4">
        {admins && admins.length > 0 ? (
          admins.map(admin => (
            <Card key={admin.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {admin.firstName} {admin.surname}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {admin.role}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {admin.email && (
                      <div>
                        <span className="font-medium">Email:</span> {admin.email}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Admin ID:</span> {admin.id}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No admin accounts found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Create first admin account
              </button>
            </div>
          </Card>
        )}
      </div>

      {showCreateModal && (
        <CreateAdminModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default AdminAccounts;
