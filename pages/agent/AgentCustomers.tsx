import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Customer } from '../../types';
import Card from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import PolicyStatusBadge from '../../components/ui/PolicyStatusBadge';
import Button from '../../components/ui/Button';
import { supabase } from '../../utils/supabase';
import { formatPolicyNumber } from '../../utils/policyHelpers';
import { calculateStatusFromData } from '../../utils/statusHelpers';
import { exportCustomersToFile } from '../../utils/csvHelpers';

const AgentCustomers: React.FC = () => {
    const { user } = useAuth();
    const { state } = useData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [packageFilter, setPackageFilter] = useState<string>('all');
    const [dependentsFilter, setDependentsFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [customerBalances, setCustomerBalances] = useState<Record<number, { balance: number; monthsDue: number }>>({});
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set());

    const agentCustomers = useMemo(() => {
        if (!user) return [];
        return state.customers.filter(c => c.assignedAgentId === user.id);
    }, [state.customers, user]);

    useEffect(() => {
        loadBalances();
    }, [agentCustomers]);

    const loadBalances = async () => {
        const balances: Record<number, { balance: number; monthsDue: number }> = {};

        for (const customer of agentCustomers) {
            const { data: payments } = await supabase
                .from('payments')
                .select('*')
                .eq('customer_id', customer.id);

            const paymentCount = payments?.length || 0;
            const policyStartDate = new Date(customer.inceptionDate);
            const today = new Date();
            const monthsSinceStart = ((today.getFullYear() - policyStartDate.getFullYear()) * 12) + (today.getMonth() - policyStartDate.getMonth()) + 1;
            const monthsDue = monthsSinceStart - paymentCount;
            const outstandingBalance = monthsDue > 0 ? monthsDue * customer.totalPremium : 0;

            balances[customer.id] = {
                balance: outstandingBalance,
                monthsDue: monthsDue > 0 ? monthsDue : 0,
            };
        }

        setCustomerBalances(balances);
    };

    const uniquePackages = useMemo(() => {
        const packages = new Set(agentCustomers.map(c => c.funeralPackage));
        return Array.from(packages).sort();
    }, [agentCustomers]);

    const filteredCustomers = useMemo(() => {
        let filtered = agentCustomers;

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
            const nameA = `${a.firstName} ${a.surname}`.toLowerCase();
            const nameB = `${b.firstName} ${b.surname}`.toLowerCase();
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        return sorted;
    }, [searchTerm, statusFilter, packageFilter, dependentsFilter, sortOrder, agentCustomers, state.payments]);

    const handleExport = (format: 'csv' | 'xlsx') => {
        const customersToExport = selectedCustomerIds.size > 0
            ? agentCustomers.filter(c => selectedCustomerIds.has(c.id))
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

    if (!user) return null;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-brand-text-primary">My Customers</h2>
                    {selectedCustomerIds.size > 0 && (
                        <p className="text-sm text-brand-text-secondary mt-1">
                            {selectedCustomerIds.size} customer{selectedCustomerIds.size !== 1 ? 's' : ''} selected
                        </p>
                    )}
                </div>
                <Button onClick={() => handleExport('xlsx')}>
                    {selectedCustomerIds.size > 0 ? `Export ${selectedCustomerIds.size} Selected` : 'Export All'}
                </Button>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                }}>
                                    Name {sortOrder === 'asc' ? '↑' : '↓'}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Policy Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Phone</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Package</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Participants</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Premium</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Balance Due</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-brand-surface divide-y divide-brand-border">
                            {filteredCustomers.map((customer: Customer) => {
                                const customerBalance = customerBalances[customer.id] || { balance: 0, monthsDue: 0 };
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>{customer.funeralPackage}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary text-center cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>{customer.participants.length}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary font-semibold cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>${customer.totalPremium.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                                            {customerBalance.balance > 0 ? (
                                                <span className="font-semibold text-red-600">${customerBalance.balance.toFixed(2)} ({customerBalance.monthsDue} mo{customerBalance.monthsDue !== 1 ? 's' : ''})</span>
                                            ) : (
                                                <span className="text-green-600 font-semibold">Paid Up</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                                            <PolicyStatusBadge status={actualStatus} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/customers/${customer.id}`)}
                                                className="text-brand-pink hover:text-brand-light-pink mr-3"
                                            >
                                                View
                                            </button>
                                            <a
                                                href={`sms:${customer.phone}`}
                                                className="text-blue-600 hover:text-blue-800"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Text
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              </>
            </Card>
        </div>
    );
};

export default AgentCustomers;
