import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { OrderService } from '../services/orderService';

const orderService = new OrderService();

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const { customer_id, order_type, items, discount_amount, discount_type, notes, order_status, payment_status } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const result = await orderService.createOrder(
      {
        shop_id: shopId,
        customer_id,
        order_type,
        items,
        discount_amount: Number(discount_amount || 0),
        discount_type,
        notes,
        order_status,
        payment_status,
      },
      req.user?.id
    );

    return res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const status = req.query.status as string;
    const orders = await orderService.getOrders(shopId, status);
    return res.json({ success: true, orders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id } = req.params;
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const order = await orderService.getOrderById(order_id, shopId);
    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';

    if (!status) {
      return res.status(400).json({ error: 'status field is required' });
    }

    const result = await orderService.updateOrderStatus(order_id, shopId, status, req.user?.id);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
