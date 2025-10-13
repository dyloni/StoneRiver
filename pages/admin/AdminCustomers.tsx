import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Customer } from '../../types';
import Card from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import PolicyStatusBadge from '../../components/ui/PolicyStatusBadge';
import Button from '../../components/ui/Button';
import { exportCustomersToFile } from '../../utils/csvHelpers';
import UploadCustomersModal from '../../components/modals/UploadCustomersModal';
import UploadDependentsModal from '../../components/modals/UploadDependentsModal';
import UploadReceiptsModal from '../../components/modals/UploadReceiptsModal';
import BulkSMSModal from '../../components/modals/BulkSMSModal';
import AssignAgentModal from '../../components/modals/AssignAgentModal';
import { formatPolicyNumber } from '../../utils/policyHelpers';
import { calculateStatusFromData } from '../../utils/statusHelpers';
import { supabaseService } from '../../services/supabaseService';


const AdminCustomers: React.FC = () => {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [agentFilter, setAgentFilter] = useState<string>('all');
    const [packageFilter, setPackageFilter] = useState<string>('all');
    const [dependentsFilter, setDependentsFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'agent'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploadDependentsModalOpen, setIsUploadDependentsModalOpen] = useState(false);
    const [isUploadReceiptsModalOpen, setIsUploadReceiptsModalOpen] = useState(false);
    const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set());
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const uniquePackages = useMemo(() => {
        const packages = new Set(state.customers.map(c => c.funeralPackage));
        return Array.from(packages).sort();
    }, [state.customers]);

    const filteredCustomers = useMemo(() => {
        let filtered = state.customers;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                `${c.firstName} ${c.surname}`.toLowerCase().includes(lowercasedTerm) ||
                c.policyNumber.toLowerCase().includes(lowercasedTerm)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => {
                const actualStatus = calculateStatusFromData(c, state.payments);
                return actualStatus === statusFilter;
            });
        }

        if (agentFilter !== 'all') {
            filtered = filtered.filter(c => c.assignedAgentId?.toString() === agentFilter);
        }

        if (packageFilter !== 'all') {
            filtered = filtered.filter(c => c.funeralPackage === packageFilter);
        }

        if (dependentsFilter !== 'all') {
            if (dependentsFilter === 'with') {
                filtered = filtered.filter(c => c.participants.length > 1);
            } else if (dependentsFilter === 'without') {
                filtered = filtered.filter(c => c.participants.length === 1);
            }
        }

        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'name') {
                const nameA = `${a.firstName} ${a.surname}`.toLowerCase();
                const nameB = `${b.firstName} ${b.surname}`.toLowerCase();
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            } else {
                const agentA = state.agents.find(ag => ag.id === a.assignedAgentId);
                const agentB = state.agents.find(ag => ag.id === b.assignedAgentId);
                const agentNameA = agentA ? `${agentA.firstName} ${agentA.surname}`.toLowerCase() : '';
                const agentNameB = agentB ? `${agentB.firstName} ${agentB.surname}`.toLowerCase() : '';
                return sortOrder === 'asc' ? agentNameA.localeCompare(agentNameB) : agentNameB.localeCompare(agentNameA);
            }
        });

        return sorted;
    }, [searchTerm, statusFilter, agentFilter, packageFilter, dependentsFilter, sortBy, sortOrder, state.customers, state.agents, state.payments]);

    const handleExport = (format: 'csv' | 'xlsx') => {
        const customersToExport = selectedCustomerIds.size > 0
            ? state.customers.filter(c => selectedCustomerIds.has(c.id))
            : filteredCustomers;

        if (customersToExport.length === 0) {
            alert('No customers to export.');
            return;
        }

        exportCustomersToFile(customersToExport, state.agents, format);
    };

    const handleSelectAll = () => {
        if (selectedCustomerIds.size === filteredCustomers.length) {
            setSelectedCustomerIds(new Set());
        } else {
            setSelectedCustomerIds(new Set(filteredCustomers.map(c => c.id)));
        }
    };

    const handleSelectCustomer = (customerId: number) => {
        const newSelected = new Set(selectedCustomerIds);
        if (newSelected.has(customerId)) {
            newSelected.delete(customerId);
        } else {
            newSelected.add(customerId);
        }
        setSelectedCustomerIds(newSelected);
    };

    const handleAssignAgent = async (agentId: number | null) => {
        const selectedCustomers = state.customers.filter(c => selectedCustomerIds.has(c.id));

        if (selectedCustomers.length === 0) {
            alert('Please select customers to reassign');
            return;
        }

        try {
            for (const customer of selectedCustomers) {
                const updatedCustomer = { ...customer, assignedAgentId: agentId };
                await supabaseService.updateCustomer(updatedCustomer);
                dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
            }

            setIsAssignModalOpen(false);
            setSelectedCustomerIds(new Set());
            alert(`Successfully reassigned ${selectedCustomers.length} customer${selectedCustomers.length !== 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Error reassigning customers:', error);
            alert('Error reassigning customers. Please try again.');
        }
    };
    
    const handleUploadSuccess = async (customers: Customer[]) => {
        try {
            console.log('Attempting to save customers:', customers);
            await supabaseService.saveCustomers(customers);
            customers.forEach(customer => {
                const existing = state.customers.find(c => c.id === customer.id);
                if (existing) {
                    dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
                } else {
                    dispatch({ type: 'BULK_ADD_CUSTOMERS', payload: [customer] });
                }
            });
            setIsUploadModalOpen(false);
            alert(`Successfully imported ${customers.length} customer(s)`);
        } catch (error: any) {
            console.error('Error saving customers:', error);
            console.error('Error details:', error?.message, error?.details, error?.hint);
            alert(`Error saving customers to database: ${error?.message || 'Please try again.'}`);
        }
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        const confirmMessage = `Are you sure you want to delete ${customer.firstName} ${customer.surname}?\n\nPolicy: ${customer.policyNumber}\n\nThis action cannot be undone.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            await supabaseService.deleteCustomer(customer.id);
            dispatch({ type: 'DELETE_CUSTOMER', payload: customer.id });
            alert('Customer deleted successfully');
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Error deleting customer. Please try again.');
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-brand-text-primary">All Customers</h2>
                    {selectedCustomerIds.size > 0 && (
                        <p className="text-sm text-brand-text-secondary mt-1">
                            {selectedCustomerIds.size} customer{selectedCustomerIds.size !== 1 ? 's' : ''} selected
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)}>Import Customers</Button>
                    <Button variant="secondary" onClick={() => setIsUploadDependentsModalOpen(true)}>Import Dependents</Button>
                    <Button variant="secondary" onClick={() => setIsUploadReceiptsModalOpen(true)}>Import Receipts</Button>
                    <Button variant="secondary" onClick={() => setIsSMSModalOpen(true)}>Send Bulk SMS</Button>
                    {selectedCustomerIds.size > 0 && (
                        <Button variant="secondary" onClick={() => setIsAssignModalOpen(true)}>
                            Assign Agent
                        </Button>
                    )}
                    <Button onClick={() => handleExport('xlsx')}>
                        {selectedCustomerIds.size > 0 ? `Export ${selectedCustomerIds.size} Selected` : 'Export All'}
                    </Button>
                </div>
            </div>
            <Card className="p-0">
              <>
                <div className="p-4 space-y-4">
                    <input
                        type="text"
                        placeholder="Search customers by name or policy number..."
                        className="block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-brand-text-secondary mb-1">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="block w-full px-3 py-2 text-sm text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Grace Period">Grace Period</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Lapsed">Lapsed</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-brand-text-secondary mb-1">Agent</label>
                            <select
                                value={agentFilter}
                                onChange={(e) => setAgentFilter(e.target.value)}
                                className="block w-full px-3 py-2 text-sm text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            >
                                <option value="all">All Agents</option>
                                {state.agents.map(agent => (
                                    <option key={agent.id} value={agent.id.toString()}>
                                        {agent.firstName} {agent.surname}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-brand-text-secondary mb-1">Policy Type</label>
                            <select
                                value={packageFilter}
                                onChange={(e) => setPackageFilter(e.target.value)}
                                className="block w-full px-3 py-2 text-sm text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            >
                                <option value="all">All Packages</option>
                                {uniquePackages.map(pkg => (
                                    <option key={pkg} value={pkg}>{pkg}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-brand-text-secondary mb-1">Dependents</label>
                            <select
                                value={dependentsFilter}
                                onChange={(e) => setDependentsFilter(e.target.value)}
                                className="block w-full px-3 py-2 text-sm text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            >
                                <option value="all">All Customers</option>
                                <option value="with">With Dependents</option>
                                <option value="without">Without Dependents</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedCustomerIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => {
                                    if (sortBy === 'name') {
                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                    } else {
                                        setSortBy('name');
                                        setSortOrder('asc');
                                    }
                                }}>
                                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Policy Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Phone</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => {
                                    if (sortBy === 'agent') {
                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                    } else {
                                        setSortBy('agent');
                                        setSortOrder('asc');
                                    }
                                }}>
                                    Agent {sortBy === 'agent' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-brand-surface divide-y divide-brand-border">
                            {filteredCustomers.map((customer: Customer) => {
                                const agent = state.agents.find(a => a.id === customer.assignedAgentId);
                                const actualStatus = calculateStatusFromData(customer, state.payments);
                                return (
                                    <tr key={customer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomerIds.has(customer.id)}
                                                onChange={() => handleSelectCustomer(customer.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-text-primary cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>{`${customer.firstName} ${customer.surname}`}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>{formatPolicyNumber(customer.policyNumber)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">
                                            <a href={`sms:${customer.phone}`} className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                                                {customer.phone}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                                            <PolicyStatusBadge status={actualStatus} />
                                        </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>{agent ? `${agent.firstName} ${agent.surname}` : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/customers/${customer.id}`)}
                                                className="text-brand-pink hover:text-brand-light-pink mr-3"
                                            >
                                                View
                                            </button>
                                            <a
                                                href={`sms:${customer.phone}`}
                                                className="text-blue-600 hover:text-blue-800 mr-3"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Text
                                            </a>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCustomer(customer);
                                                }}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              </>
            </Card>
             {isUploadModalOpen && (
                <UploadCustomersModal
                    onClose={() => setIsUploadModalOpen(false)}
                    onUploadSuccess={handleUploadSuccess}
                />
            )}
            {isUploadDependentsModalOpen && (
                <UploadDependentsModal
                    onClose={() => setIsUploadDependentsModalOpen(false)}
                />
            )}
            {isUploadReceiptsModalOpen && (
                <UploadReceiptsModal
                    onClose={() => setIsUploadReceiptsModalOpen(false)}
                />
            )}
            {isSMSModalOpen && (
                <BulkSMSModal
                    customers={state.customers}
                    onClose={() => setIsSMSModalOpen(false)}
                />
            )}
            {isAssignModalOpen && (
                <AssignAgentModal
                    customers={state.customers.filter(c => selectedCustomerIds.has(c.id))}
                    agents={state.agents}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={handleAssignAgent}
                />
            )}
        </div>
    );
};

export default AdminCustomers;
