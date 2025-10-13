import React, { useState } from 'react';
import Button from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface UploadPaymentModalProps {
  onClose: () => void;
}

const UploadPaymentModal: React.FC<UploadPaymentModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { dispatch } = useData();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      alert('Bulk payment upload is not yet implemented. Please use individual payment entry.');
      onClose();
    } catch (error) {
      console.error('Error uploading payments:', error);
      alert('Failed to upload payments');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-brand-text-primary mb-4">Upload Bulk Payments</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV or Excel file
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-primary file:text-white
                hover:file:bg-brand-primary-dark
                file:cursor-pointer cursor-pointer"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Expected format:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1">
              <li>Policy Number</li>
              <li>Amount</li>
              <li>Payment Date</li>
              <li>Payment Method</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={onClose} variant="outline" disabled={uploading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadPaymentModal;
