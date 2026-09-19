import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CreditService } from '../services/creditService';

const creditService = new CreditService();

function extractShopId(req: AuthenticatedRequest): string {
  return (
    (req.headers['x-shop-id'] as string) ||
    req.body?.shop_id ||
    req.query?.shop_id ||
    req.user?.shop_id ||
    'shop-001'
  );
}

function extractUserId(req: AuthenticatedRequest): string {
  return req.user?.id || req.body?.user_id || req.body?.staff_id || 'staff-001';
}

// ============================================================================
// CUSTOMER CREDIT CONTROLLERS
// ============================================================================

export const getCustomerCreditStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const customerId = req.params.customer_id || req.params.id;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID is required' });
    }

    const status = await creditService.getCustomerCreditStatus(shopId, customerId);
    return res.json({ success: true, data: status });
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const recordCreditSale = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const staffId = extractUserId(req);
    const {
      customer_id,
      customerId,
      sale_amount,
      saleAmount,
      payment_received_today,
      paymentReceivedToday,
      items,
      notes,
    } = req.body;

    const targetCustomerId = customer_id || customerId;
    const targetAmount = sale_amount !== undefined ? sale_amount : saleAmount;
    const targetPaidToday =
      payment_received_today !== undefined ? payment_received_today : paymentReceivedToday;

    if (!targetCustomerId) {
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }
    if (targetAmount === undefined || Number(targetAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'sale_amount must be greater than zero' });
    }

    const result = await creditService.recordCreditSale(shopId, staffId, {
      customerId: targetCustomerId,
      saleAmount: Number(targetAmount),
      paymentReceivedToday: Number(targetPaidToday || 0),
      items,
      notes,
      staffMemberId: staffId,
    });

    return res.status(201).json({
      success: true,
      message: 'Credit sale recorded successfully',
      data: result,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'CREDIT_SALE_ERROR',
      details: err.data,
    });
  }
};

export const recordCustomerPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const userId = extractUserId(req);
    const {
      customer_id,
      customerId,
      amount_paid,
      amountPaid,
      payment_method,
      paymentMethod,
      payment_date,
      paymentDate,
      notes,
    } = req.body;

    const targetCustomerId = customer_id || customerId;
    const targetAmount = amount_paid !== undefined ? amount_paid : amountPaid;
    const targetMethod = payment_method || paymentMethod || 'Cash';
    const targetDate = payment_date || paymentDate;

    if (!targetCustomerId) {
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }
    if (targetAmount === undefined || Number(targetAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'amount_paid must be greater than zero' });
    }

    const result = await creditService.recordCustomerPayment(shopId, userId, {
      customerId: targetCustomerId,
      amountPaid: Number(targetAmount),
      paymentMethod: targetMethod,
      paymentDate: targetDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Customer payment recorded successfully',
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getCustomerCreditLedger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const customerId = req.params.customer_id || req.params.id;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID is required' });
    }

    const ledger = await creditService.getCustomerCreditLedger(shopId, customerId);
    return res.json({ success: true, data: ledger });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const updateCustomerCreditLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const customerId = req.params.customer_id || req.params.id;
    const { credit_limit, creditLimit } = req.body;
    const newLimit = credit_limit !== undefined ? credit_limit : creditLimit;

    if (newLimit === undefined || Number(newLimit) < 0) {
      return res.status(400).json({ success: false, error: 'Valid credit_limit (>= 0) is required' });
    }

    const updatedStatus = await creditService.updateCustomerCreditLimit(
      shopId,
      customerId,
      Number(newLimit)
    );

    return res.json({
      success: true,
      message: `Credit limit updated to ${Number(newLimit).toLocaleString()} PKR`,
      data: updatedStatus,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getCustomerCreditReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const sortBy = req.query.sortBy as any;
    const order = req.query.order as any;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const report = await creditService.getCustomerCreditReport(shopId, {
      sortBy,
      order,
      search,
      status,
    });

    return res.json({ success: true, ...report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getCustomerOverdueReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const thresholdDays = Number(req.query.thresholdDays || 30);

    const report = await creditService.getOverdueReport(shopId, thresholdDays);
    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// VENDOR CREDIT CONTROLLERS
// ============================================================================

export const getVendorCreditStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const vendorId = req.params.vendor_id || req.params.id;

    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'Vendor ID is required' });
    }

    const status = await creditService.getVendorCreditStatus(shopId, vendorId);
    return res.json({ success: true, data: status });
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const recordCreditPurchase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const userId = extractUserId(req);
    const {
      vendor_id,
      vendorId,
      purchase_amount,
      purchaseAmount,
      payment_paid_today,
      paymentPaidToday,
      items,
      allow_override,
      allowOverride,
      notes,
    } = req.body;

    const targetVendorId = vendor_id || vendorId;
    const targetAmount = purchase_amount !== undefined ? purchase_amount : purchaseAmount;
    const targetPaidToday =
      payment_paid_today !== undefined ? payment_paid_today : paymentPaidToday;
    const targetOverride = allow_override !== undefined ? allow_override : allowOverride;

    if (!targetVendorId) {
      return res.status(400).json({ success: false, error: 'vendor_id is required' });
    }
    if (targetAmount === undefined || Number(targetAmount) <= 0) {
      return res
        .status(400)
        .json({ success: false, error: 'purchase_amount must be greater than zero' });
    }

    const result = await creditService.recordCreditPurchase(shopId, userId, {
      vendorId: targetVendorId,
      purchaseAmount: Number(targetAmount),
      paymentPaidToday: Number(targetPaidToday || 0),
      items,
      allowOverride: Boolean(targetOverride),
      notes,
    });

    return res.status(201).json({
      success: true,
      message: result.overrideApplied
        ? 'Credit purchase approved via admin override'
        : 'Credit purchase recorded successfully',
      data: result,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'CREDIT_PURCHASE_ERROR',
      details: err.data,
    });
  }
};

