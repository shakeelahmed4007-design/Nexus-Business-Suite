import { supabaseAdmin } from '../config/supabaseAdmin';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerFilterQuery } from '../models/customer';
import { PhoneValidator } from '../validators/phoneValidator';
import { EmailValidator } from '../validators/emailValidator';
import { ActivityLogService } from './activityLogService';
import { toSafeUUID } from '../utils/uuidHelper';

export class CustomerService {
  private activityLog = new ActivityLogService();

  async createCustomer(userId: string, shopId: string, data: CreateCustomerRequest): Promise<Customer> {
    const safeShopId = toSafeUUID(shopId);
    const safeUserId = toSafeUUID(userId);

    if (!data.firstName || !data.lastName) {
      throw new Error('firstName and lastName are required');
    }
    if (data.email) EmailValidator.validate(data.email);
    if (data.phone) PhoneValidator.validate(data.phone);

    const formattedPhone = data.phone ? PhoneValidator.format(data.phone) : undefined;
    const cleanEmail = data.email ? data.email.toLowerCase().trim() : undefined;

    // Check uniqueness per shop
    if (cleanEmail || formattedPhone) {
      let existingQuery = supabaseAdmin
        .from('customers')
        .select('id')
        .eq('shop_id', safeShopId)
        .is('deleted_at', null);

      if (cleanEmail && formattedPhone) {
        existingQuery = existingQuery.or(`email.eq."${cleanEmail}",phone.eq."${formattedPhone}"`);
      } else if (cleanEmail) {
        existingQuery = existingQuery.eq('email', cleanEmail);
      } else if (formattedPhone) {
        existingQuery = existingQuery.eq('phone', formattedPhone);
      }

      const { data: existing } = await existingQuery.maybeSingle();
      if (existing) {
        throw new Error('A customer with this email or phone number already exists in this shop');
      }
    }

    const { data: newCustomer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        shop_id: safeShopId,
        created_by_id: safeUserId,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        email: cleanEmail,
        phone: formattedPhone,
        company_name: data.companyName,
        customer_type: data.customerType || 'Individual',
        address: data.address,
        city: data.city,
        country: data.country,
        total_order_value: 0,
        total_orders: 0,
        customer_status: 'Active',
        credit_limit: data.creditLimit || 0,
        payment_terms: data.paymentTerms || 'Cash',
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newCustomer) {
      throw new Error(error?.message || 'Failed to create customer');
    }

    await this.activityLog.log(userId, shopId, 'CREATE', 'Customers', newCustomer.id, {
      action: 'Customer created',
      name: `${data.firstName} ${data.lastName}`,
    });

    return this.formatCustomer(newCustomer);
  }

