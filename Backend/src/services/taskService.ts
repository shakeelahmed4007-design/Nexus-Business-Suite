import { supabaseAdmin } from '../config/supabaseAdmin';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskFilterQuery } from '../models/task';
import { ActivityLogService } from './activityLogService';

export class TaskService {
  private activityLog = new ActivityLogService();

  async createTask(userId: string, shopId: string, data: any): Promise<Task> {
    if (!data.title) {
      throw new Error('Task title is required');
    }

    // Accept taskStatus (frontend) or status field
    const resolvedStatus = data.taskStatus || data.status || 'Not Started';
    // Map frontend kanban column names to DB values
    const statusMap: Record<string, string> = {
      'To Do': 'Not Started',
      'In Progress': 'In Progress',
      'Review': 'In Progress',
      'Done': 'Completed',
      'Not Started': 'Not Started',
      'Completed': 'Completed',
    };
    const dbStatus = statusMap[resolvedStatus] || 'Not Started';

    // Default due date: 7 days from now
    const dueDateRaw = data.dueDate || data.due_date;
    const dueDateTime = dueDateRaw ? new Date(dueDateRaw) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (isNaN(dueDateTime.getTime())) {
      throw new Error('Invalid dueDate timestamp');
    }

    // Default assignee: task creator
    const assignedTo = data.assignedToUserId || data.assigned_to_user_id || userId;

    const { data: newTask, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        shop_id: shopId,
        created_by_id: userId,
        title: data.title.trim(),
        description: data.description,
        task_type: data.taskType || 'Follow-up',
        linked_entity: data.linkedEntity || data.linked_entity || null,
        linked_entity_value: data.linkedEntityValue || data.linked_entity_value || null,
        assigned_to_user_id: assignedTo,
        priority: data.priority || 'Medium',
        status: dbStatus,
        due_date: dueDateTime.toISOString(),
        remind_before_minutes: data.remindBeforeMinutes || 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newTask) {
      throw new Error(error?.message || 'Failed to create task');
    }

    await this.activityLog.log(userId, shopId, 'CREATE', 'Tasks', newTask.id, {
      title: data.title,
      taskType: data.taskType,
      assignedTo: data.assignedToUserId,
    });

    return this.formatTask(newTask);
  }

