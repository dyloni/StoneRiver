import { supabase } from '../utils/supabase';
import { Customer, AppRequest, ChatMessage, Agent, Admin, Payment, Claim } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SupabaseService {
  private customersChannel: RealtimeChannel | null = null;
  private requestsChannel: RealtimeChannel | null = null;
  private messagesChannel: RealtimeChannel | null = null;
  private paymentsChannel: RealtimeChannel | null = null;
  private agentsChannel: RealtimeChannel | null = null;
  private claimsChannel: RealtimeChannel | null = null;

  async loadAgents(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading agents:', error);
      return [];
    }

    return (data || []).map((agent: any) => ({
      id: agent.id,
      firstName: agent.first_name,
      surname: agent.surname,
      email: agent.email,
      profilePictureUrl: agent.profile_picture_url,
      status: agent.status,
    }));
  }

  async loadAdmins(): Promise<Admin[]> {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading admins:', error);
      return [];
    }

    return (data || []).map((admin: any) => ({
      id: admin.id,
      firstName: admin.first_name,
      surname: admin.surname,
      email: admin.email,
      role: admin.role,
      profilePictureUrl: admin.profile_picture_url,
    }));
  }

  async loadCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading customers:', error);
      return [];
    }

    return (data || []).map((row) => this.transformCustomerFromDB(row));
  }

  async loadRequests(): Promise<AppRequest[]> {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading requests:', error);
      return [];
    }

    return (data || []).map((row) => this.transformRequestFromDB(row));
  }

  async loadMessages(): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    return (data || []).map((row) => this.transformMessageFromDB(row));
  }

  async loadPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading payments:', error);
      return [];
    }

    return data || [];
  }

  async loadClaims(): Promise<Claim[]> {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading claims:', error);
      return [];
    }

    return data || [];
  }

  async saveCustomer(customer: Customer): Promise<void> {
    const dbCustomer = this.transformCustomerToDB(customer);

    const { error } = await supabase
      .from('customers')
      .upsert(dbCustomer, { onConflict: 'id' });

    if (error) {
      console.error('Error saving customer:', error);
      throw error;
    }
  }

  async saveCustomers(customers: Customer[], onProgress?: (message: string) => void): Promise<void> {
    if (onProgress) onProgress('Preparing customer data...');

    const policyNumbers = customers.map(c => c.policyNumber);

    const { data: existingCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('id, policy_number')
      .in('policy_number', policyNumbers);

    if (fetchError) {
      console.error('Error fetching existing customers:', fetchError);
      throw fetchError;
    }

    const existingMap = new Map(
      (existingCustomers || []).map(c => [c.policy_number, c.id])
    );

    const dbCustomers = customers.map(customer => {
      const dbCustomer = this.transformCustomerToDB(customer);
      const existingId = existingMap.get(customer.policyNumber);

      if (existingId) {
        dbCustomer.id = existingId;
      } else {
        delete dbCustomer.id;
      }

      return dbCustomer;
    });

    const batchSize = 100;
    const totalBatches = Math.ceil(dbCustomers.length / batchSize);

    for (let i = 0; i < dbCustomers.length; i += batchSize) {
      const batch = dbCustomers.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      if (onProgress) {
        onProgress(`Saving batch ${currentBatch} of ${totalBatches} (${Math.min(i + batchSize, dbCustomers.length)} of ${dbCustomers.length} customers)...`);
      }

      const { error } = await supabase
        .from('customers')
        .upsert(batch, {
          onConflict: 'policy_number',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error upserting customers batch:', error);
        throw error;
      }
    }

    if (onProgress) onProgress('Import complete!');
  }

  async deleteCustomer(customerId: number): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  async saveRequest(request: AppRequest): Promise<void> {
    const dbRequest = this.transformRequestToDB(request);

    const { error } = await supabase
      .from('requests')
      .upsert(dbRequest, { onConflict: 'id' });

    if (error) {
      console.error('Error saving request:', error);
      throw error;
    }
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    const dbMessage = this.transformMessageToDB(message);

    const { error } = await supabase
      .from('messages')
      .upsert(dbMessage, { onConflict: 'id' });

    if (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  subscribeToCustomers(
    onInsert: (customer: Customer) => void,
    onUpdate: (customer: Customer) => void,
    onDelete: (id: number) => void
  ): void {
    this.customersChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customers' },
        (payload) => {
          const customer = this.transformCustomerFromDB(payload.new);
          onInsert(customer);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customers' },
        (payload) => {
          const customer = this.transformCustomerFromDB(payload.new);
          onUpdate(customer);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'customers' },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();
  }

  subscribeToRequests(
    onInsert: (request: AppRequest) => void,
    onUpdate: (request: AppRequest) => void,
    onDelete: (id: number) => void
  ): void {
    this.requestsChannel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        (payload) => {
          const request = this.transformRequestFromDB(payload.new);
          onInsert(request);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests' },
        (payload) => {
          const request = this.transformRequestFromDB(payload.new);
          onUpdate(request);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'requests' },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();
  }

  subscribeToMessages(
    onInsert: (message: ChatMessage) => void,
    onUpdate: (message: ChatMessage) => void,
    onDelete: (id: number | string) => void
  ): void {
    this.messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const message = this.transformMessageFromDB(payload.new);
          onInsert(message);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const message = this.transformMessageFromDB(payload.new);
          onUpdate(message);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();
  }

  subscribeToPayments(
    onInsert: (payment: Payment) => void,
    onUpdate: (payment: Payment) => void,
    onDelete: (id: number) => void
  ): void {
    this.paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        (payload) => {
          onInsert(payload.new as Payment);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments' },
        (payload) => {
          onUpdate(payload.new as Payment);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'payments' },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();
  }

  subscribeToAgents(
    onInsert: (agent: Agent) => void,
    onUpdate: (agent: Agent) => void,
    onDelete: (id: number) => void
  ): void {
    this.agentsChannel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agents' },
        (payload) => {
          const agent: Agent = {
            id: payload.new.id,
            firstName: payload.new.first_name,
            surname: payload.new.surname,
            email: payload.new.email,
            profilePictureUrl: payload.new.profile_picture_url,
          };
          onInsert(agent);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agents' },
        (payload) => {
          const agent: Agent = {
            id: payload.new.id,
            firstName: payload.new.first_name,
            surname: payload.new.surname,
            email: payload.new.email,
            profilePictureUrl: payload.new.profile_picture_url,
          };
          onUpdate(agent);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'agents' },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();
  }

  subscribeToClaims(
    onInsert: (claim: Claim) => void,
    onUpdate: (claim: Claim) => void,
    onDelete: (id: number) => void
  ): void {
    this.claimsChannel = supabase
      .channel('claims-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'claims' },
        (payload) => {
          onInsert(payload.new as Claim);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'claims' },
        (payload) => {
          onUpdate(payload.new as Claim);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'claims' },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();
  }

  unsubscribeAll(): void {
    if (this.customersChannel) {
      supabase.removeChannel(this.customersChannel);
      this.customersChannel = null;
    }
    if (this.requestsChannel) {
      supabase.removeChannel(this.requestsChannel);
      this.requestsChannel = null;
    }
    if (this.messagesChannel) {
      supabase.removeChannel(this.messagesChannel);
      this.messagesChannel = null;
    }
    if (this.paymentsChannel) {
      supabase.removeChannel(this.paymentsChannel);
      this.paymentsChannel = null;
    }
    if (this.agentsChannel) {
      supabase.removeChannel(this.agentsChannel);
      this.agentsChannel = null;
    }
    if (this.claimsChannel) {
      supabase.removeChannel(this.claimsChannel);
      this.claimsChannel = null;
    }
  }

  private transformCustomerFromDB(row: any): Customer {
    return {
      id: row.id,
      uuid: row.uuid,
      policyNumber: row.policy_number,
      firstName: row.first_name,
      surname: row.surname,
      inceptionDate: row.inception_date,
      coverDate: row.cover_date,
      status: row.status,
      assignedAgentId: row.assigned_agent_id,
      idNumber: row.id_number,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      phone: row.phone,
      email: row.email,
      streetAddress: row.street_address,
      town: row.town,
      postalAddress: row.postal_address,
      funeralPackage: row.funeral_package,
      participants: row.participants || [],
      policyPremium: parseFloat(row.policy_premium || 0),
      addonPremium: parseFloat(row.addon_premium || 0),
      totalPremium: parseFloat(row.total_premium || 0),
      premiumPeriod: row.premium_period,
      latestReceiptDate: row.latest_receipt_date,
      dateCreated: row.date_created,
      lastUpdated: row.last_updated,
    };
  }

  private transformCustomerToDB(customer: Customer): any {
    return {
      id: customer.id,
      uuid: customer.uuid,
      policy_number: customer.policyNumber || '',
      first_name: customer.firstName || '',
      surname: customer.surname || '',
      inception_date: customer.inceptionDate || new Date().toISOString(),
      cover_date: customer.coverDate || new Date().toISOString(),
      status: customer.status || 'Active',
      assigned_agent_id: customer.assignedAgentId,
      id_number: customer.idNumber || '',
      date_of_birth: customer.dateOfBirth || new Date().toISOString(),
      gender: customer.gender || 'Male',
      phone: customer.phone || '',
      email: customer.email || '',
      street_address: customer.streetAddress || '',
      town: customer.town || '',
      postal_address: customer.postalAddress || '',
      funeral_package: customer.funeralPackage || 'Standard',
      participants: customer.participants || [],
      policy_premium: customer.policyPremium || 0,
      addon_premium: customer.addonPremium || 0,
      total_premium: customer.totalPremium || 0,
      premium_period: customer.premiumPeriod || '',
      latest_receipt_date: customer.latestReceiptDate,
      date_created: customer.dateCreated || new Date().toISOString(),
      last_updated: customer.lastUpdated || new Date().toISOString(),
    };
  }

  private transformRequestFromDB(row: any): AppRequest {
    const baseRequest = {
      id: row.id,
      agentId: row.agent_id,
      status: row.status,
      createdAt: row.created_at_app,
      adminNotes: row.admin_notes,
    };

    switch (row.request_type) {
      case 'New Policy':
        return {
          ...baseRequest,
          requestType: row.request_type,
          customerData: row.customer_data,
          idPhotoFilename: row.id_photo_filename,
          paymentAmount: parseFloat(row.payment_amount || 0),
          paymentMethod: row.payment_method,
          receiptFilename: row.receipt_filename,
        } as any;
      case 'Edit Customer Details':
        return {
          ...baseRequest,
          requestType: row.request_type,
          customerId: row.customer_id,
          oldValues: row.old_values,
          newValues: row.new_values,
        } as any;
      case 'Add Dependent':
        return {
          ...baseRequest,
          requestType: row.request_type,
          customerId: row.customer_id,
          dependentData: row.dependent_data,
        } as any;
      case 'Policy Upgrade':
      case 'Policy Downgrade':
        return {
          ...baseRequest,
          requestType: row.request_type,
          customerId: row.customer_id,
          details: row.details,
        } as any;
      case 'Make Payment':
        return {
          ...baseRequest,
          requestType: row.request_type,
          customerId: row.customer_id,
          paymentAmount: parseFloat(row.payment_amount || 0),
          paymentType: row.payment_type,
          paymentMethod: row.payment_method,
          paymentPeriod: row.payment_period,
          receiptFilename: row.receipt_filename,
        } as any;
      default:
        throw new Error(`Unknown request type: ${row.request_type}`);
    }
  }

  private transformRequestToDB(request: AppRequest): any {
    const baseRequest = {
      id: request.id,
      agent_id: request.agentId,
      status: request.status,
      request_type: request.requestType,
      admin_notes: request.adminNotes,
      created_at_app: request.createdAt,
    };

    switch (request.requestType) {
      case 'New Policy':
        return {
          ...baseRequest,
          customer_data: request.customerData,
          id_photo_filename: request.idPhotoFilename,
          payment_amount: request.paymentAmount,
          payment_method: request.paymentMethod,
          receipt_filename: request.receiptFilename,
        };
      case 'Edit Customer Details':
        return {
          ...baseRequest,
          customer_id: request.customerId,
          old_values: request.oldValues,
          new_values: request.newValues,
        };
      case 'Add Dependent':
        return {
          ...baseRequest,
          customer_id: request.customerId,
          dependent_data: request.dependentData,
        };
      case 'Policy Upgrade':
      case 'Policy Downgrade':
        return {
          ...baseRequest,
          customer_id: request.customerId,
          details: request.details,
        };
      case 'Make Payment':
        return {
          ...baseRequest,
          customer_id: request.customerId,
          payment_amount: request.paymentAmount,
          payment_type: request.paymentType,
          payment_method: request.paymentMethod,
          payment_period: request.paymentPeriod,
          receipt_filename: request.receiptFilename,
        };
    }
  }

  private transformMessageFromDB(row: any): ChatMessage {
    return {
      id: row.id,
      senderId: this.parseUserId(row.sender_id),
      senderName: row.sender_name,
      recipientId: this.parseUserId(row.recipient_id),
      text: row.text,
      timestamp: row.timestamp,
      status: row.status,
    };
  }

  private transformMessageToDB(message: ChatMessage): any {
    return {
      id: message.id,
      sender_id: String(message.senderId),
      sender_name: message.senderName,
      recipient_id: String(message.recipientId),
      text: message.text,
      timestamp: message.timestamp,
      status: message.status,
    };
  }

  private parseUserId(id: string): number | 'admin' | 'broadcast' {
    if (id === 'admin' || id === 'broadcast') return id;
    return parseInt(id, 10);
  }
}

export const supabaseService = new SupabaseService();