  async getCustomers(
    userId: string,
    shopId: string,
    query: CustomerFilterQuery,
    userRole?: string
  ): Promise<{ customers: Customer[]; total: number; page: number; pages: number }> {
    const safeShopId = toSafeUUID(shopId);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    let dbQuery = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    const isSuperAdmin = userRole === 'super_admin';
    const isDefaultOrAll = !shopId || shopId === 'all' || safeShopId === '00000000-0000-0000-0000-000000000001';

    if (!isSuperAdmin || !isDefaultOrAll) {
      dbQuery = dbQuery.eq('shop_id', safeShopId);
    }

    if (query.search) {
      const s = query.search.trim();
      dbQuery = dbQuery.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,company_name.ilike.%${s}%`
      );
    }
    if (query.type) dbQuery = dbQuery.eq('customer_type', query.type);
    if (query.status) dbQuery = dbQuery.eq('customer_status', query.status);
    if (query.paymentTerms) dbQuery = dbQuery.eq('payment_terms', query.paymentTerms);
    if (query.dateFrom) dbQuery = dbQuery.gte('created_at', query.dateFrom);
    if (query.dateTo) dbQuery = dbQuery.lte('created_at', query.dateTo);

    dbQuery = dbQuery.order('created_at', { ascending: false });
    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw new Error(error.message);

    const total = count || 0;
    return {
      customers: (data || []).map((c) => this.formatCustomer(c)),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async getCustomer(userId: string, shopId: string, customerId: string, userRole?: string): Promise<any> {
    const safeShopId = toSafeUUID(shopId);
    let dbQuery = supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .is('deleted_at', null);

    if (userRole !== 'super_admin') {
      dbQuery = dbQuery.eq('shop_id', safeShopId);
    }

    const { data: customer, error } = await dbQuery.single();

    if (error || !customer) throw new Error('Customer not found or unauthorized');

    // Fetch related tasks
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('linked_entity', 'customer')
      .eq('linked_entity_value', customerId)
      .is('deleted_at', null);

    return {
      ...this.formatCustomer(customer),
      tasks: tasks || [],
      orderHistorySummary: {
        totalOrders: customer.total_orders || 0,
        totalOrderValue: Number(customer.total_order_value || 0),
        lastOrderDate: customer.last_order_date,
      },
    };
  }

  async updateCustomer(userId: string, shopId: string, customerId: string, data: UpdateCustomerRequest): Promise<Customer> {
    await this.getCustomer(userId, shopId, customerId); // Ownership check

    if (data.email) EmailValidator.validate(data.email);
    if (data.phone) PhoneValidator.validate(data.phone);

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.firstName !== undefined) updatePayload.first_name = data.firstName.trim();
    if (data.lastName !== undefined) updatePayload.last_name = data.lastName.trim();
    if (data.email !== undefined) updatePayload.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) updatePayload.phone = PhoneValidator.format(data.phone);
    if (data.companyName !== undefined) updatePayload.company_name = data.companyName;
    if (data.customerType !== undefined) updatePayload.customer_type = data.customerType;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.city !== undefined) updatePayload.city = data.city;
    if (data.country !== undefined) updatePayload.country = data.country;
    if (data.customerStatus !== undefined) updatePayload.customer_status = data.customerStatus;
    if (data.creditLimit !== undefined) updatePayload.credit_limit = data.creditLimit;
    if (data.paymentTerms !== undefined) updatePayload.payment_terms = data.paymentTerms;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    const { data: updated, error } = await supabaseAdmin
      .from('customers')
      .update(updatePayload)
      .eq('id', customerId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to update customer');

    await this.activityLog.log(userId, shopId, 'UPDATE', 'Customers', customerId, { changes: data });

    return this.formatCustomer(updated);
  }

  async deleteCustomer(userId: string, shopId: string, customerId: string): Promise<void> {
    const customer = await this.getCustomer(userId, shopId, customerId);

    // Check if customer has active/pending orders if orders table exists
    const { error } = await supabaseAdmin
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', customerId);

    if (error) throw new Error(error.message);

    await this.activityLog.log(userId, shopId, 'DELETE', 'Customers', customerId, { name: `${customer.firstName} ${customer.lastName}` });
  }

  async convertLeadToCustomer(userId: string, shopId: string, leadId: string): Promise<Customer> {
    // 1. Fetch Lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .is('deleted_at', null)
      .single();

    if (leadErr || !lead) throw new Error('Lead not found or unauthorized for conversion');

    // 2. Create customer from lead data
    const newCustomer = await this.createCustomer(userId, shopId, {
      firstName: lead.first_name,
      lastName: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.company_name,
      customerType: 'Individual',
      notes: `Converted from Lead ID: ${leadId}. ${lead.notes || ''}`,
    });

    // 3. Mark Lead as "Won"
    await supabaseAdmin
      .from('leads')
      .update({
        lead_status: 'Won',
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    await this.activityLog.log(userId, shopId, 'CONVERT', 'Customers', newCustomer.id, {
      convertedFromLeadId: leadId,
      name: `${lead.first_name} ${lead.last_name}`,
    });

    // 4. Automatically create Onboarding & Welcome Follow-up Task
    try {
      const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
      await supabaseAdmin.from('tasks').insert({
        shop_id: shopId,
        created_by_id: userId,
        title: `Welcome & Onboarding Follow-up: ${newCustomer.firstName} ${newCustomer.lastName}`,
        description: `Lead successfully converted to Customer! Follow up to welcome them, introduce services, and guide product usage.`,
        task_type: 'Customer Follow-up',
        priority: 'High',
        status: 'Open',
        due_date: dueDate.toISOString(),
        related_customer_id: newCustomer.id,
        related_lead_id: leadId,
        linked_entity: 'customer',
        linked_entity_value: newCustomer.id,
        assigned_to_user_id: userId,
        remind_before_minutes: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (taskErr) {
      console.warn('Auto task creation for converted lead notice:', taskErr);
    }

    return newCustomer;
  }

  async getOrderHistory(userId: string, shopId: string, customerId: string): Promise<any[]> {
    await this.getCustomer(userId, shopId, customerId);
    try {
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false });

      if (error) {
        console.warn('Customer order history fetch notice:', error.message);
        return [];
      }
      return orders || [];
    } catch (e) {
      console.warn('Customer order history error:', e);
      return [];
    }
  }

  async getPaymentHistory(userId: string, shopId: string, customerId: string): Promise<any[]> {
    await this.getCustomer(userId, shopId, customerId);
    try {
      // 1. Check direct payments by customer_id
      const { data: payments, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false });

      if (!error && payments && payments.length > 0) {
        return payments;
      }

      // 2. Fallback: check payments linked via customer's invoices
      const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .select('invoice_id')
        .eq('customer_id', customerId);

      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((i) => i.invoice_id);
        const { data: invPayments } = await supabaseAdmin
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        return invPayments || [];
      }
      return [];
    } catch (e) {
      console.warn('Customer payment history error:', e);
      return [];
    }
  }

  private formatCustomer(data: any): Customer {
    return {
      id: data.id,
      shopId: data.shop_id,
      createdById: data.created_by_id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      companyName: data.company_name,
      customerType: data.customer_type,
      address: data.address,
      city: data.city,
      country: data.country,
      totalOrderValue: Number(data.total_order_value || 0),
      totalOrders: Number(data.total_orders || 0),
      lastOrderDate: data.last_order_date ? new Date(data.last_order_date) : undefined,
      customerStatus: data.customer_status,
      creditLimit: data.credit_limit ? Number(data.credit_limit) : undefined,
      paymentTerms: data.payment_terms,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }
}
