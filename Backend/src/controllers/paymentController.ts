import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { PaymentService } from '../services/paymentService';

const paymentService = new PaymentService();

export const recordPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const { invoice_id, vendor_id, payment_type, payment_method, amount_paid, reference_number, payment_status } = req.body;

    if (!payment_type || !payment_method || !amount_paid) {
      return res.status(400).json({ error: 'payment_type, payment_method, and amount_paid are required' });
    }

    const payment = await paymentService.recordPayment({
      shop_id: shopId,
      invoice_id,
      vendor_id,
      payment_type,
      payment_method,
      amount_paid: Number(amount_paid),
      reference_number,
      payment_status,
    });

    return res.status(201).json({ success: true, payment });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const payments = await paymentService.getPaymentsByShop(shopId);
    return res.json({ success: true, payments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getOutstanding = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const result = await paymentService.getOutstanding(shopId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
