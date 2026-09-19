import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { POSService } from '../services/posService';

const posService = new POSService();

export const openSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';
    const openingBalance = Number(req.body.opening_balance || 0);

    const session = await posService.openSession({
      shop_id: shopId,
      staff_id: staffId,
      opening_balance: openingBalance,
    });

    return res.status(201).json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const closeSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const { session_id, closing_balance, expenses } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const session = await posService.closeSession({
      shop_id: shopId,
      session_id,
      closing_balance: closing_balance !== undefined ? Number(closing_balance) : undefined,
      expenses: expenses !== undefined ? Number(expenses) : undefined,
    });

    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const checkout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const staffId = req.body.staff_id || req.user?.id || 'staff-001';
    const { customer_id, items, payment_method, discount_amount, discount_type, session_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const result = await posService.checkout({
      shop_id: shopId,
      staff_id: staffId,
      customer_id,
      items,
      payment_method,
      discount_amount: Number(discount_amount || 0),
      discount_type,
      session_id,
    });

    return res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
