import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CallingDataService } from '../services/callingDataService';

const callingDataService = new CallingDataService();

export const addCallingNumber = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'User does not belong to any active shop', code: 'BAD_REQUEST' });
    }

    const record = await callingDataService.addCallingNumber(userId, shopId, req.body);
    return res.status(201).json({
      success: true,
      data: record,
      message: 'Calling number added successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const bulkUploadCallingData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const rows = req.body.data || req.body.rows || req.body;

    const result = await callingDataService.bulkUploadCallingData(userId, shopId, rows);
    return res.json({
      success: true,
      data: result,
      message: `Bulk upload completed: ${result.imported} imported, ${result.failed} failed`,
    });
  } catch (err) {
    next(err);
  }
};

export const getCallingData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await callingDataService.getCallingData(userId, shopId, {
      page,
      limit,
      status: req.query.status as any,
      dataType: req.query.dataType as any,
      search: req.query.search as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });

    return res.json({
      success: true,
      data: result.data,
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

export const getAvailableNumbers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const result = await callingDataService.getAvailableNumbers(userId, shopId);
    return res.json({
      success: true,
      data: result.numbers,
      totalAvailable: result.total,
    });
  } catch (err) {
    next(err);
  }
};

export const assignCallingData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const updated = await callingDataService.assignCallingData(userId, shopId, id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: 'Calling data assigned successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const logCall = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const result = await callingDataService.logCall(userId, shopId, id, req.body);
    return res.json({
      success: true,
      data: result.record,
      callHistory: result.callHistory,
      message: 'Call logged successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const reassignCallingData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const updated = await callingDataService.reassignCallingData(userId, shopId, id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: 'Calling data reassigned successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCallingData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    await callingDataService.deleteCallingData(userId, shopId, id);
    return res.json({
      success: true,
      message: 'Calling data deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getCallHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const history = await callingDataService.getCallHistory(id);
    return res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
};

export const runExpiryChecker = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await callingDataService.checkAndExpireCallingData();
    return res.json({
      success: true,
      data: result,
      message: `Expiry check complete. ${result.expired} records returned to pool.`,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyAssignedCallingData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const list = await callingDataService.getMyAssignedCallingData(userId, shopId);
    return res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
};
