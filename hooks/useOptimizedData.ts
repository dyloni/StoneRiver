import { useMemo } from 'react';
import { Customer, Agent, Payment, PolicyStatus } from '../types';
import { calculateStatusFromData } from '../utils/statusHelpers';

/**
 * Performance-optimized hooks for data access
 * Provides memoized Maps and pre-calculated values to avoid O(n) lookups
 */

/**
 * Creates a Map of agent ID to Agent object for O(1) lookups
 * Replaces: state.agents.find(a => a.id === agentId) - O(n)
 */
export function useAgentMap(agents: Agent[]): Map<number, Agent> {
    return useMemo(() => {
        return new Map(agents.map(agent => [agent.id, agent]));
    }, [agents]);
}

/**
 * Creates a Map of customer ID to Customer object for O(1) lookups
 */
export function useCustomerMap(customers: Customer[]): Map<number, Customer> {
    return useMemo(() => {
        return new Map(customers.map(customer => [customer.id, customer]));
    }, [customers]);
}

/**
 * Pre-calculates and memoizes customer statuses
 * Avoids recalculating status for every render/filter operation
 *
 * Before: O(n*m) - calculate for each customer on each render
 * After: O(1) - simple Map lookup
 */
export function useCustomerStatusMap(
    customers: Customer[],
    payments: Payment[]
): Map<number, PolicyStatus> {
    return useMemo(() => {
        const statusMap = new Map<number, PolicyStatus>();

        customers.forEach(customer => {
            const status = calculateStatusFromData(customer, payments);
            statusMap.set(customer.id, status);
        });

        return statusMap;
    }, [customers, payments]);
}

/**
 * Pre-calculates customer statistics
 * Used by dashboard to avoid recalculating on every render
 */
export interface CustomerStats {
    total: number;
    active: number;
    suspended: number;
    overdue: number;
    inactive: number;
    cancelled: number;
    express: number;
}

export function useCustomerStats(
    customers: Customer[],
    statusMap: Map<number, PolicyStatus>
): CustomerStats {
    return useMemo(() => {
        const stats: CustomerStats = {
            total: customers.length,
            active: 0,
            suspended: 0,
            overdue: 0,
            inactive: 0,
            cancelled: 0,
            express: 0,
        };

        customers.forEach(customer => {
            const status = statusMap.get(customer.id);
            switch (status) {
                case PolicyStatus.ACTIVE:
                    stats.active++;
                    break;
                case PolicyStatus.SUSPENDED:
                    stats.suspended++;
                    break;
                case PolicyStatus.OVERDUE:
                    stats.overdue++;
                    break;
                case PolicyStatus.INACTIVE:
                    stats.inactive++;
                    break;
                case PolicyStatus.CANCELLED:
                    stats.cancelled++;
                    break;
                case PolicyStatus.EXPRESS:
                    stats.express++;
                    break;
            }
        });

        return stats;
    }, [customers, statusMap]);
}

/**
 * Creates a Map of customer ID to array of their payments
 * Useful for showing customer payment history without filtering entire array
 */
export function useCustomerPaymentsMap(payments: Payment[]): Map<number, Payment[]> {
    return useMemo(() => {
        const paymentMap = new Map<number, Payment[]>();

        payments.forEach(payment => {
            const customerId = payment.customer_id;
            if (!paymentMap.has(customerId)) {
                paymentMap.set(customerId, []);
            }
            paymentMap.get(customerId)!.push(payment);
        });

        // Sort payments by date (most recent first) for each customer
        paymentMap.forEach((customerPayments) => {
            customerPayments.sort((a, b) =>
                new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            );
        });

        return paymentMap;
    }, [payments]);
}

/**
 * Pre-calculates dependent counts for each customer
 * Avoids filtering participants array repeatedly
 */
export function useDependentCountMap(customers: Customer[]): Map<number, number> {
    return useMemo(() => {
        const countMap = new Map<number, number>();

        customers.forEach(customer => {
            const count = customer.participants?.filter(
                p => p.participantType !== 'Principal Member'
            ).length || 0;
            countMap.set(customer.id, count);
        });

        return countMap;
    }, [customers]);
}

/**
 * Groups customers by assigned agent
 * Useful for agent dashboards and analytics
 */
export function useCustomersByAgentMap(customers: Customer[]): Map<number, Customer[]> {
    return useMemo(() => {
        const agentMap = new Map<number, Customer[]>();

        customers.forEach(customer => {
            const agentId = customer.assignedAgentId;
            if (agentId) {
                if (!agentMap.has(agentId)) {
                    agentMap.set(agentId, []);
                }
                agentMap.get(agentId)!.push(customer);
            }
        });

        return agentMap;
    }, [customers]);
}

/**
 * Optimized filtering with pre-calculated data
 * Returns filtered customers with their pre-calculated status and agent
 */
export interface EnrichedCustomer extends Customer {
    _status?: PolicyStatus;
    _agent?: Agent;
    _dependentCount?: number;
}

export function useFilteredCustomers(
    customers: Customer[],
    statusMap: Map<number, PolicyStatus>,
    agentMap: Map<number, Agent>,
    dependentCountMap: Map<number, number>,
    filters: {
        searchTerm?: string;
        statusFilter?: string;
        agentFilter?: string;
    }
): EnrichedCustomer[] {
    return useMemo(() => {
        const { searchTerm = '', statusFilter = 'all', agentFilter = 'all' } = filters;

        return customers
            .filter(customer => {
                // Search filter
                if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    const matchesSearch =
                        customer.firstName.toLowerCase().includes(search) ||
                        customer.surname.toLowerCase().includes(search) ||
                        customer.policyNumber.toLowerCase().includes(search) ||
                        customer.phone?.toLowerCase().includes(search);

                    if (!matchesSearch) return false;
                }

                // Status filter
                if (statusFilter !== 'all') {
                    const customerStatus = statusMap.get(customer.id);
                    if (customerStatus !== statusFilter) return false;
                }

                // Agent filter
                if (agentFilter !== 'all') {
                    if (customer.assignedAgentId?.toString() !== agentFilter) return false;
                }

                return true;
            })
            .map(customer => ({
                ...customer,
                _status: statusMap.get(customer.id),
                _agent: agentMap.get(customer.assignedAgentId!),
                _dependentCount: dependentCountMap.get(customer.id),
            }));
    }, [customers, statusMap, agentMap, dependentCountMap, filters]);
}
