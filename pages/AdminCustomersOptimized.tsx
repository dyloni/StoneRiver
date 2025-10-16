import React, { useState, useMemo, memo } from 'react';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PolicyStatus } from '../types';
import { formatPolicyNumber } from '../utils/policyHelpers';
import UploadCustomersModal from '../components/modals/UploadCustomersModal';
import BulkSMSModal from '../components/modals/BulkSMSModal';
import {
    useAgentMap,
    useCustomerStatusMap,
    useDependentCountMap,
    useFilteredCustomers,
    EnrichedCustomer,
} from '../hooks/useOptimizedData';

/**
 * Memoized customer row component to prevent unnecessary re-renders
 * Only re-renders when the specific customer data changes
 */
const CustomerRow = memo<{
    customer: EnrichedCustomer;
    onCustomerClick?: (id: number) => void;
}>(({ customer, onCustomerClick }) => {
    const actualStatus = customer._status || PolicyStatus.INACTIVE;
    const agent = customer._agent;
    const dependentCount = customer._dependentCount || 0;

    const statusClassName = useMemo(() => {
        return `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            actualStatus === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-800' :
            actualStatus === PolicyStatus.SUSPENDED ? 'bg-orange-100 text-orange-800' :
            actualStatus === PolicyStatus.OVERDUE ? 'bg-red-100 text-red-800' :
            actualStatus === PolicyStatus.CANCELLED ? 'bg-gray-100 text-gray-800' :
            actualStatus === PolicyStatus.EXPRESS ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
        }`;
    }, [actualStatus]);

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-4">
                <Link
                    to={`/customers/${customer.id}`}
                    className="block"
                    onClick={(e) => {
                        if (onCustomerClick) {
                            e.preventDefault();
                            onCustomerClick(customer.id);
                        }
                    }}
                >
                    <div className="font-medium text-brand-primary hover:text-brand-primary-dark">
                        {customer.firstName} {customer.surname}
                    </div>
                    <div className="text-xs text-gray-500">{formatPolicyNumber(customer.policyNumber)}</div>
                </Link>
            </td>
            <td className="px-4 py-4 text-sm text-gray-500">
                {customer.phone || 'N/A'}
            </td>
            <td className="px-4 py-4 text-sm text-gray-500">
                {agent ? `${agent.firstName} ${agent.surname}` : 'N/A'}
            </td>
            <td className="px-4 py-4 text-sm text-gray-900 text-center">
                {dependentCount}
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <span className={statusClassName}>
                    {actualStatus}
                </span>
            </td>
            <td className="px-4 py-4 text-sm text-gray-900">
                ${customer.totalPremium?.toFixed(2) || '0.00'}
            </td>
        </tr>
    );
});

CustomerRow.displayName = 'CustomerRow';

/**
 * Memoized mobile customer card component
 */
const CustomerCard = memo<{
    customer: EnrichedCustomer;
}>(({ customer }) => {
    const actualStatus = customer._status || PolicyStatus.INACTIVE;
    const agent = customer._agent;
    const dependentCount = customer._dependentCount || 0;

    const statusClassName = useMemo(() => {
        return `px-2 py-1 text-xs font-semibold rounded-full ${
            actualStatus === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-800' :
            actualStatus === PolicyStatus.SUSPENDED ? 'bg-orange-100 text-orange-800' :
            actualStatus === PolicyStatus.OVERDUE ? 'bg-red-100 text-red-800' :
            actualStatus === PolicyStatus.CANCELLED ? 'bg-gray-100 text-gray-800' :
            actualStatus === PolicyStatus.EXPRESS ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
        }`;
    }, [actualStatus]);

    return (
        <Link
            to={`/customers/${customer.id}`}
            className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                        {customer.firstName} {customer.surname}
                    </div>
                    <div className="text-xs text-gray-500">{formatPolicyNumber(customer.policyNumber)}</div>
                </div>
                <span className={statusClassName}>
                    {actualStatus}
                </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
                <div>{customer.phone || 'No phone'}</div>
                <div>Agent: {agent ? `${agent.firstName} ${agent.surname}` : 'Unassigned'}</div>
                <div>{dependentCount} dependent{dependentCount !== 1 ? 's' : ''}</div>
                <div className="font-medium text-gray-900">${customer.totalPremium?.toFixed(2) || '0.00'}/month</div>
            </div>
        </Link>
    );
});

CustomerCard.displayName = 'CustomerCard';

/**
 * Optimized AdminCustomers component
 * Performance improvements:
 * - Pre-calculates all customer statuses once
 * - Uses Map lookups instead of array.find() - O(1) vs O(n)
 * - Memoizes filtered results
 * - Memoized row components prevent unnecessary re-renders
 * - Single pass through data for filtering
 */
const AdminCustomersOptimized: React.FC = () => {
    const { state } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [agentFilter, setAgentFilter] = useState<string>('all');
    const [showUploadCustomers, setShowUploadCustomers] = useState(false);
    const [showBulkSMS, setShowBulkSMS] = useState(false);

    // Pre-calculate all Maps and status data once
    // These only recalculate when underlying data changes
    const agentMap = useAgentMap(state.agents);
    const statusMap = useCustomerStatusMap(state.customers, state.payments);
    const dependentCountMap = useDependentCountMap(state.customers);

    // Optimized filtering - uses pre-calculated data
    const filteredCustomers = useFilteredCustomers(
        state.customers,
        statusMap,
        agentMap,
        dependentCountMap,
        { searchTerm, statusFilter, agentFilter }
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-brand-text-primary">All Customers</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setShowBulkSMS(true)} variant="outline" size="sm">
                        Send SMS
                    </Button>
                    <Button onClick={() => setShowUploadCustomers(true)} size="sm">
                        Import Data
                    </Button>
                </div>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Search by name, policy number, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="all">All Statuses</option>
                        <option value={PolicyStatus.ACTIVE}>Active</option>
                        <option value={PolicyStatus.SUSPENDED}>Suspended</option>
                        <option value={PolicyStatus.OVERDUE}>Overdue</option>
                        <option value={PolicyStatus.INACTIVE}>Inactive</option>
                        <option value={PolicyStatus.CANCELLED}>Cancelled</option>
                        <option value={PolicyStatus.EXPRESS}>Express</option>
                    </select>
                    <select
                        value={agentFilter}
                        onChange={(e) => setAgentFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="all">All Agents</option>
                        {state.agents.map(agent => (
                            <option key={agent.id} value={agent.id.toString()}>
                                {agent.firstName} {agent.surname}
                            </option>
                        ))}
                    </select>
                </div>

                {filteredCustomers.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">
                        {searchTerm || statusFilter !== 'all' || agentFilter !== 'all'
                            ? 'No customers found matching your criteria'
                            : 'No customers yet'}
                    </p>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Agent
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dependents
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Premium
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCustomers.map(customer => (
                                        <CustomerRow key={customer.id} customer={customer} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {filteredCustomers.map(customer => (
                                <CustomerCard key={customer.id} customer={customer} />
                            ))}
                        </div>
                    </>
                )}
            </Card>

            <div className="text-sm text-gray-500 text-center">
                Showing {filteredCustomers.length} of {state.customers.length} customers
            </div>

            {showUploadCustomers && (
                <UploadCustomersModal onClose={() => setShowUploadCustomers(false)} />
            )}

            {showBulkSMS && (
                <BulkSMSModal customers={state.customers} onClose={() => setShowBulkSMS(false)} />
            )}
        </div>
    );
};

export default AdminCustomersOptimized;
