import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PolicyStatusBadge from '../components/ui/PolicyStatusBadge';
import { getEffectivePolicyStatus, getPaymentHistory, PaymentHistoryItem, calculateStatusFromData } from '../utils/statusHelpers';
import { getParticipantSuffix, formatPolicyNumber } from '../utils/policyHelpers';
import ParticipantSuffix from '../components/ui/ParticipantSuffix';
import MakePaymentModal from '../components/modals/MakePaymentModal';
import EditCustomerModal from '../components/modals/EditCustomerModal';
import AddDependentModal from '../components/modals/AddDependentModal';
import PolicyAdjustmentModal from '../components/modals/PolicyAdjustmentModal';
import ReceiptViewerModal from '../components/modals/ReceiptViewerModal';
import EditParticipantModal from '../components/modals/EditParticipantModal';
import { MedicalPackage, CashBackAddon, PolicyStatus, Participant } from '../types';
import { supabase } from '../utils/supabase';
import { supabaseService } from '../services/supabaseService';

const DetailItem: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-brand-text-secondary">{label}</dt>
        <dd className="mt-1 text-sm text-brand-text-primary">{value || 'N/A'}</dd>
    </div>
);

const PolicyDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [modal, setModal] = useState<string | null>(null);
    const [receiptFile, setReceiptFile] = useState<string | null>(null);
    const [status, setStatus] = useState<PolicyStatus>(PolicyStatus.ACTIVE);
    const [balance, setBalance] = useState<{ balance: number; monthsDue: number }>({ balance: 0, monthsDue: 0 });
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

    const customer = state.customers.find(c => c.id === Number(id));

    useEffect(() => {
        if (customer) {
            loadCustomerData();
        }
    }, [customer?.id]);

    const loadCustomerData = async () => {
        if (!customer) return;

        const effectiveStatus = calculateStatusFromData(customer, state.payments);
        setStatus(effectiveStatus);

        const history = await getPaymentHistory(customer);
        setPaymentHistory(history);

        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('customer_id', customer.id);

        const paymentCount = payments?.length || 0;
        const policyStartDate = new Date(customer.inceptionDate);
        const today = new Date();
        const monthsSinceStart = ((today.getFullYear() - policyStartDate.getFullYear()) * 12) + (today.getMonth() - policyStartDate.getMonth());
        const monthsDue = monthsSinceStart - paymentCount;
        const premium = customer.totalPremium;
        const outstandingBalance = monthsDue > 0 ? monthsDue * premium : 0;

        setBalance({
            balance: outstandingBalance,
            monthsDue: monthsDue > 0 ? monthsDue : 0,
        });
    };

    const handleDeleteParticipant = async (participant: Participant) => {
        if (!customer) return;

        if (participant.relationship === 'Self') {
            alert('Cannot delete the main policyholder.');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${participant.firstName} ${participant.surname} from this policy?`)) {
            return;
        }

        try {
            const updatedParticipants = customer.participants.filter(p => p.id !== participant.id);
            const updatedCustomer = { ...customer, participants: updatedParticipants, lastUpdated: new Date().toISOString() };

            await supabaseService.saveCustomer(updatedCustomer);
            dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });

            alert('Participant deleted successfully.');
        } catch (error) {
            console.error('Error deleting participant:', error);
            alert('Error deleting participant. Please try again.');
        }
    };

    if (!customer) return <div className="text-center p-8">Customer not found. <Button onClick={() => navigate(-1)}>Go Back</Button></div>;

    const agent = state.agents.find(a => a.id === customer.assignedAgentId);

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-brand-text-primary sm:text-3xl sm:truncate">
                        {`${customer.firstName} ${customer.surname}`}
                    </h2>
                    <p className="mt-1 text-sm text-brand-text-secondary">Policy Number: {formatPolicyNumber(customer.policyNumber)}</p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
                    <Button variant="secondary" onClick={() => setModal('edit')}>Edit Details</Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = `sms:${customer.phone}`;
                            link.click();
                        }}
                    >
                        Text Customer
                    </Button>
                    <Button onClick={() => setModal('payment')}>Make Payment</Button>
                </div>
            </div>

            <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-brand-text-secondary">Policy Status</h4>
                        <PolicyStatusBadge status={status} className="mt-1 text-base" />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-brand-text-secondary">Outstanding Balance</h4>
                        <p className="text-lg font-bold text-brand-text-primary">${balance.balance.toFixed(2)}</p>
                        <p className="text-xs text-brand-text-secondary">({balance.monthsDue} months due)</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-brand-text-secondary">Total Premium</h4>
                        <p className="text-lg font-bold text-brand-text-primary">${customer.totalPremium.toFixed(2)} / month</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-brand-text-secondary">Assigned Agent</h4>
                        <p className="text-lg font-bold text-brand-text-primary">{agent ? `${agent.firstName} ${agent.surname}` : 'N/A'}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card title="Participants">
                        <ul className="divide-y divide-brand-border -m-6">
                            {customer.participants.map(p => (
                                <li key={p.id} className="py-3 px-6 flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-brand-text-primary">{`${p.firstName} ${p.surname}`}</p>
                                        <p className="text-sm text-brand-text-secondary">{p.relationship}</p>
                                        <p className="text-xs text-brand-text-secondary">{p.medicalPackage || MedicalPackage.NONE}</p>
                                        <p className="text-xs text-brand-text-secondary">{p.cashBackAddon || CashBackAddon.NONE}</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <ParticipantSuffix suffix={getParticipantSuffix(p, customer.participants)} />
                                        <button
                                            onClick={() => setEditingParticipant(p)}
                                            className="text-brand-pink hover:text-brand-light-pink text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        {p.relationship !== 'Self' && (
                                            <button
                                                onClick={() => handleDeleteParticipant(p)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <Button variant="secondary" className="mt-4 w-full" onClick={() => setModal('dependent')}>Add Participant</Button>
                    </Card>
                    <Card title="Payment History">
                        <ul className="divide-y divide-brand-border -m-6">
                            {paymentHistory.map((item: PaymentHistoryItem, index) => (
                                <li key={index} className="py-3 px-6 grid grid-cols-3 gap-4 items-center">
                                    <div>
                                        <p className="text-sm font-medium">{new Date(item.date).toLocaleDateString()}</p>
                                        <p className="text-xs text-brand-text-secondary">{item.description}</p>
                                    </div>
                                    <div className="text-sm text-center">
                                        {item.amount && `$${item.amount.toFixed(2)}`}
                                        {item.receiptFilename && <button onClick={() => setReceiptFile(item.receiptFilename!)} className="ml-2 text-brand-pink text-xs">(View Receipt)</button>}
                                    </div>
                                    <div className={`text-sm font-semibold text-right ${item.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>{item.status}</div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card title="Policy Details">
                        <dl className="grid grid-cols-1 gap-y-4">
                            <DetailItem label="Funeral Package" value={customer.funeralPackage} />
                            <DetailItem label="Inception Date" value={new Date(customer.inceptionDate).toLocaleDateString()} />
                            <DetailItem label="Cover Start Date" value={new Date(customer.coverDate).toLocaleDateString()} />
                            <Button variant="secondary" className="w-full mt-4" onClick={() => setModal('adjust')}>Adjust Policy</Button>
                        </dl>
                    </Card>
                    <Card title="Personal Details">
                        <dl className="grid grid-cols-1 gap-y-4">
                            <DetailItem label="ID Number" value={customer.idNumber} />
                            <DetailItem label="Date of Birth" value={new Date(customer.dateOfBirth).toLocaleDateString()} />
                            <DetailItem label="Phone" value={customer.phone} />
                            <DetailItem label="Email" value={customer.email} />
                            <DetailItem label="Address" value={`${customer.streetAddress}, ${customer.town}`} />
                        </dl>
                    </Card>
                </div>
            </div>

            {modal === 'payment' && <MakePaymentModal customer={customer} onClose={() => setModal(null)} />}
            {modal === 'edit' && <EditCustomerModal customer={customer} onClose={() => setModal(null)} />}
            {modal === 'dependent' && <AddDependentModal customer={customer} onClose={() => setModal(null)} />}
            {modal === 'adjust' && <PolicyAdjustmentModal customer={customer} onClose={() => setModal(null)} />}
            {editingParticipant && <EditParticipantModal customer={customer} participant={editingParticipant} onClose={() => setEditingParticipant(null)} />}
            {receiptFile && <ReceiptViewerModal filename={receiptFile} onClose={() => setReceiptFile(null)} />}
        </div>
    );
};

export default PolicyDetailsPage;