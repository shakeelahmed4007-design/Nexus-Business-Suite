import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { StockMovementService } from '../services/stockMovementService';

const stockMovementService = new StockMovementService();

export const getStockMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const productId = req.query.product_id as string;
    const movements = await stockMovementService.getStockMovements(shopId, productId);
    return res.json({ success: true, movements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
