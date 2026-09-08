import { supabaseAdmin } from '../config/supabaseAdmin';
import { Lead, CreateLeadRequest, UpdateLeadRequest, LeadFilterQuery } from '../models/lead';
import { PhoneValidator } from '../validators/phoneValidator';
import { EmailValidator } from '../validators/emailValidator';
import { ActivityLogService } from './activityLogService';

export class LeadService {
  private activityLog = new ActivityLogService();

  async createLead(userId: string, shopId: string, data: CreateLeadRequest): Promise<Lead> {
    if (!data.firstName || !data.lastName) {
      throw new Error('firstName and lastName are required');
    }
    if (data.email) EmailValidator.validate(data.email);
    if (data.phone) PhoneValidator.validate(data.phone);

    const formattedPhone = data.phone ? PhoneValidator.format(data.phone) : undefined;
    const cleanEmail = data.email ? data.email.toLowerCase().trim() : undefined;

    // Check uniqueness per user/shop
    let existingQuery = supabaseAdmin
      .from('leads')
      .select('id')
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .is('deleted_at', null);

    if (cleanEmail && formattedPhone) {
      existingQuery = existingQuery.or(`email.eq.${cleanEmail},phone.eq.${formattedPhone}`);
    } else if (cleanEmail) {
      existingQuery = existingQuery.eq('email', cleanEmail);
    } else if (formattedPhone) {
      existingQuery = existingQuery.eq('phone', formattedPhone);
    }

    if (cleanEmail || formattedPhone) {
      const { data: existing } = await existingQuery.maybeSingle();
      if (existing) {
        throw new Error('A lead with this email or phone number already exists for your account');
      }
    }

    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        shop_id: shopId,
        created_by_id: userId,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        email: cleanEmail,
        phone: formattedPhone,
        company_name: data.companyName,
        lead_source: data.leadSource || 'Manual Entry',
        lead_status: data.leadStatus || 'New',
        lead_value: data.leadValue || 0,
        priority: data.priority || 'Medium',
        assigned_to_user_id: data.assignedToUserId || userId,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newLead) {
      throw new Error(error?.message || 'Failed to create lead');
    }

    await this.activityLog.log(userId, shopId, 'CREATE', 'Leads', newLead.id, {
      action: 'Lead created',
      name: `${data.firstName} ${data.lastName}`,
      status: data.leadStatus,
    });

    return this.formatLead(newLead);
  }

  async getLeads(
    userId: string,
    shopId: string,
    query: LeadFilterQuery
  ): Promise<{ leads: Lead[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    let dbQuery = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .is('deleted_at', null);

    if (query.search) {
      const s = query.search.trim();
      dbQuery = dbQuery.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,company_name.ilike.%${s}%`
      );
    }
    if (query.status) dbQuery = dbQuery.eq('lead_status', query.status);
    if (query.priority) dbQuery = dbQuery.eq('priority', query.priority);
    if (query.source) dbQuery = dbQuery.eq('lead_source', query.source);
    if (query.assignedTo) dbQuery = dbQuery.eq('assigned_to_user_id', query.assignedTo);
    if (query.dateFrom) dbQuery = dbQuery.gte('created_at', query.dateFrom);
    if (query.dateTo) dbQuery = dbQuery.lte('created_at', query.dateTo);

    dbQuery = dbQuery.order('created_at', { ascending: false });
    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw new Error(error.message);

    const total = count || 0;
    return {
      leads: (data || []).map((l) => this.formatLead(l)),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async getLead(userId: string, shopId: string, leadId: string): Promise<any> {
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !lead) throw new Error('Lead not found or unauthorized');

    // Fetch related tasks
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('linked_entity', 'lead')
      .eq('linked_entity_value', leadId)
      .is('deleted_at', null);

    // Fetch related call history
    const { data: callHistory } = await supabaseAdmin
      .from('call_history')
      .select('*')
      .eq('linked_lead_id', leadId)
      .order('call_time', { ascending: false });

    return {
      ...this.formatLead(lead),
      tasks: tasks || [],
      callHistory: callHistory || [],
    };
  }

  async updateLead(userId: string, shopId: string, leadId: string, data: UpdateLeadRequest): Promise<Lead> {
    await this.getLead(userId, shopId, leadId); // Ownership check

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
    if (data.leadSource !== undefined) updatePayload.lead_source = data.leadSource;
    if (data.leadStatus !== undefined) updatePayload.lead_status = data.leadStatus;
    if (data.leadValue !== undefined) updatePayload.lead_value = data.leadValue;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.assignedToUserId !== undefined) updatePayload.assigned_to_user_id = data.assignedToUserId;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.nextFollowUpDate !== undefined) updatePayload.next_follow_up_date = data.nextFollowUpDate;

    const { data: updated, error } = await supabaseAdmin
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to update lead');

    await this.activityLog.log(userId, shopId, 'UPDATE', 'Leads', leadId, { changes: data });

    return this.formatLead(updated);
  }

  async deleteLead(userId: string, shopId: string, leadId: string): Promise<void> {
    await this.getLead(userId, shopId, leadId); // Ownership check

    const { error } = await supabaseAdmin
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    await this.activityLog.log(userId, shopId, 'DELETE', 'Leads', leadId, {});
  }

  async updateLeadStatus(userId: string, shopId: string, leadId: string, newStatus: string): Promise<Lead> {
    const existing = await this.getLead(userId, shopId, leadId);

    const updatePayload: any = {
      lead_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (existing.leadStatus === 'New' && newStatus !== 'New') {
      updatePayload.last_contact_date = new Date().toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to update lead status');

    await this.activityLog.log(userId, shopId, 'STATUS_CHANGE', 'Leads', leadId, {
      from: existing.leadStatus,
      to: newStatus,
    });

    return this.formatLead(updated);
  }

  async bulkImportLeads(
    userId: string,
    shopId: string,
    csvRows: any[]
  ): Promise<{ imported: number; failed: number; errors: any[] }> {
    const results = { imported: 0, failed: 0, errors: [] as any[] };

    if (!Array.isArray(csvRows)) {
      throw new Error('Invalid CSV payload format. Expected an array of rows.');
    }

    for (const row of csvRows) {
      try {
        await this.createLead(userId, shopId, {
          firstName: row.firstName || row.first_name || 'Imported',
          lastName: row.lastName || row.last_name || 'Lead',
          email: row.email,
          phone: row.phone,
          companyName: row.companyName || row.company_name,
          leadSource: row.leadSource || row.lead_source || 'CSV Import',
          leadStatus: row.leadStatus || row.lead_status || 'New',
          priority: row.priority || 'Medium',
          notes: row.notes,
        });
        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row, error: err.message });
      }
    }

    await this.activityLog.log(userId, shopId, 'BULK_IMPORT', 'Leads', null, {
      imported: results.imported,
      failed: results.failed,
    });

    return results;
  }

  private formatLead(data: any): Lead {
    return {
      id: data.id,
      shopId: data.shop_id,
      createdById: data.created_by_id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      companyName: data.company_name,
      leadSource: data.lead_source,
      leadStatus: data.lead_status,
      leadValue: data.lead_value ? Number(data.lead_value) : 0,
      priority: data.priority,
      assignedToUserId: data.assigned_to_user_id,
      notes: data.notes,
      lastContactDate: data.last_contact_date ? new Date(data.last_contact_date) : undefined,
      nextFollowUpDate: data.next_follow_up_date ? new Date(data.next_follow_up_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }
}