export const recordVendorPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const userId = extractUserId(req);
    const {
      vendor_id,
      vendorId,
      amount_paid,
      amountPaid,
      payment_method,
      paymentMethod,
      payment_date,
      paymentDate,
      notes,
    } = req.body;

    const targetVendorId = vendor_id || vendorId;
    const targetAmount = amount_paid !== undefined ? amount_paid : amountPaid;

    if (!targetVendorId) {
      return res.status(400).json({ success: false, error: 'vendor_id is required' });
    }
    if (targetAmount === undefined || Number(targetAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'amount_paid must be greater than zero' });
    }

    const result = await creditService.recordVendorPayment(shopId, userId, {
      vendorId: targetVendorId,
      amountPaid: Number(targetAmount),
      paymentMethod: payment_method || paymentMethod || 'Cash',
      paymentDate: payment_date || paymentDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor payment recorded successfully',
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getVendorCreditLedger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const vendorId = req.params.vendor_id || req.params.id;

    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'Vendor ID is required' });
    }

    const ledger = await creditService.getVendorCreditLedger(shopId, vendorId);
    return res.json({ success: true, data: ledger });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const updateVendorCreditLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const vendorId = req.params.vendor_id || req.params.id;
    const { credit_limit, creditLimit } = req.body;
    const newLimit = credit_limit !== undefined ? credit_limit : creditLimit;

    if (newLimit === undefined || Number(newLimit) < 0) {
      return res.status(400).json({ success: false, error: 'Valid credit_limit (>= 0) is required' });
    }

    const updatedStatus = await creditService.updateVendorCreditLimit(
      shopId,
      vendorId,
      Number(newLimit)
    );

    return res.json({
      success: true,
      message: `Vendor credit limit updated to ${Number(newLimit).toLocaleString()} PKR`,
      data: updatedStatus,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getVendorCreditReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const sortBy = req.query.sortBy as any;
    const order = req.query.order as any;

    const report = await creditService.getVendorCreditReport(shopId, { sortBy, order });
    return res.json({ success: true, ...report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// RUNNING SALES HISTORY
// ============================================================================

export const getRunningSalesHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const shopId = extractShopId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const result = await creditService.getRunningSalesHistory(shopId, {
      page,
      limit,
      dateFrom,
      dateTo,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
