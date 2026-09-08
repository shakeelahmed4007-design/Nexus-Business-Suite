import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CustomerService } from '../services/customerService';

const customerService = new CustomerService();

export const createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'User does not belong to any active shop', code: 'BAD_REQUEST' });
    }

    const customer = await customerService.createCustomer(userId, shopId, req.body);
    return res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await customerService.getCustomers(userId, shopId, {
      page,
      limit,
      search: req.query.search as string,
      type: req.query.type as any,
      status: req.query.status as any,
      paymentTerms: req.query.paymentTerms as any,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });

    return res.json({
      success: true,
      data: result.customers,
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

export const getCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const customer = await customerService.getCustomer(userId, shopId, id);
    return res.json({
      success: true,
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const updated = await customerService.updateCustomer(userId, shopId, id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: 'Customer updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    await customerService.deleteCustomer(userId, shopId, id);
    return res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const convertLeadToCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { leadId } = req.params;

    const customer = await customerService.convertLeadToCustomer(userId, shopId, leadId);
    return res.status(201).json({
      success: true,
      data: customer,
      message: 'Lead successfully converted to Customer',
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerOrderHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const orders = await customerService.getOrderHistory(userId, shopId, id);
    return res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerPaymentHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const shopId = req.user?.shop_id || '';
    const { id } = req.params;

    const payments = await customerService.getPaymentHistory(userId, shopId, id);
    return res.json({
      success: true,
      data: payments,
    });
  } catch (err) {
    next(err);
  }
};
