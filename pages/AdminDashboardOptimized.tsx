import React, { useMemo, memo } from 'react';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { PolicyStatus, RequestStatus } from '../types';
import TimePeriodSelector from '../components/analytics/TimePeriodSelector';
import {
    useAgentMap,
    useCustomerStatusMap,
    useCustomerStats,
    EnrichedCustomer,
} from '../hooks/useOptimizedData';

/**
 * Memoized stat card to prevent unnecessary re-renders
 */
const StatCard = memo<{
    title: string;
    value: number | string;
    borderColor: string;
}>(({ title, value, borderColor }) => (
    <Card className={`border-l-4 ${borderColor}`}>
        <div className="text-center">
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    </Card>
));

StatCard.displayName = 'StatCard';

/**
 * Memoized customer list item
 */
const RecentCustomerItem = memo<{
    customer: EnrichedCustomer;
    agentName?: string;
}>(({ customer, agentName }) => {
    const statusClassName = useMemo(() => {
        const status = customer._status;
        return `px-3 py-1 rounded-full text-sm font-medium ${
            status === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-800' :
            status === PolicyStatus.SUSPENDED ? 'bg-orange-100 text-orange-800' :
            status === PolicyStatus.OVERDUE ? 'bg-red-100 text-red-800' :
            status === PolicyStatus.CANCELLED ? 'bg-gray-100 text-gray-800' :
            status === PolicyStatus.EXPRESS ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
        }`;
    }, [customer._status]);

    return (
        <Link
            to={`/customers/${customer.id}`}
            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold">{customer.firstName} {customer.surname}</p>
                    <p className="text-sm text-gray-600">{customer.policyNumber}</p>
                    {agentName && (
                        <p className="text-xs text-gray-500">Agent: {agentName}</p>
                    )}
                </div>
                <span className={statusClassName}>
                    {customer._status}
                </span>
            </div>
        </Link>
    );
});

RecentCustomerItem.displayName = 'RecentCustomerItem';

/**
 * Optimized AdminDashboard component
 * Performance improvements:
 * - Pre-calculates all statuses once
 * - Uses aggregated stats instead of filtering multiple times
 * - Memoizes expensive calculations
 * - Prevents unnecessary re-renders with memo
 */
const AdminDashboardOptimized: React.FC = () => {
    const { state } = useData();
    const [timePeriod, setTimePeriod] = React.useState('all');

    // Pre-calculate Maps (O(n) once instead of O(n²) repeatedly)
    const agentMap = useAgentMap(state.agents);
    const statusMap = useCustomerStatusMap(state.customers, state.payments);

    // Calculate aggregated stats using pre-calculated status map
    const customerStats = useCustomerStats(state.customers, statusMap);

    // Calculate other stats
    const stats = useMemo(() => {
        const pendingRequests = state.requests.filter(r => r.status === RequestStatus.PENDING).length;
        const totalRevenue = state.payments.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0);

        return {
            ...customerStats,
            totalAgents: state.agents.length,
            pendingRequests,
            totalRevenue,
        };
    }, [customerStats, state.agents.length, state.requests, state.payments]);

    // Get recent customers with pre-calculated status
    const recentCustomers = useMemo(() => {
        return [...state.customers]
            .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
            .slice(0, 5)
            .map(customer => ({
                ...customer,
                _status: statusMap.get(customer.id),
                _agent: agentMap.get(customer.assignedAgentId!),
            }));
    }, [state.customers, statusMap, agentMap]);

    // Get pending requests
    const pendingRequests = useMemo(() => {
        return state.requests
            .filter(r => r.status === RequestStatus.PENDING)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [state.requests]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-brand-text-primary">Admin Dashboard</h1>
                <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Customers"
                    value={stats.total}
                    borderColor="border-gray-400"
                />
                <StatCard
                    title="Active Policies"
                    value={stats.active}
                    borderColor="border-green-500"
                />
                <StatCard
                    title="Total Agents"
                    value={stats.totalAgents}
                    borderColor="border-gray-500"
                />
                <StatCard
                    title="Pending Requests"
                    value={stats.pendingRequests}
                    borderColor="border-blue-500"
                />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Suspended"
                    value={stats.suspended}
                    borderColor="border-yellow-500"
                />
                <StatCard
                    title="Overdue"
                    value={stats.overdue}
                    borderColor="border-red-500"
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toFixed(2)}`}
                    borderColor="border-gray-600"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Customers */}
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-brand-text-primary">Recent Customers</h2>
                        <Link to="/customers" className="text-brand-primary hover:text-brand-primary-dark text-sm font-medium">
                            View All
                        </Link>
                    </div>
                    {recentCustomers.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No customers yet</p>
                    ) : (
                        <div className="space-y-2">
                            {recentCustomers.map(customer => (
                                <RecentCustomerItem
                                    key={customer.id}
                                    customer={customer}
                                    agentName={customer._agent ? `${customer._agent.firstName} ${customer._agent.surname}` : undefined}
                                />
                            ))}
                        </div>
                    )}
                </Card>

                {/* Pending Requests */}
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-brand-text-primary">Pending Requests</h2>
                        <Link to="/requests" className="text-brand-primary hover:text-brand-primary-dark text-sm font-medium">
                            View All
                        </Link>
                    </div>
                    {pendingRequests.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No pending requests</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingRequests.map(request => {
                                const customer = state.customers.find(c => c.id === request.customerId);
                                return (
                                    <Link
                                        key={request.id}
                                        to={`/requests`}
                                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{request.requestType}</p>
                                                {customer && (
                                                    <p className="text-sm text-gray-600">
                                                        {customer.firstName} {customer.surname}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500">
                                                    {new Date(request.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                                Pending
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboardOptimized;