  async getTasks(
    userId: string,
    shopId: string,
    query: TaskFilterQuery
  ): Promise<{ tasks: Task[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    let dbQuery = supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .or(`created_by_id.eq.${userId},assigned_to_user_id.eq.${userId}`)
      .is('deleted_at', null);

    if (query.search) {
      const s = query.search.trim();
      dbQuery = dbQuery.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.priority) dbQuery = dbQuery.eq('priority', query.priority);
    if (query.assignedTo) dbQuery = dbQuery.eq('assigned_to_user_id', query.assignedTo);
    if (query.taskType) dbQuery = dbQuery.eq('task_type', query.taskType);
    if (query.linkedEntity) dbQuery = dbQuery.eq('linked_entity', query.linkedEntity);
    if (query.dueFrom) dbQuery = dbQuery.gte('due_date', query.dueFrom);
    if (query.dueTo) dbQuery = dbQuery.lte('due_date', query.dueTo);

    dbQuery = dbQuery.order('due_date', { ascending: true });
    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw new Error(error.message);

    const total = count || 0;
    return {
      tasks: (data || []).map((t) => this.formatTask(t)),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async getMyTasks(userId: string, shopId: string): Promise<{
    overdue: Task[];
    today: Task[];
    thisWeek: Task[];
    upcoming: Task[];
  }> {
    const { data: allTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('shop_id', shopId)
      .eq('assigned_to_user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'Completed')
      .neq('status', 'Cancelled')
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdue: Task[] = [];
    const today: Task[] = [];
    const thisWeek: Task[] = [];
    const upcoming: Task[] = [];

    (allTasks || []).forEach((t) => {
      const formatted = this.formatTask(t);
      const dueDate = formatted.dueDate;

      if (dueDate < startOfToday || t.status === 'Overdue') {
        overdue.push(formatted);
      } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
        today.push(formatted);
      } else if (dueDate > endOfToday && dueDate <= endOfWeek) {
        thisWeek.push(formatted);
      } else {
        upcoming.push(formatted);
      }
    });

    return { overdue, today, thisWeek, upcoming };
  }

  async getTask(userId: string, shopId: string, taskId: string): Promise<any> {
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('shop_id', shopId)
      .or(`created_by_id.eq.${userId},assigned_to_user_id.eq.${userId}`)
      .is('deleted_at', null)
      .single();

    if (error || !task) throw new Error('Task not found or unauthorized');

    let linkedEntityDetails: any = null;
    if (task.linked_entity && task.linked_entity_value) {
      const table = task.linked_entity === 'lead' ? 'leads' : 'customers';
      const { data: entity } = await supabaseAdmin
        .from(table)
        .select('id, first_name, last_name, email, phone, company_name')
        .eq('id', task.linked_entity_value)
        .maybeSingle();

      linkedEntityDetails = entity;
    }

    return {
      ...this.formatTask(task),
      linkedEntityDetails,
    };
  }

  async updateTask(userId: string, shopId: string, taskId: string, data: UpdateTaskRequest): Promise<Task> {
    await this.getTask(userId, shopId, taskId); // Ownership check

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.taskType !== undefined) updatePayload.task_type = data.taskType;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.assignedToUserId !== undefined) updatePayload.assigned_to_user_id = data.assignedToUserId;
    if (data.dueDate !== undefined) updatePayload.due_date = new Date(data.dueDate).toISOString();
    if (data.completionNotes !== undefined) updatePayload.completion_notes = data.completionNotes;

    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to update task');

    await this.activityLog.log(userId, shopId, 'UPDATE', 'Tasks', taskId, { changes: data });

    return this.formatTask(updated);
  }

  async completeTask(userId: string, shopId: string, taskId: string, completionNotes?: string): Promise<Task> {
    await this.getTask(userId, shopId, taskId);

    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'Completed',
        completion_date: new Date().toISOString(),
        completion_notes: completionNotes || 'Marked completed by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to complete task');

    await this.activityLog.log(userId, shopId, 'COMPLETE', 'Tasks', taskId, { completionNotes });

    return this.formatTask(updated);
  }

  async markOverdue(taskId: string): Promise<Task> {
    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'Overdue',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error || !updated) throw new Error('Failed to mark task overdue');
    return this.formatTask(updated);
  }

  async deleteTask(userId: string, shopId: string, taskId: string): Promise<void> {
    await this.getTask(userId, shopId, taskId);

    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw new Error(error.message);

    await this.activityLog.log(userId, shopId, 'DELETE', 'Tasks', taskId, {});
  }

  async getOverdueTasks(userId: string, shopId: string): Promise<Task[]> {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('shop_id', shopId)
      .or(`created_by_id.eq.${userId},assigned_to_user_id.eq.${userId}`)
      .eq('status', 'Overdue')
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((t) => this.formatTask(t));
  }

  async getTasksByLead(userId: string, shopId: string, leadId: string): Promise<Task[]> {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('shop_id', shopId)
      .eq('linked_entity', 'lead')
      .eq('linked_entity_value', leadId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((t) => this.formatTask(t));
  }

  async getTasksByCustomer(userId: string, shopId: string, customerId: string): Promise<Task[]> {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('shop_id', shopId)
      .eq('linked_entity', 'customer')
      .eq('linked_entity_value', customerId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((t) => this.formatTask(t));
  }

  private formatTask(data: any): Task {
    // Map DB status values back to frontend kanban column names
    const statusMap: Record<string, string> = {
      'Not Started': 'To Do',
      'In Progress': 'In Progress',
      'Completed': 'Done',
      'Overdue': 'To Do',
      'Cancelled': 'To Do',
    };
    return {
      id: data.id,
      shopId: data.shop_id,
      createdById: data.created_by_id,
      title: data.title,
      description: data.description,
      taskType: data.task_type,
      linkedEntity: data.linked_entity,
      linkedEntityValue: data.linked_entity_value,
      assignedToUserId: data.assigned_to_user_id,
      priority: data.priority,
      status: statusMap[data.status] || data.status,
      // Also expose as taskStatus for frontend hook compatibility
      taskStatus: statusMap[data.status] || data.status,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      completionDate: data.completion_date ? new Date(data.completion_date) : undefined,
      completionNotes: data.completion_notes,
      remindBeforeMinutes: data.remind_before_minutes || 15,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    } as any;
  }
}
