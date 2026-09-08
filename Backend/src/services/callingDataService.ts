import { supabaseAdmin } from '../config/supabaseAdmin';
import { CallingData, CallHistory, CreateCallingDataRequest, AssignCallingDataRequest, LogCallRequest, CallingDataFilterQuery } from '../models/callingData';
import { PhoneValidator } from '../validators/phoneValidator';
import { ActivityLogService } from './activityLogService';

export class CallingDataService {
  private activityLog = new ActivityLogService();

  async addCallingNumber(userId: string, shopId: string, data: CreateCallingDataRequest): Promise<CallingData> {
    if (!data.phoneNumber) {
      throw new Error('phoneNumber is required');
    }
    PhoneValidator.validate(data.phoneNumber);
    const formattedPhone = PhoneValidator.format(data.phoneNumber);

    // Uniqueness check per user/shop
    const { data: existing } = await supabaseAdmin
      .from('calling_data')
      .select('id')
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .eq('phone_number', formattedPhone)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      throw new Error('Calling number already exists in your dataset');
    }

    const { data: newRecord, error } = await supabaseAdmin
      .from('calling_data')
      .insert({
        shop_id: shopId,
        created_by_id: userId,
        phone_number: formattedPhone,
        source: data.source || 'Manual Entry',
        data_type: data.dataType || 'Raw Data',
        status: 'Available',
        usage_count: 0,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newRecord) {
      throw new Error(error?.message || 'Failed to add calling number');
    }

    await this.activityLog.log(userId, shopId, 'CREATE', 'CallingData', newRecord.id, {
      phone: formattedPhone,
      source: data.source,
    });

    return this.formatCallingData(newRecord);
  }

