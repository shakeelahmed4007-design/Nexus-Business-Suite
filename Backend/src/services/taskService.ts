import { supabaseAdmin } from '../config/supabaseAdmin';
import {
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilterQuery,
  TaskComment,
  TaskStatusHistory,
  TaskTemplate,
  TaskMetricsSummary,
} from '../models/task';
import { ActivityLogService } from './activityLogService';

export class TaskService {
  private activityLog = new ActivityLogService();

  /**
   * 1. CREATE TASK
   * Multi-tenant isolated, supports single or multi-staff assignments,
   * audit logging, and automated notification dispatch.
   */
  async createTask(
    userId: string,
    shopId: string,
    userRole: string,
    data: CreateTaskRequest
  ): Promise<Task> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Task title is required');
    }

    const assignedIds: string[] = [];
    if (Array.isArray(data.assignedToUserIds) && data.assignedToUserIds.length > 0) {
      data.assignedToUserIds.forEach((id) => {
        if (id && !assignedIds.includes(id)) assignedIds.push(id);
      });
    } else if (data.assignedToUserId) {
      assignedIds.push(data.assignedToUserId);
    } else {
      // Default assignment to creator if none specified
      assignedIds.push(userId);
    }

    const primaryAssignee = assignedIds[0];
    const initialStatus: TaskStatus = data.status || 'Open';

    // Due date handling
    const dueDateRaw = data.dueDate;
    const dueDateTime = dueDateRaw
      ? new Date(dueDateRaw)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const taskPayload = {
      shop_id: shopId,
      created_by_id: userId,
      title: data.title.trim(),
      description: data.description || '',
      task_type: data.taskType || 'Customer Follow-up',
      related_customer_id: data.relatedCustomerId || (data.linkedEntity === 'customer' ? data.linkedEntityValue : null),
      related_lead_id: data.relatedLeadId || (data.linkedEntity === 'lead' ? data.linkedEntityValue : null),
      linked_entity: data.linkedEntity || (data.relatedCustomerId ? 'customer' : data.relatedLeadId ? 'lead' : null),
      linked_entity_value: data.linkedEntityValue || data.relatedCustomerId || data.relatedLeadId || null,
      assigned_to_user_id: primaryAssignee,
      priority: data.priority || 'Medium',
      status: initialStatus,
      status_changed_at: new Date().toISOString(),
      due_date: dueDateTime.toISOString(),
      remind_before_minutes: data.remindBeforeMinutes || 15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newTask, error } = await supabaseAdmin
      .from('tasks')
      .insert(taskPayload)
      .select()
      .single();

    if (error || !newTask) {
      throw new Error(error?.message || 'Failed to create task');
    }

    const taskId = newTask.id;

    // Record multi-assignments
    try {
      const assignmentInserts = assignedIds.map((assigneeId) => ({
        task_id: taskId,
        assigned_to_user_id: assigneeId,
        assigned_by_user_id: userId,
        assigned_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from('task_assignments').insert(assignmentInserts);
    } catch (err) {
      console.warn('Failed to insert task_assignments (table might be initializing):', err);
    }

    // Record initial status in status history
    try {
      await supabaseAdmin.from('task_status_history').insert({
        task_id: taskId,
        old_status: null,
        new_status: initialStatus,
        changed_by_user_id: userId,
        changed_at: new Date().toISOString(),
        reason: 'Task created',
      });
    } catch (err) {
      console.warn('Failed to log task_status_history:', err);
    }

    // Dispatch assignment notifications to all assigned staff
    try {
      const notificationInserts = assignedIds.map((staffId) => ({
        shop_id: shopId,
        user_id: staffId,
        task_id: taskId,
        type: 'assignment',
        title: 'New Task Assigned',
        message: `You have been assigned to: ${data.title.trim()}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from('task_notifications').insert(notificationInserts);
    } catch (err) {
      console.warn('Failed to dispatch notifications:', err);
    }

    // Log Activity
    await this.activityLog.log(userId, shopId, 'CREATE', 'Tasks', taskId, {
      title: data.title,
      taskType: data.taskType,
      assignedUserIds: assignedIds,
    });

    return this.getTask(userId, shopId, userRole, taskId);
  }

  /**
   * 2. GET TASKS
   * Multi-tenant filtered, RBAC aware:
   * - Super Admin: all tasks or shop tasks
   * - Shop Admin / Manager: all tasks for shop
   * - Staff: only tasks assigned to them
   */
  async getTasks(
    userId: string,
    shopId: string,
    userRole: string,
    query: TaskFilterQuery
  ): Promise<{ tasks: Task[]; total: number; page: number; pages: number; metrics: TaskMetricsSummary }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));

    let dbQuery = supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Multi-tenant isolation
    if (userRole !== 'super_admin' || shopId) {
      dbQuery = dbQuery.eq('shop_id', shopId);
    }

    // RBAC: Staff sees only their assigned tasks
    if (userRole === 'staff' || userRole === 'sales_agent') {
      // Find all task IDs where user is assigned in task_assignments
      try {
        const { data: userAssignments } = await supabaseAdmin
          .from('task_assignments')
          .select('task_id')
          .eq('assigned_to_user_id', userId)
          .is('unassigned_at', null);

        const assignedTaskIds = (userAssignments || []).map((a) => a.task_id);
        if (assignedTaskIds.length > 0) {
          dbQuery = dbQuery.or(
            `assigned_to_user_id.eq.${userId},created_by_id.eq.${userId},id.in.(${assignedTaskIds.join(',')})`
          );
        } else {
          dbQuery = dbQuery.or(`assigned_to_user_id.eq.${userId},created_by_id.eq.${userId}`);
        }
      } catch {
        dbQuery = dbQuery.or(`assigned_to_user_id.eq.${userId},created_by_id.eq.${userId}`);
      }
    } else if (query.assignedTo) {
      dbQuery = dbQuery.eq('assigned_to_user_id', query.assignedTo);
    }

    // Filters
    if (query.search) {
      const s = query.search.trim();
      dbQuery = dbQuery.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    }

    if (query.status) {
      if (query.status === 'Open' || query.status === 'Not Started') {
        dbQuery = dbQuery.in('status', ['Open', 'Not Started', 'To Do']);
      } else {
        dbQuery = dbQuery.eq('status', query.status);
      }
    }

    if (query.priority) {
      dbQuery = dbQuery.eq('priority', query.priority);
    }

    if (query.taskType) {
      dbQuery = dbQuery.eq('task_type', query.taskType);
    }

    if (query.customerId) {
      dbQuery = dbQuery.or(`related_customer_id.eq.${query.customerId},linked_entity_value.eq.${query.customerId}`);
    }

    if (query.leadId) {
      dbQuery = dbQuery.or(`related_lead_id.eq.${query.leadId},linked_entity_value.eq.${query.leadId}`);
    }

    if (query.dueFrom) {
      dbQuery = dbQuery.gte('due_date', query.dueFrom);
    }

    if (query.dueTo) {
      dbQuery = dbQuery.lte('due_date', query.dueTo);
    }

    dbQuery = dbQuery.order('due_date', { ascending: true });
    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) {
      throw new Error(error.message);
    }

    const total = count || 0;
    const taskList = await Promise.all((data || []).map((t) => this.hydrateTask(t)));

    // Aggregate summary metrics
    const metrics = await this.getTaskMetrics(userId, shopId, userRole);

    return {
      tasks: taskList,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      metrics,
    };
  }

  /**
   * 3. GET SINGLE TASK DETAILS
   * Includes active assignments, comment threads, timeline history, and linked CRM records.
   */
  async getTask(
    userId: string,
    shopId: string,
    userRole: string,
    taskId: string
  ): Promise<Task> {
    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .is('deleted_at', null);

    if (userRole !== 'super_admin') {
      query = query.eq('shop_id', shopId);
    }

    const { data: task, error } = await query.single();
    if (error || !task) {
      throw new Error('Task not found or access denied');
    }

    // RBAC check for staff members
    if (userRole === 'staff' || userRole === 'sales_agent') {
      if (task.assigned_to_user_id !== userId && task.created_by_id !== userId) {
        // Check if assigned in task_assignments
        const { data: assignment } = await supabaseAdmin
          .from('task_assignments')
          .select('id')
          .eq('task_id', taskId)
          .eq('assigned_to_user_id', userId)
          .is('unassigned_at', null)
          .maybeSingle();

        if (!assignment) {
          throw new Error('Access denied: You can only view tasks assigned to you');
        }
      }
    }

    return this.hydrateTask(task, true);
  }

  /**
   * 4. UPDATE TASK DETAILS & REASSIGNMENT
   */
  async updateTask(
    userId: string,
    shopId: string,
    userRole: string,
    taskId: string,
    data: UpdateTaskRequest
  ): Promise<Task> {
    const existingTask = await this.getTask(userId, shopId, userRole, taskId);

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.taskType !== undefined) updatePayload.task_type = data.taskType;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.dueDate !== undefined) updatePayload.due_date = new Date(data.dueDate).toISOString();
    if (data.remindBeforeMinutes !== undefined) updatePayload.remind_before_minutes = data.remindBeforeMinutes;
    if (data.relatedCustomerId !== undefined) updatePayload.related_customer_id = data.relatedCustomerId;
    if (data.relatedLeadId !== undefined) updatePayload.related_lead_id = data.relatedLeadId;

    // Handle Staff Reassignment if requested
    if (data.assignedToUserIds !== undefined || data.assignedToUserId !== undefined) {
      const newAssigneeIds: string[] = [];
      if (Array.isArray(data.assignedToUserIds)) {
        data.assignedToUserIds.forEach((id) => {
          if (id && !newAssigneeIds.includes(id)) newAssigneeIds.push(id);
        });
      } else if (data.assignedToUserId) {
        newAssigneeIds.push(data.assignedToUserId);
      }

      if (newAssigneeIds.length > 0) {
        updatePayload.assigned_to_user_id = newAssigneeIds[0];
        await this.handleReassignment(userId, shopId, taskId, existingTask, newAssigneeIds);
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update task');
    }

    await this.activityLog.log(userId, shopId, 'UPDATE', 'Tasks', taskId, { changes: data });

    return this.getTask(userId, shopId, userRole, taskId);
  }

  /**
   * 5. UPDATE TASK STATUS (Open, In Progress, On Hold, Completed, Cancelled)
   */
  async updateStatus(
    userId: string,
    shopId: string,
    userRole: string,
    taskId: string,
    newStatus: TaskStatus,
    reason?: string,
    completionNotes?: string
  ): Promise<Task> {
    const existingTask = await this.getTask(userId, shopId, userRole, taskId);
    const oldStatus = existingTask.status;

    const updatePayload: any = {
      status: newStatus,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'Completed') {
      updatePayload.completion_date = new Date().toISOString();
      updatePayload.completion_notes = completionNotes || reason || 'Task marked completed';
    } else if (newStatus === 'On Hold') {
      updatePayload.hold_reason = reason || 'Placed on hold';
    } else if (newStatus === 'Cancelled') {
      updatePayload.cancellation_reason = reason || 'Task cancelled';
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update task status');
    }

    // Record in Status History timeline
    try {
      await supabaseAdmin.from('task_status_history').insert({
        task_id: taskId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by_user_id: userId,
        changed_at: new Date().toISOString(),
        reason: reason || completionNotes || `Status transitioned from ${oldStatus} to ${newStatus}`,
      });
    } catch (err) {
      console.warn('Failed to record task status history:', err);
    }

    // Notify assigned staff & task creator
    try {
      const recipientIds = new Set<string>();
      if (existingTask.createdById && existingTask.createdById !== userId) {
        recipientIds.add(existingTask.createdById);
      }
      if (existingTask.assignedUserIds) {
        existingTask.assignedUserIds.forEach((id) => {
          if (id !== userId) recipientIds.add(id);
        });
      }

      const notifications = Array.from(recipientIds).map((recId) => ({
        shop_id: shopId,
        user_id: recId,
        task_id: taskId,
        type: 'status_change',
        title: `Task Status: ${newStatus}`,
        message: `Task "${existingTask.title}" changed to ${newStatus}${reason ? ` (${reason})` : ''}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      if (notifications.length > 0) {
        await supabaseAdmin.from('task_notifications').insert(notifications);
      }
    } catch (err) {
      console.warn('Failed to dispatch status notifications:', err);
    }

    await this.activityLog.log(userId, shopId, 'STATUS_CHANGE', 'Tasks', taskId, {
      oldStatus,
      newStatus,
      reason,
    });

    return this.getTask(userId, shopId, userRole, taskId);
  }

  /**
   * 6. ADD TASK COMMENT
   */
  async addComment(
    userId: string,
    shopId: string,
    userRole: string,
    taskId: string,
    commentText: string
  ): Promise<TaskComment> {
    if (!commentText || !commentText.trim()) {
      throw new Error('Comment text cannot be empty');
    }

    const task = await this.getTask(userId, shopId, userRole, taskId);

    const { data: newComment, error } = await supabaseAdmin
      .from('task_comments')
      .insert({
        task_id: taskId,
        commented_by_user_id: userId,
        comment_text: commentText.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newComment) {
      throw new Error(error?.message || 'Failed to post comment');
    }

    // Notify other assigned staff and creator
    try {
      const notifyIds = new Set<string>();
      if (task.createdById && task.createdById !== userId) {
        notifyIds.add(task.createdById);
      }
      if (task.assignedUserIds) {
        task.assignedUserIds.forEach((id) => {
          if (id !== userId) notifyIds.add(id);
        });
      }

      const notifications = Array.from(notifyIds).map((id) => ({
        shop_id: shopId,
        user_id: id,
        task_id: taskId,
        type: 'comment',
        title: 'New Comment on Task',
        message: `New update on "${task.title}": ${commentText.trim().substring(0, 80)}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      if (notifications.length > 0) {
        await supabaseAdmin.from('task_notifications').insert(notifications);
      }
    } catch (err) {
      console.warn('Failed to send comment notifications:', err);
    }

    return {
      id: newComment.id,
      taskId: newComment.task_id,
      commentedByUserId: newComment.commented_by_user_id,
      commentText: newComment.comment_text,
      createdAt: new Date(newComment.created_at),
      commenter: {
        id: userId,
        name: 'User',
      },
    };
  }

  /**
   * 7. GET TASK COMMENTS
   */
  async getComments(
    userId: string,
    shopId: string,
    userRole: string,
    taskId: string
  ): Promise<TaskComment[]> {
    await this.getTask(userId, shopId, userRole, taskId);

    const { data, error } = await supabaseAdmin
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((c) => ({
      id: c.id,
      taskId: c.task_id,
      commentedByUserId: c.commented_by_user_id,
      commentText: c.comment_text,
      createdAt: new Date(c.created_at),
      commenter: {
        id: c.commented_by_user_id,
        name: 'Staff Member',
      },
    }));
  }

  /**
   * 8. GET TASK STATUS HISTORY TIMELINE
   */
  async getStatusHistory(
    userId: string,
    shopId: string,
    userRole: string,
    taskId: string
  ): Promise<TaskStatusHistory[]> {
    await this.getTask(userId, shopId, userRole, taskId);

    const { data, error } = await supabaseAdmin
      .from('task_status_history')
      .select('*')
      .eq('task_id', taskId)
      .order('changed_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((h) => ({
      id: h.id,
      taskId: h.task_id,
      oldStatus: h.old_status,
      newStatus: h.new_status,
      changedByUserId: h.changed_by_user_id,
      changedAt: new Date(h.changed_at),
      reason: h.reason,
      changedByUser: {
        id: h.changed_by_user_id,
        name: 'User',
      },
    }));
  }

  /**
   * 9. TASK TEMPLATES
   */
  async getTemplates(shopId: string): Promise<TaskTemplate[]> {
    const { data, error } = await supabaseAdmin
      .from('task_templates')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((t) => ({
      id: t.id,
      shopId: t.shop_id,
      title: t.title,
      description: t.description,
      taskType: t.task_type,
      priority: t.priority,
      defaultAssignedUserIds: t.default_assigned_user_ids || [],
      createdById: t.created_by_id,
      createdAt: new Date(t.created_at),
    }));
  }

  async createTemplate(
    userId: string,
    shopId: string,
    data: {
      title: string;
      description?: string;
      taskType: TaskType;
      priority: TaskPriority;
      defaultAssignedUserIds?: string[];
    }
  ): Promise<TaskTemplate> {
    const { data: template, error } = await supabaseAdmin
      .from('task_templates')
      .insert({
        shop_id: shopId,
        title: data.title.trim(),
        description: data.description,
        task_type: data.taskType || 'Customer Follow-up',
        priority: data.priority || 'Medium',
        default_assigned_user_ids: data.defaultAssignedUserIds || [],
        created_by_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !template) throw new Error(error?.message || 'Failed to create template');

    return {
      id: template.id,
      shopId: template.shop_id,
      title: template.title,
      description: template.description,
      taskType: template.task_type,
      priority: template.priority,
      defaultAssignedUserIds: template.default_assigned_user_ids || [],
      createdById: template.created_by_id,
      createdAt: new Date(template.created_at),
    };
  }

  /**
   * 10. PRODUCTIVITY METRICS SUMMARY
   */
  async getTaskMetrics(userId: string, shopId: string, userRole: string): Promise<TaskMetricsSummary> {
    let query = supabaseAdmin
      .from('tasks')
      .select('status, due_date')
      .is('deleted_at', null);

    if (userRole !== 'super_admin' || shopId) {
      query = query.eq('shop_id', shopId);
    }

    if (userRole === 'staff' || userRole === 'sales_agent') {
      query = query.or(`assigned_to_user_id.eq.${userId},created_by_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) {
      return {
        totalTasks: 0,
        openTasks: 0,
        inProgressTasks: 0,
        onHoldTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      };
    }

    const now = new Date();
    let totalTasks = 0;
    let openTasks = 0;
    let inProgressTasks = 0;
    let onHoldTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    (data || []).forEach((t) => {
      totalTasks++;
      const s = (t.status || '').toLowerCase();
      const isComplete = s === 'completed' || s === 'done';
      const isCancelled = s === 'cancelled';

      if (isComplete) {
        completedTasks++;
      } else if (s === 'in progress' || s === 'review') {
        inProgressTasks++;
      } else if (s === 'on hold') {
        onHoldTasks++;
      } else {
        openTasks++;
      }

      if (!isComplete && !isCancelled && t.due_date) {
        const due = new Date(t.due_date);
        if (due < now) {
          overdueTasks++;
        }
      }
    });

    return {
      totalTasks,
      openTasks,
      inProgressTasks,
      onHoldTasks,
      completedTasks,
      overdueTasks,
    };
  }

  /**
   * 11. DAILY REMINDER & OVERDUE AUTOMATION JOB
   * Checks due tomorrow, due today, and overdue escalation.
   */
  async runDailyReminders(shopId?: string): Promise<{
    remindersSent: number;
    overdueEscalated: number;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const tomorrowStart = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .neq('status', 'Completed')
      .neq('status', 'Cancelled');

    if (shopId) query = query.eq('shop_id', shopId);

    const { data: openTasks, error } = await query;
    if (error || !openTasks) return { remindersSent: 0, overdueEscalated: 0 };

    let remindersSent = 0;
    let overdueEscalated = 0;

    for (const task of openTasks) {
      if (!task.due_date) continue;
      const due = new Date(task.due_date);

      // 1. Due Tomorrow
      if (due >= tomorrowStart && due <= tomorrowEnd) {
        await this.dispatchNotification(
          task.shop_id,
          task.assigned_to_user_id,
          task.id,
          'due_tomorrow',
          'Task Due Tomorrow',
          `Reminder: "${task.title}" is due tomorrow.`
        );
        remindersSent++;
      }
      // 2. Due Today
      else if (due >= startOfToday && due <= endOfToday) {
        await this.dispatchNotification(
          task.shop_id,
          task.assigned_to_user_id,
          task.id,
          'due_today',
          'Task Due Today',
          `Urgent: "${task.title}" is due today!`
        );
        remindersSent++;
      }
      // 3. Overdue
      else if (due < startOfToday) {
        await this.dispatchNotification(
          task.shop_id,
          task.assigned_to_user_id,
          task.id,
          'overdue',
          'Task Overdue Alert',
          `Escalation: Task "${task.title}" is overdue.`
        );
        overdueEscalated++;
      }
    }

    return { remindersSent, overdueEscalated };
  }

  /**
   * 12. SOFT DELETE TASK
   */
  async deleteTask(userId: string, shopId: string, userRole: string, taskId: string): Promise<void> {
    await this.getTask(userId, shopId, userRole, taskId);

    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw new Error(error.message);

    await this.activityLog.log(userId, shopId, 'DELETE', 'Tasks', taskId, {});
  }

  // --- PRIVATE HELPER METHODS ---

  private async handleReassignment(
    adminUserId: string,
    shopId: string,
    taskId: string,
    existingTask: Task,
    newAssigneeIds: string[]
  ): Promise<void> {
    const oldAssigneeIds = existingTask.assignedUserIds || [existingTask.assignedToUserId || ''];
    const addedAssignees = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));
    const removedAssignees = oldAssigneeIds.filter((id) => !newAssigneeIds.includes(id));

    // Mark removed assignees as unassigned
    for (const removedId of removedAssignees) {
      if (!removedId) continue;
      await supabaseAdmin
        .from('task_assignments')
        .update({ unassigned_at: new Date().toISOString() })
        .eq('task_id', taskId)
        .eq('assigned_to_user_id', removedId)
        .is('unassigned_at', null);

      await this.dispatchNotification(
        shopId,
        removedId,
        taskId,
        'unassigned',
        'Task Assignment Update',
        `You have been unassigned from task: "${existingTask.title}"`
      );
    }

    // Insert new assignees
    for (const addedId of addedAssignees) {
      if (!addedId) continue;
      await supabaseAdmin.from('task_assignments').insert({
        task_id: taskId,
        assigned_to_user_id: addedId,
        assigned_by_user_id: adminUserId,
        assigned_at: new Date().toISOString(),
      });

      await this.dispatchNotification(
        shopId,
        addedId,
        taskId,
        'assignment',
        'New Task Assigned',
        `You have been assigned to: "${existingTask.title}"`
      );
    }

    // Log assignment change to status history
    await supabaseAdmin.from('task_status_history').insert({
      task_id: taskId,
      old_status: existingTask.status,
      new_status: existingTask.status,
      changed_by_user_id: adminUserId,
      changed_at: new Date().toISOString(),
      reason: `Reassigned task. Added: ${addedAssignees.length}, Removed: ${removedAssignees.length}`,
    });
  }

  private async dispatchNotification(
    shopId: string,
    userId: string,
    taskId: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    if (!userId) return;
    try {
      await supabaseAdmin.from('task_notifications').insert({
        shop_id: shopId,
        user_id: userId,
        task_id: taskId,
        type,
        title,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to dispatch notification:', err);
    }
  }

  private async hydrateTask(t: any, includeRelations: boolean = false): Promise<Task> {
    const statusMap: Record<string, TaskStatus> = {
      'Not Started': 'Open',
      'To Do': 'Open',
      'Open': 'Open',
      'In Progress': 'In Progress',
      'Review': 'In Progress',
      'On Hold': 'On Hold',
      'Completed': 'Completed',
      'Done': 'Completed',
      'Cancelled': 'Cancelled',
      'Overdue': 'Open',
    };

    const task: Task = {
      id: t.id,
      shopId: t.shop_id,
      createdById: t.created_by_id,
      title: t.title,
      description: t.description,
      taskType: (t.task_type || 'Customer Follow-up') as TaskType,
      relatedCustomerId: t.related_customer_id,
      relatedLeadId: t.related_lead_id,
      linkedEntity: t.linked_entity,
      linkedEntityValue: t.linked_entity_value,
      assignedToUserId: t.assigned_to_user_id,
      priority: (t.priority || 'Medium') as TaskPriority,
      status: statusMap[t.status] || (t.status as TaskStatus) || 'Open',
      statusChangedAt: t.status_changed_at ? new Date(t.status_changed_at) : undefined,
      dueDate: t.due_date ? new Date(t.due_date) : undefined,
      completionDate: t.completion_date ? new Date(t.completion_date) : undefined,
      completionNotes: t.completion_notes,
      holdReason: t.hold_reason,
      cancellationReason: t.cancellation_reason,
      remindBeforeMinutes: t.remind_before_minutes || 15,
      createdAt: new Date(t.created_at),
      updatedAt: new Date(t.updated_at),
      deletedAt: t.deleted_at ? new Date(t.deleted_at) : undefined,
    };

    if (includeRelations) {
      // Fetch assignments
      try {
        const { data: assignments } = await supabaseAdmin
          .from('task_assignments')
          .select('*')
          .eq('task_id', t.id)
          .is('unassigned_at', null);

        task.assignments = (assignments || []).map((a) => ({
          id: a.id,
          taskId: a.task_id,
          assignedToUserId: a.assigned_to_user_id,
          assignedByUserId: a.assigned_by_user_id,
          assignedAt: new Date(a.assigned_at),
          unassignedAt: a.unassigned_at ? new Date(a.unassigned_at) : undefined,
        }));
        task.assignedUserIds = (assignments || []).map((a) => a.assigned_to_user_id);
      } catch {
        task.assignedUserIds = [t.assigned_to_user_id];
      }

      // Fetch comments
      try {
        const { data: comments } = await supabaseAdmin
          .from('task_comments')
          .select('*')
          .eq('task_id', t.id)
          .order('created_at', { ascending: true });

        task.comments = (comments || []).map((c) => ({
          id: c.id,
          taskId: c.task_id,
          commentedByUserId: c.commented_by_user_id,
          commentText: c.comment_text,
          createdAt: new Date(c.created_at),
        }));
        task.commentsCount = task.comments.length;
      } catch {
        task.comments = [];
        task.commentsCount = 0;
      }

      // Fetch status history
      try {
        const { data: history } = await supabaseAdmin
          .from('task_status_history')
          .select('*')
          .eq('task_id', t.id)
          .order('changed_at', { ascending: true });

        task.statusHistory = (history || []).map((h) => ({
          id: h.id,
          taskId: h.task_id,
          oldStatus: h.old_status,
          newStatus: h.new_status,
          changedByUserId: h.changed_by_user_id,
          changedAt: new Date(h.changed_at),
          reason: h.reason,
        }));
      } catch {
        task.statusHistory = [];
      }

      // Fetch linked customer / lead details
      const customerId = t.related_customer_id || (t.linked_entity === 'customer' ? t.linked_entity_value : null);
      if (customerId) {
        try {
          const { data: cust } = await supabaseAdmin
            .from('customers')
            .select('id, first_name, last_name, email, phone, company_name')
            .eq('id', customerId)
            .maybeSingle();
          task.relatedCustomer = cust;
        } catch {}
      }

      const leadId = t.related_lead_id || (t.linked_entity === 'lead' ? t.linked_entity_value : null);
      if (leadId) {
        try {
          const { data: lead } = await supabaseAdmin
            .from('leads')
            .select('id, first_name, last_name, email, phone, company_name, status')
            .eq('id', leadId)
            .maybeSingle();
          task.relatedLead = lead;
        } catch {}
      }
    }

    return task;
  }
}
