import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TaskService } from '../services/taskService';

const taskService = new TaskService();

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'User does not belong to any active shop', code: 'BAD_REQUEST' });
    }

    const task = await taskService.createTask(userId, shopId, req.body);
    return res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await taskService.getTasks(userId, shopId, {
      page,
      limit,
      search: req.query.search as string,
      status: req.query.status as any,
      priority: req.query.priority as any,
      assignedTo: req.query.assignedTo as string,
      taskType: req.query.taskType as any,
      linkedEntity: req.query.linkedEntity as any,
      dueFrom: req.query.dueFrom as string,
      dueTo: req.query.dueTo as string,
    });

    return res.json({
      success: true,
      data: result.tasks,
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

export const getMyTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const grouped = await taskService.getMyTasks(userId, shopId);
    return res.json({
      success: true,
      data: grouped,
    });
  } catch (err) {
    next(err);
  }
};

export const getTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const task = await taskService.getTask(userId, shopId, id);
    return res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const updated = await taskService.updateTask(userId, shopId, id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const completeTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;
    const { completionNotes } = req.body;

    const updated = await taskService.completeTask(userId, shopId, id, completionNotes);
    return res.json({
      success: true,
      data: updated,
      message: 'Task marked as completed',
    });
  } catch (err) {
    next(err);
  }
};

export const markTaskOverdue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await taskService.markOverdue(id);
    return res.json({
      success: true,
      data: updated,
      message: 'Task marked as overdue',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    await taskService.deleteTask(userId, shopId, id);
    return res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getOverdueTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const tasks = await taskService.getOverdueTasks(userId, shopId);
    return res.json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasksByLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { leadId } = req.params;

    const tasks = await taskService.getTasksByLead(userId, shopId, leadId);
    return res.json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasksByCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { customerId } = req.params;

    const tasks = await taskService.getTasksByCustomer(userId, shopId, customerId);
    return res.json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};
