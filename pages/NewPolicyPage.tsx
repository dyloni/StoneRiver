import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CameraCapture from '../components/ui/CameraCapture';
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
    cashBackAddon: CashBackAddon.NONE,
    isExpress: false,
    isHybrid: false,
    paymentMethod: 'Cash' as 'Cash' | 'Mobile Money' | 'Bank Transfer',
  });

  const [participants, setParticipants] = useState<any[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const premiumComponents = calculatePremiumComponents({
        ...formData,
        participants,
      });

      const newCustomer = {
        id: Date.now(),
        policyNumber: `POL-${Date.now()}`,
        firstName: formData.firstName,
        surname: formData.surname,
        idNumber: formData.idNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        streetAddress: formData.streetAddress,
        town: formData.town,
        postalAddress: formData.postalAddress,
        funeralPackage: formData.funeralPackage,
        medicalPackage: formData.medicalPackage,
        cashBackAddon: formData.cashBackAddon,
        isExpress: formData.isExpress || false,
        isHybrid: formData.isHybrid || false,
        assignedAgentId: user.id,
        assignedAgentName: `${user.firstName} ${user.surname}`,
        inceptionDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        accountStatus: 'Good Standing',
        ...premiumComponents,
        participants: participants,
        createdAt: new Date().toISOString(),
      };

      await dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });

      alert('New policy created successfully!');
      navigate('/customers');
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Failed to create policy');
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
        idNumber: '',
        relationship: 'Spouse',
        dateOfBirth: '',
        gender: 'Male',
        phone: '',
        streetAddress: '',
        town: '',
        medicalPackage: MedicalPackage.NONE,
        cashBackAddon: CashBackAddon.NONE,
      },
    ]);
  };

  const premiumComponents = calculatePremiumComponents({
    ...formData,
    participants,
  });

  const totalPremium = premiumComponents.totalPremium;

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
                placeholder="263771234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical Package</label>
              <select
                value={formData.medicalPackage}
                onChange={(e) => setFormData({ ...formData, medicalPackage: e.target.value as MedicalPackage })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {Object.values(MedicalPackage).map(pkg => (
                  <option key={pkg} value={pkg}>{pkg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Back Add-on</label>
              <select
                value={formData.cashBackAddon}
                onChange={(e) => setFormData({ ...formData, cashBackAddon: e.target.value as CashBackAddon })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {Object.values(CashBackAddon).map(addon => (
                  <option key={addon} value={addon}>{addon}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isHybrid}
                  onChange={(e) => setFormData({ ...formData, isHybrid: e.target.checked })}
                  className="w-5 h-5 text-brand-pink border-gray-300 rounded focus:ring-2 focus:ring-brand-primary"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900">Hybrid Product</span>
                  <p className="text-xs text-gray-600 mt-1">Hybrid products combine funeral and medical coverage with special terms.</p>
                </div>
              </label>
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

        <Card className="mt-4">
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select
                required
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'Cash' | 'Mobile Money' | 'Bank Transfer' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt / Proof of Payment</label>
              <div className="space-y-2">
                {receiptImage ? (
                  <div className="relative">
                    <img src={receiptImage} alt="Receipt" className="w-full h-48 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => setReceiptImage(null)}
                      className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById('receipt-file-input')?.click()}
                    >
                      Upload Receipt
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const camera = document.getElementById('receipt-camera');
                        if (camera) camera.style.display = 'block';
                      }}
                    >
                      Take Photo
                    </Button>
                  </div>
                )}
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setReceiptImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Policy Holder ID Document</label>
              <div className="space-y-2">
                {idImage ? (
                  <div className="relative">
                    <img src={idImage} alt="ID Document" className="w-full h-48 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => setIdImage(null)}
                      className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById('id-file-input')?.click()}
                    >
                      Upload ID
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const camera = document.getElementById('id-camera');
                        if (camera) camera.style.display = 'block';
                      }}
                    >
                      Take Photo
                    </Button>
                  </div>
                )}
                <input
                  id="id-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setIdImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
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
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={p.firstName}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].firstName = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Surname *</label>
                      <input
                        type="text"
                        value={p.surname}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].surname = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">National ID *</label>
                      <input
                        type="text"
                        value={p.idNumber || ''}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].idNumber = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        value={p.dateOfBirth}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].dateOfBirth = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gender *</label>
                      <select
                        value={p.gender}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].gender = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={p.phone || ''}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].phone = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="263771234567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={p.streetAddress || ''}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].streetAddress = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Town</label>
                      <input
                        type="text"
                        value={p.town || ''}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].town = e.target.value;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Medical Package</label>
                      <select
                        value={p.medicalPackage || MedicalPackage.NONE}
                        onChange={(e) => {
                          const selectedPackage = e.target.value as MedicalPackage;
                          const holderPackage = formData.medicalPackage;
                          const packageOrder = Object.values(MedicalPackage);
                          const selectedIndex = packageOrder.indexOf(selectedPackage);
                          const holderIndex = packageOrder.indexOf(holderPackage);

                          if (selectedIndex > holderIndex) {
                            alert('Dependent cannot have a higher medical package than the policy holder');
                            return;
                          }

                          const updated = [...participants];
                          updated[index].medicalPackage = selectedPackage;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {Object.values(MedicalPackage).map(pkg => (
                          <option key={pkg} value={pkg}>{pkg}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cash Back Add-on</label>
                      <select
                        value={p.cashBackAddon || CashBackAddon.NONE}
                        onChange={(e) => {
                          const updated = [...participants];
                          updated[index].cashBackAddon = e.target.value as CashBackAddon;
                          setParticipants(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {Object.values(CashBackAddon).map(addon => (
                          <option key={addon} value={addon}>{addon}</option>
                        ))}
                      </select>
                    </div>
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
              {loading ? 'Creating Policy...' : 'Create Policy'}
            </Button>
          </div>
        </div>
      </form>

      <div id="receipt-camera" style={{ display: 'none' }}>
        <CameraCapture
          title="Capture Receipt"
          onCapture={(imageData) => {
            setReceiptImage(imageData);
            const camera = document.getElementById('receipt-camera');
            if (camera) camera.style.display = 'none';
          }}
          onClose={() => {
            const camera = document.getElementById('receipt-camera');
            if (camera) camera.style.display = 'none';
          }}
        />
      </div>

      <div id="id-camera" style={{ display: 'none' }}>
        <CameraCapture
          title="Capture ID Document"
          onCapture={(imageData) => {
            setIdImage(imageData);
            const camera = document.getElementById('id-camera');
            if (camera) camera.style.display = 'none';
          }}
          onClose={() => {
            const camera = document.getElementById('id-camera');
            if (camera) camera.style.display = 'none';
          }}
        />
      </div>

      <div className="fixed bottom-8 right-8 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-8 py-4 rounded-full shadow-2xl transform transition-all hover:scale-105 z-50">
        <div className="text-center">
          <div className="text-sm font-medium opacity-90">Total Premium</div>
          <div className="text-3xl font-bold">${totalPremium.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default NewPolicyPage;
