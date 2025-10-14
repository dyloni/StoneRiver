import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FuneralPackage, MedicalPackage, CashBackAddon, RequestType, RequestStatus } from '../types';
import { calculatePremiumComponents } from '../utils/policyHelpers';

const NewPolicyPage: React.FC = () => {
  const { user } = useAuth();
  const { dispatch } = useData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    idNumber: '',
    dateOfBirth: '',
    gender: 'Male' as 'Male' | 'Female',
    phone: '',
    email: '',
    streetAddress: '',
    town: '',
    postalAddress: '',
    funeralPackage: FuneralPackage.STANDARD,
    medicalPackage: MedicalPackage.NONE,
    isExpress: false,
  });

  const [participants, setParticipants] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const premiumComponents = calculatePremiumComponents({
        ...formData,
        participants,
      });

      const newRequest = {
        id: Date.now(),
        agentId: user.id,
        agentName: `${user.firstName} ${user.surname}`,
        requestType: RequestType.NEW_POLICY,
        status: RequestStatus.PENDING,
        createdAt: new Date().toISOString(),
        customerData: {
          ...formData,
          participants,
          ...premiumComponents,
        },
      };

      await dispatch({ type: 'ADD_REQUEST', payload: newRequest });

      alert('New policy request submitted successfully!');
      navigate('/requests');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    setParticipants([
      ...participants,
      {
        id: Date.now(),
        firstName: '',
        surname: '',
        relationship: 'Spouse',
        dateOfBirth: '',
        gender: 'Male',
        medicalPackage: MedicalPackage.NONE,
        cashBackAddon: CashBackAddon.NONE,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text-primary">New Policy Registration</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surname *</label>
              <input
                type="text"
                required
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
              <input
                type="text"
                required
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Funeral Package *</label>
              <select
                required
                value={formData.funeralPackage}
                onChange={(e) => setFormData({ ...formData, funeralPackage: e.target.value as FuneralPackage })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {Object.values(FuneralPackage).map(pkg => (
                  <option key={pkg} value={pkg}>{pkg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Town</label>
              <input
                type="text"
                value={formData.town}
                onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {user?.type === 'admin' && (
              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isExpress}
                    onChange={(e) => setFormData({ ...formData, isExpress: e.target.checked })}
                    className="w-5 h-5 text-brand-pink border-gray-300 rounded focus:ring-2 focus:ring-brand-primary"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-900">Express Policy</span>
                    <p className="text-xs text-gray-600 mt-1">Check this for employees and select individuals only. Express policies have special status.</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </Card>

        {participants.length > 0 && (
          <Card className="mt-4">
            <h2 className="text-xl font-bold text-brand-text-primary mb-4">Dependents</h2>
            <div className="space-y-4">
              {participants.map((p, index) => (
                <div key={p.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Dependent {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => setParticipants(participants.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={p.firstName}
                      onChange={(e) => {
                        const updated = [...participants];
                        updated[index].firstName = e.target.value;
                        setParticipants(updated);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Surname"
                      value={p.surname}
                      onChange={(e) => {
                        const updated = [...participants];
                        updated[index].surname = e.target.value;
                        setParticipants(updated);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex justify-between mt-6">
          <Button type="button" onClick={addParticipant} variant="outline">
            Add Dependent
          </Button>
          <div className="space-x-3">
            <Button type="button" onClick={() => navigate(-1)} variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewPolicyPage;
