import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LeadService } from '../services/leadService';

const leadService = new LeadService();

export const createLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'User does not belong to any active shop', code: 'BAD_REQUEST' });
    }

    const lead = await leadService.createLead(userId, shopId, req.body);
    return res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getLeads = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await leadService.getLeads(userId, shopId, {
      page,
      limit,
      search: req.query.search as string,
      status: req.query.status as any,
      priority: req.query.priority as any,
      source: req.query.source as any,
      assignedTo: req.query.assignedTo as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });

    return res.json({
      success: true,
      data: result.leads,
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

export const getLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const lead = await leadService.getLead(userId, shopId, id);
    return res.json({
      success: true,
      data: lead,
    });
  } catch (err) {
    next(err);
  }
};

export const updateLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const updated = await leadService.updateLead(userId, shopId, id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: 'Lead updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    await leadService.deleteLead(userId, shopId, id);
    return res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateLeadStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;
    const { newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ success: false, error: 'newStatus is required', code: 'BAD_REQUEST' });
    }

    const updated = await leadService.updateLeadStatus(userId, shopId, id, newStatus);
    return res.json({
      success: true,
      data: updated,
      message: 'Lead status updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkImportLeads = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const csvData = req.body.data || req.body.rows || req.body;

    const result = await leadService.bulkImportLeads(userId, shopId, csvData);
    return res.json({
      success: true,
      data: result,
      message: `Bulk import processed: ${result.imported} imported, ${result.failed} failed`,
    });
  } catch (err) {
    next(err);
  }
};
