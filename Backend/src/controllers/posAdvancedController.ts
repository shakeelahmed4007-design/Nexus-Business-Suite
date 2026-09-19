import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { PosAdvancedService } from '../services/posAdvancedService';

const posAdvancedService = new PosAdvancedService();

export const checkCreditAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const customerId = req.params.customer_id;
    const attemptedCredit = Number(req.query.attempted_credit || 0);

    if (!customerId) {
      return res.status(400).json({ error: 'customer_id parameter is required' });
    }

    const result = await posAdvancedService.getCreditAvailability(shopId, customerId, attemptedCredit);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const advancedSaleCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';

    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      sale_type,
      items,
      subtotal,
      discount_amount,
      bulk_discount_percent,
      bulk_discount_reason,
      tax_rate_applied,
      tax_amount,
      total_amount,
      cash_received,
      credit_given,
      payment_method,
      reference_number,
      check_number,
      card_last4,
      admin_override_reason,
      admin_override_by,
      session_id,
      reservation_ids,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const result = await posAdvancedService.executeAdvancedSale({
      shop_id: shopId,
      staff_id: staffId,
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      sale_type: sale_type || 'RUNNING',
      items,
      subtotal: Number(subtotal || 0),
      discount_amount: Number(discount_amount || 0),
      bulk_discount_percent: Number(bulk_discount_percent || 0),
      bulk_discount_reason,
      tax_rate_applied: tax_rate_applied !== undefined ? Number(tax_rate_applied) : undefined,
      tax_amount: Number(tax_amount || 0),
      total_amount: Number(total_amount || 0),
      cash_received: Number(cash_received || 0),
      credit_given: Number(credit_given || 0),
      payment_method,
      reference_number,
      check_number,
      card_last4,
      admin_override_reason,
      admin_override_by: admin_override_by || staffId,
      session_id,
      reservation_ids,
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const reserveInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'product_id and quantity are required' });
    }

    const reservation = await posAdvancedService.reserveInventory(
      shopId,
      staffId,
      product_id,
      Number(quantity),
    );

    return res.status(201).json({ success: true, reservation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const releaseInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const reservationId = req.params.reservation_id;

    await posAdvancedService.releaseReservation(shopId, reservationId);
    return res.json({ success: true, message: 'Reservation released successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const processReturn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';
    const { original_sale_id, customer_id, items, return_reason, refund_type } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const result = await posAdvancedService.processReturn({
      shop_id: shopId,
      staff_id: staffId,
      original_sale_id,
      customer_id,
      items,
      return_reason: return_reason || 'Customer Return',
      refund_type: refund_type || 'Cash',
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const reconcileStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';
    const { product_id, physical_count, notes } = req.body;

    if (!product_id || physical_count === undefined) {
      return res.status(400).json({ error: 'product_id and physical_count are required' });
    }

    const result = await posAdvancedService.reconcileStock({
      shop_id: shopId,
      staff_id: staffId,
      product_id,
      physical_count: Number(physical_count),
      notes,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const recordPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';
    const {
      customer_id,
      amount_paid,
      payment_date,
      payment_method,
      reference_number,
      check_number,
      card_last4,
      notes,
    } = req.body;

    if (!customer_id || !amount_paid) {
      return res.status(400).json({ error: 'customer_id and amount_paid are required' });
    }

    const record = await posAdvancedService.recordDetailedPayment({
      shop_id: shopId,
      customer_id,
      amount_paid: Number(amount_paid),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method: payment_method || 'Cash',
      reference_number,
      check_number,
      card_last4,
      received_by_user_id: staffId,
      notes,
    });

    return res.status(201).json({ success: true, payment: record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const generateCustomerStatement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const customerId = req.params.customer_id;
    const period = req.params.period || new Date().toISOString().slice(0, 7);

    const statement = await posAdvancedService.generateCustomerStatement(shopId, customerId, period);
    return res.json({ success: true, statement });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const sendCustomerStatement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.body.shop_id as string) || req.user?.shop_id || 'shop-001';
    const statementId = req.params.statement_id;

    const result = await posAdvancedService.sendCustomerStatement(shopId, statementId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getCustomerStatementHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const customerId = req.params.customer_id;

    const history = await posAdvancedService.getCustomerStatementHistory(shopId, customerId);
    return res.json({ success: true, statements: history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getShopSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const settings = await posAdvancedService.getShopSettings(shopId);
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateShopSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const settings = await posAdvancedService.updateShopSettings(shopId, req.body);
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
