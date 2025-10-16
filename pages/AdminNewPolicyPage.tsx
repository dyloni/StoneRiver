import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CameraCapture from '../components/ui/CameraCapture';
import { FuneralPackage, MedicalPackage, CashBackAddon } from '../types';
import { calculatePremiumComponents } from '../utils/policyHelpers';
import { supabase } from '../utils/supabase';

interface Participant {
  id: number;
  firstName: string;
  surname: string;
  relationship: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  idNumber?: string;
  phone?: string;
  streetAddress?: string;
  town?: string;
  medicalPackage: MedicalPackage;
  cashBackAddon: CashBackAddon;
}

const AdminNewPolicyPage: React.FC = () => {
  const { user } = useAuth();
  const { state, dispatch } = useData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    idNumber: '',
    dateOfBirth: '',
    gender: 'Male' as 'Male' | 'Female',
    phone: '',
    email: '',
    streetAddress: '',
    town: 'Harare',
    postalAddress: '',
    funeralPackage: FuneralPackage.STANDARD,
    medicalPackage: MedicalPackage.NONE,
    cashBackAddon: CashBackAddon.NONE,
    isExpress: false,
    isHybrid: false,
    assignedAgentId: '',
    inceptionDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash' as 'Cash' | 'Mobile Money' | 'Bank Transfer',
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);

  useEffect(() => {
    setAgents(state.agents.filter(a => a.status === 'active'));
  }, [state.agents]);

  const generatePolicyNumber = (): string => {
    const idNumber = formData.idNumber;
    if (!idNumber || idNumber.length < 2) {
      return `${Date.now()}`;
    }

    const firstTwo = idNumber.substring(0, 2);
    const random = Math.floor(Math.random() * 900000) + 100000;
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];

    return `${firstTwo}${random}${randomLetter}${firstTwo}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (user.type !== 'admin') {
      alert('Only administrators can create policies directly.');
      return;
    }

    setLoading(true);
    try {
      const { data: maxIdData } = await supabase
        .from('customers')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextId = maxIdData ? maxIdData.id + 1 : 1;

      const premiumComponents = calculatePremiumComponents({
        ...formData,
        participants,
      });

      const policyNumber = generatePolicyNumber();
      const coverDate = new Date(formData.inceptionDate);
      coverDate.setMonth(coverDate.getMonth() + 3);

      const newCustomer = {
        id: nextId,
        policy_number: policyNumber,
        first_name: formData.firstName,
        surname: formData.surname,
        id_number: formData.idNumber,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email || 'imported@example.com',
        street_address: formData.streetAddress || 'N/A',
        town: formData.town || 'Harare',
        postal_address: formData.postalAddress || 'N/A',
        funeral_package: formData.funeralPackage,
        participants: participants,
        policy_premium: premiumComponents.policyPremium,
        addon_premium: premiumComponents.addonPremium,
        total_premium: premiumComponents.totalPremium,
        premium_period: 'Monthly',
        inception_date: formData.inceptionDate,
        cover_date: coverDate.toISOString().split('T')[0],
        status: formData.isExpress ? 'Express' : 'Active',
        is_hybrid_product: formData.isHybrid,
        hybrid_enrollment_date: formData.isHybrid ? formData.inceptionDate : null,
        assigned_agent_id: parseInt(formData.assignedAgentId) || null,
        date_created: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (error) {
        console.error('Error creating policy:', error);
        alert(`Failed to create policy: ${error.message}`);
        return;
      }

      dispatch({ type: 'ADD_CUSTOMER', payload: { ...newCustomer, id: data.id } });

      alert(`Policy created successfully! Policy Number: ${policyNumber}`);
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
        relationship: 'Spouse',
        dateOfBirth: '',
        gender: 'Male',
        idNumber: '',
        phone: '',
        streetAddress: '',
        town: '',
        medicalPackage: MedicalPackage.NONE,
        cashBackAddon: CashBackAddon.NONE,
      },
    ]);
  };

  const updateParticipant = (index: number, field: string, value: any) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text-primary">Create New Policy</h1>
        <span className="px-4 py-2 bg-brand-pink/10 text-brand-pink rounded-lg text-sm font-semibold">
          Direct Policy Creation
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Policy Holder Information</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">National ID *</label>
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
                <option value={FuneralPackage.LITE}>{FuneralPackage.LITE}</option>
                <option value={FuneralPackage.STANDARD}>{FuneralPackage.STANDARD}</option>
                <option value={FuneralPackage.PREMIUM}>{FuneralPackage.PREMIUM}</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inception Date *</label>
              <input
                type="date"
                required
                value={formData.inceptionDate}
                onChange={(e) => setFormData({ ...formData, inceptionDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Agent</label>
              <select
                value={formData.assignedAgentId}
                onChange={(e) => setFormData({ ...formData, assignedAgentId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">No Agent (Unassigned)</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.surname}
                  </option>
                ))}
              </select>
            </div>

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
                  <p className="text-xs text-gray-600 mt-1">Express policies have special status and are exempt from certain restrictions.</p>
                </div>
              </label>
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
            <h2 className="text-xl font-bold text-brand-text-primary mb-4">Dependents / Beneficiaries</h2>
            <div className="space-y-4">
              {participants.map((p, index) => (
                <div key={p.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-brand-text-primary">Dependent {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                      <input
                        type="text"
                        value={p.firstName}
                        onChange={(e) => updateParticipant(index, 'firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Surname</label>
                      <input
                        type="text"
                        value={p.surname}
                        onChange={(e) => updateParticipant(index, 'surname', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
                      <select
                        value={p.relationship}
                        onChange={(e) => updateParticipant(index, 'relationship', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={p.dateOfBirth}
                        onChange={(e) => updateParticipant(index, 'dateOfBirth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                      <select
                        value={p.gender}
                        onChange={(e) => updateParticipant(index, 'gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">National ID</label>
                      <input
                        type="text"
                        value={p.idNumber}
                        onChange={(e) => updateParticipant(index, 'idNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={p.phone}
                        onChange={(e) => updateParticipant(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="263771234567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={p.streetAddress}
                        onChange={(e) => updateParticipant(index, 'streetAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Town</label>
                      <input
                        type="text"
                        value={p.town}
                        onChange={(e) => updateParticipant(index, 'town', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Medical Package</label>
                      <select
                        value={p.medicalPackage}
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
                          updateParticipant(index, 'medicalPackage', selectedPackage);
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
                        value={p.cashBackAddon}
                        onChange={(e) => updateParticipant(index, 'cashBackAddon', e.target.value)}
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
            + Add Dependent
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

      <div className="fixed bottom-8 right-8 z-[9999]">
        <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-full shadow-2xl px-8 py-5 flex flex-col items-center justify-center text-center leading-tight transform transition-all hover:scale-105">
          <span className="text-sm font-medium opacity-90">Total Premium</span>
          <span className="font-bold text-3xl">${calculatePremiumComponents({ ...formData, participants }).totalPremium.toFixed(2)}</span>
          <span className="text-xs opacity-90">per month</span>
        </div>
      </div>

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
    </div>
  );
};

export default AdminNewPolicyPage;