  async bulkUploadCallingData(
    userId: string,
    shopId: string,
    rows: any[]
  ): Promise<{ imported: number; failed: number; errors: any[] }> {
    const results = { imported: 0, failed: 0, errors: [] as any[] };

    if (!Array.isArray(rows)) {
      throw new Error('Invalid CSV payload format. Expected array of rows.');
    }

    for (const row of rows) {
      try {
        const phone = row.phoneNumber || row.phone_number || row.phone;
        if (!phone) throw new Error('Missing phone number in row');

        await this.addCallingNumber(userId, shopId, {
          phoneNumber: phone,
          source: row.source || 'CSV Import',
          dataType: row.dataType || row.data_type || 'Raw Data',
          notes: row.notes,
        });
        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row, error: err.message });
      }
    }

    await this.activityLog.log(userId, shopId, 'BULK_UPLOAD', 'CallingData', null, {
      imported: results.imported,
      failed: results.failed,
    });

    return results;
  }

  async getCallingData(
    userId: string,
    shopId: string,
    query: CallingDataFilterQuery
  ): Promise<{ data: CallingData[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    let dbQuery = supabaseAdmin
      .from('calling_data')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .or(`created_by_id.eq.${userId},assigned_to_user_id.eq.${userId}`)
      .is('deleted_at', null);

    if (query.search) {
      const s = query.search.trim();
      dbQuery = dbQuery.or(`phone_number.ilike.%${s}%,notes.ilike.%${s}%`);
    }
    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.dataType) dbQuery = dbQuery.eq('data_type', query.dataType);
    if (query.dateFrom) dbQuery = dbQuery.gte('created_at', query.dateFrom);
    if (query.dateTo) dbQuery = dbQuery.lte('created_at', query.dateTo);

    dbQuery = dbQuery.order('created_at', { ascending: false });
    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw new Error(error.message);

    const total = count || 0;
    return {
      data: (data || []).map((d) => this.formatCallingData(d)),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async getAvailableNumbers(userId: string, shopId: string): Promise<{ total: number; numbers: CallingData[] }> {
    const { data, count, error } = await supabaseAdmin
      .from('calling_data')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .eq('status', 'Available')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return {
      total: count || 0,
      numbers: (data || []).map((d) => this.formatCallingData(d)),
    };
  }

  async assignCallingData(userId: string, shopId: string, callingDataId: string, request: AssignCallingDataRequest): Promise<CallingData> {
    if (!request.assignToUserId) throw new Error('assignToUserId is required');
    if (!request.expiryDate) throw new Error('expiryDate is required');

    const expDate = new Date(request.expiryDate);
    if (expDate <= new Date()) throw new Error('expiryDate must be in the future');

    const { data: record, error: findErr } = await supabaseAdmin
      .from('calling_data')
      .select('*')
      .eq('id', callingDataId)
      .eq('shop_id', shopId)
      .eq('created_by_id', userId)
      .is('deleted_at', null)
      .single();

    if (findErr || !record) throw new Error('Calling data record not found or unauthorized');

    const { data: updated, error } = await supabaseAdmin
      .from('calling_data')
      .update({
        assigned_to_user_id: request.assignToUserId,
        assigned_date: new Date().toISOString(),
        expiry_date: expDate.toISOString(),
        status: 'Assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callingDataId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to assign calling data');

    await this.activityLog.log(userId, shopId, 'ASSIGN', 'CallingData', callingDataId, {
      assignedTo: request.assignToUserId,
      expiryDate: expDate.toISOString(),
    });

    return this.formatCallingData(updated);
  }

  async logCall(userId: string, shopId: string, callingDataId: string, request: LogCallRequest): Promise<{ record: CallingData; callHistory: CallHistory }> {
    const { data: record, error: findErr } = await supabaseAdmin
      .from('calling_data')
      .select('*')
      .eq('id', callingDataId)
      .eq('shop_id', shopId)
      .or(`created_by_id.eq.${userId},assigned_to_user_id.eq.${userId}`)
      .is('deleted_at', null)
      .single();

    if (findErr || !record) throw new Error('Calling data record not found or unauthorized');

    // 1. Insert Call History record
    const callTime = new Date().toISOString();
    const { data: callHistory, error: historyErr } = await supabaseAdmin
      .from('call_history')
      .insert({
        calling_data_id: callingDataId,
        agent_user_id: userId,
        call_duration_seconds: request.callDuration || 0,
        call_status: request.callStatus,
        call_notes: request.callNotes,
        linked_lead_id: request.linkedLeadId || null,
        call_time: callTime,
        created_at: callTime,
      })
      .select()
      .single();

    if (historyErr || !callHistory) throw new Error(historyErr?.message || 'Failed to log call history');

    // 2. Update calling_data record usage & status
    const newStatus = ['Interested', 'Not Interested', 'Connected'].includes(request.callStatus) ? 'Used' : record.status;
    const { data: updatedRecord, error: updateErr } = await supabaseAdmin
      .from('calling_data')
      .update({
        usage_count: (record.usage_count || 0) + 1,
        last_used_date: callTime,
        status: newStatus,
        linked_lead_id: request.linkedLeadId || record.linked_lead_id,
        updated_at: callTime,
      })
      .eq('id', callingDataId)
      .select()
      .single();

    if (updateErr || !updatedRecord) throw new Error(updateErr?.message || 'Failed to update calling data stats');

    await this.activityLog.log(userId, shopId, 'LOG_CALL', 'CallingData', callingDataId, {
      callStatus: request.callStatus,
      duration: request.callDuration,
    });

    return {
      record: this.formatCallingData(updatedRecord),
      callHistory: this.formatCallHistory(callHistory),
    };
  }

  async reassignCallingData(userId: string, shopId: string, callingDataId: string, request: AssignCallingDataRequest): Promise<CallingData> {
    return this.assignCallingData(userId, shopId, callingDataId, request);
  }

  async deleteCallingData(userId: string, shopId: string, callingDataId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('calling_data')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', callingDataId)
      .eq('shop_id', shopId)
      .eq('created_by_id', userId);

    if (error) throw new Error(error.message);

    await this.activityLog.log(userId, shopId, 'DELETE', 'CallingData', callingDataId, {});
  }

  async getCallHistory(callingDataId: string): Promise<CallHistory[]> {
    const { data, error } = await supabaseAdmin
      .from('call_history')
      .select('*')
      .eq('calling_data_id', callingDataId)
      .order('call_time', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((h) => this.formatCallHistory(h));
  }

  async getMyAssignedCallingData(userId: string, shopId: string): Promise<CallingData[]> {
    const { data, error } = await supabaseAdmin
      .from('calling_data')
      .select('*')
      .eq('shop_id', shopId)
      .eq('assigned_to_user_id', userId)
      .eq('status', 'Assigned')
      .is('deleted_at', null)
      .order('assigned_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.formatCallingData(d));
  }

  async checkAndExpireCallingData(): Promise<{ expired: number }> {
    const nowIso = new Date().toISOString();
    const { data: expiredRecords, error: findErr } = await supabaseAdmin
      .from('calling_data')
      .select('id, assigned_to_user_id, shop_id')
      .lt('expiry_date', nowIso)
      .eq('status', 'Assigned')
      .is('deleted_at', null);

    if (findErr || !expiredRecords || expiredRecords.length === 0) {
      return { expired: 0 };
    }

    let expiredCount = 0;
    for (const item of expiredRecords) {
      await supabaseAdmin
        .from('calling_data')
        .update({
          status: 'Expired',
          assigned_to_user_id: null,
          assigned_date: null,
          updated_at: nowIso,
        })
        .eq('id', item.id);

      expiredCount++;
    }

    return { expired: expiredCount };
  }

  private formatCallingData(data: any): CallingData {
    return {
      id: data.id,
      shopId: data.shop_id,
      createdById: data.created_by_id,
      phoneNumber: data.phone_number,
      source: data.source,
      dataType: data.data_type,
      assignedToUserId: data.assigned_to_user_id,
      assignedDate: data.assigned_date ? new Date(data.assigned_date) : undefined,
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      status: data.status,
      usageCount: data.usage_count || 0,
      lastUsedDate: data.last_used_date ? new Date(data.last_used_date) : undefined,
      linkedLeadId: data.linked_lead_id,
      linkedCustomerId: data.linked_customer_id,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }

  private formatCallHistory(data: any): CallHistory {
    return {
      id: data.id,
      callingDataId: data.calling_data_id,
      agentUserId: data.agent_user_id,
      callDurationSeconds: data.call_duration_seconds || 0,
      callStatus: data.call_status,
      callNotes: data.call_notes,
      linkedLeadId: data.linked_lead_id,
      callTime: new Date(data.call_time),
      createdAt: new Date(data.created_at),
    };
  }
}
