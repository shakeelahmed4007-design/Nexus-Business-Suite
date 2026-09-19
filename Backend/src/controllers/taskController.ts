import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TaskService } from '../services/taskService';

const taskService = new TaskService();

/**
 * 1. CREATE TASK
 * POST /api/crm/tasks
 */
export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';

    if (!shopId && userRole !== 'super_admin') {
      return res.status(400).json({
        success: false,
        error: 'User does not belong to any active shop',
        code: 'BAD_REQUEST',
      });
    }

    const task = await taskService.createTask(userId, shopId, userRole, req.body);
    return res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET TASKS (Filtered by shop & RBAC)
 * GET /api/crm/tasks
 */
export const getTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;

    const result = await taskService.getTasks(userId, shopId, userRole, {
      page,
      limit,
      search: req.query.search as string,
      status: req.query.status as any,
      priority: req.query.priority as any,
      assignedTo: req.query.assignedTo as string,
      taskType: req.query.taskType as any,
      customerId: req.query.customerId as string,
      leadId: req.query.leadId as string,
      dueFrom: req.query.dueFrom as string,
      dueTo: req.query.dueTo as string,
    });

    return res.json({
      success: true,
      data: result.tasks,
      metrics: result.metrics,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET SINGLE TASK DETAILS
 * GET /api/crm/tasks/:id
 */
export const getTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;

    const task = await taskService.getTask(userId, shopId, userRole, id);
    return res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. UPDATE TASK DETAILS
 * PUT /api/crm/tasks/:id
 */
export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;

    const updated = await taskService.updateTask(userId, shopId, userRole, id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. UPDATE TASK STATUS (Open, In Progress, On Hold, Completed, Cancelled)
 * PUT /api/crm/tasks/:id/status
 */
export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;
    const { status, reason, completionNotes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updated = await taskService.updateStatus(
      userId,
      shopId,
      userRole,
      id,
      status,
      reason,
      completionNotes
    );

    return res.json({
      success: true,
      data: updated,
      message: `Task status updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. COMPLETE TASK
 * PUT /api/crm/tasks/:id/complete
 */
export const completeTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;
    const { completionNotes } = req.body;

    const updated = await taskService.updateStatus(
      userId,
      shopId,
      userRole,
      id,
      'Completed',
      undefined,
      completionNotes
    );

    return res.json({
      success: true,
      data: updated,
      message: 'Task marked as completed',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. ADD COMMENT
 * POST /api/crm/tasks/:id/comments
 */
export const addTaskComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;
    const { commentText, text } = req.body;

    const comment = await taskService.addComment(
      userId,
      shopId,
      userRole,
      id,
      commentText || text || ''
    );

    return res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment added successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. GET COMMENTS
 * GET /api/crm/tasks/:id/comments
 */
export const getTaskComments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;

    const comments = await taskService.getComments(userId, shopId, userRole, id);
    return res.json({
      success: true,
      data: comments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. GET STATUS HISTORY TIMELINE
 * GET /api/crm/tasks/:id/history
 */
export const getTaskStatusHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;

    const history = await taskService.getStatusHistory(userId, shopId, userRole, id);
    return res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 10. PRODUCTIVITY METRICS SUMMARY
 * GET /api/crm/tasks/summary/metrics
 */
export const getTaskMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';

    const metrics = await taskService.getTaskMetrics(userId, shopId, userRole);
    return res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 11. TASK TEMPLATES
 * GET & POST /api/crm/task-templates
 */
export const getTaskTemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user?.shop_id || '';
    const templates = await taskService.getTemplates(shopId);
    return res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
};

export const createTaskTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const template = await taskService.createTemplate(userId, shopId, req.body);
    return res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 12. RUN DAILY REMINDERS & OVERDUE AUTOMATION
 * POST /api/crm/tasks/run-daily-reminders
 */
export const runDailyReminders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user?.shop_id || '';
    const result = await taskService.runDailyReminders(shopId);
    return res.json({
      success: true,
      data: result,
      message: 'Daily reminder job executed',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 13. DELETE TASK
 * DELETE /api/crm/tasks/:id
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { id } = req.params;

    await taskService.deleteTask(userId, shopId, userRole, id);
    return res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 14. GET TASKS BY CUSTOMER & LEAD
 */
export const getTasksByCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { customerId } = req.params;

    const result = await taskService.getTasks(userId, shopId, userRole, {
      customerId,
      limit: 50,
    });

    return res.json({
      success: true,
      data: result.tasks,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasksByLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const userRole = req.user?.role || 'staff';
    const { leadId } = req.params;

    const result = await taskService.getTasks(userId, shopId, userRole, {
      leadId,
      limit: 50,
    });

    return res.json({
      success: true,
      data: result.tasks,
    });
  } catch (err) {
    next(err);
  }
};
