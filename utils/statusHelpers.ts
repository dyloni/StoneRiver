import { Customer, PolicyStatus, PaymentMethod, Payment } from '../types';
import { supabase } from './supabase';

export interface PaymentHistoryItem {
    date: string;
    description: string;
    amount: number | null;
    status: 'Paid' | 'Pending' | 'Overdue';
    paymentMethod?: PaymentMethod;
    receiptFilename?: string;
}

export const getPaymentHistory = async (customer: Customer): Promise<PaymentHistoryItem[]> => {
    const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('payment_date', { ascending: false });

    if (!payments) return [];

    return payments.map(payment => ({
        date: payment.payment_date,
        description: `Payment for ${payment.payment_period}`,
        amount: parseFloat(payment.payment_amount),
        status: 'Paid' as const,
        paymentMethod: payment.payment_method as PaymentMethod,
        receiptFilename: payment.receipt_filename,
    }));
};

export const calculatePolicyStatusFromPayments = async (customer: Customer): Promise<PolicyStatus> => {
    if (customer.status === PolicyStatus.CANCELLED) {
        return customer.status;
    }

    const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('payment_date', { ascending: false });

    const inceptionDate = new Date(customer.inceptionDate);
    const today = new Date();

    const monthsSinceInception = (today.getFullYear() - inceptionDate.getFullYear()) * 12
        + (today.getMonth() - inceptionDate.getMonth());

    const paymentCount = payments?.length || 0;
    const monthsBehind = monthsSinceInception - paymentCount;

    if (monthsBehind >= 2) {
        return PolicyStatus.SUSPENDED;
    }

    if (monthsBehind >= 1) {
        if (payments && payments.length > 0) {
            const lastPayment = payments[0];
            const lastPaymentDate = new Date(lastPayment.payment_date);
            const nextDueDate = new Date(lastPaymentDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            const daysLate = Math.floor((today.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysLate >= 7) {
                return PolicyStatus.OVERDUE;
            }
        } else {
            return PolicyStatus.OVERDUE;
        }
    }

    return PolicyStatus.ACTIVE;
};

export const getEffectivePolicyStatus = async (customer: Customer): Promise<PolicyStatus> => {
    return calculatePolicyStatusFromPayments(customer);
};

export const calculateStatusFromData = (customer: Customer, payments: Payment[]): PolicyStatus => {
    if (customer.status === PolicyStatus.CANCELLED) {
        return customer.status;
    }

    const inceptionDate = new Date(customer.inceptionDate);
    const today = new Date();

    const monthsSinceInception = (today.getFullYear() - inceptionDate.getFullYear()) * 12
        + (today.getMonth() - inceptionDate.getMonth());

    const customerPayments = payments.filter(p => p.customer_id === customer.id);
    const paymentCount = customerPayments.length;
    const monthsBehind = monthsSinceInception - paymentCount;

    if (monthsBehind >= 2) {
        return PolicyStatus.SUSPENDED;
    }

    if (monthsBehind >= 1) {
        if (customerPayments.length > 0) {
            const sortedPayments = [...customerPayments].sort((a, b) =>
                new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            );
            const lastPayment = sortedPayments[0];
            const lastPaymentDate = new Date(lastPayment.payment_date);
            const nextDueDate = new Date(lastPaymentDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            const daysLate = Math.floor((today.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysLate >= 7) {
                return PolicyStatus.OVERDUE;
            }
        } else {
            return PolicyStatus.OVERDUE;
        }
    }

    return PolicyStatus.ACTIVE;
};

export const updateCustomerStatusBasedOnPayments = async (customerId: number): Promise<void> => {
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

    if (customerError || !customer) {
        console.error('Error fetching customer:', customerError);
        return;
    }

    const customerObj: Customer = {
        id: customer.id,
        uuid: customer.uuid,
        policyNumber: customer.policy_number,
        firstName: customer.first_name,
        surname: customer.surname,
        inceptionDate: customer.inception_date,
        coverDate: customer.cover_date,
        status: customer.status,
        assignedAgentId: customer.assigned_agent_id,
        idNumber: customer.id_number,
        dateOfBirth: customer.date_of_birth,
        gender: customer.gender,
        phone: customer.phone,
        email: customer.email,
        streetAddress: customer.street_address,
        town: customer.town,
        postalAddress: customer.postal_address,
        funeralPackage: customer.funeral_package,
        participants: customer.participants || [],
        policyPremium: parseFloat(customer.policy_premium || 0),
        addonPremium: parseFloat(customer.addon_premium || 0),
        totalPremium: parseFloat(customer.total_premium || 0),
        premiumPeriod: customer.premium_period,
        latestReceiptDate: customer.latest_receipt_date,
        dateCreated: customer.date_created,
        lastUpdated: customer.last_updated,
    };

    const newStatus = await calculatePolicyStatusFromPayments(customerObj);

    if (newStatus !== customer.status && customer.status !== PolicyStatus.CANCELLED) {
        const { error: updateError } = await supabase
            .from('customers')
            .update({
                status: newStatus,
                last_updated: new Date().toISOString()
            })
            .eq('id', customerId);

        if (updateError) {
            console.error('Error updating customer status:', updateError);
        }
    }
};
