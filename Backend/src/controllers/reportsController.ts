import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/supabaseAdmin';

export const getInventoryDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*, stocks(*)')
      .eq('shop_id', shopId);

    const totalProducts = (products || []).length;
    let lowStockCount = 0;
    let totalInventoryValue = 0;

    (products || []).forEach((p: any) => {
      const stock = Array.isArray(p.stocks) ? p.stocks[0] : p.stocks;
      const totalQty = stock?.total_quantity || 0;
      const reservedQty = stock?.reserved_quantity || 0;
      const threshold = stock?.low_stock_threshold || 5;

      if ((totalQty - reservedQty) <= threshold) {
        lowStockCount++;
      }
      totalInventoryValue += (totalQty * Number(p.cost_price || 0));
    });

    return res.json({
      success: true,
      data: {
        total_products: totalProducts,
        low_stock_items: lowStockCount,
        total_inventory_value: totalInventoryValue,
        fast_moving: (products || []).slice(0, 5),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getSalesDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('shop_id', shopId)
      .neq('order_status', 'Cancelled');

    let totalSales = 0;
    let totalOrders = (orders || []).length;
    const categorySales: Record<string, number> = {};

    (orders || []).forEach((ord: any) => {
      totalSales += Number(ord.total_amount || 0);
      (ord.order_items || []).forEach((item: any) => {
        const cat = item.products?.category || 'General';
        categorySales[cat] = (categorySales[cat] || 0) + Number(item.line_total || 0);
      });
    });

    return res.json({
      success: true,
      data: {
        total_sales: totalSales,
        total_orders: totalOrders,
        sales_by_category: categorySales,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getFinancialDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('payment_status', 'Paid');

    let totalIncoming = 0;
    let totalOutgoing = 0;

    (payments || []).forEach((p: any) => {
      if (p.payment_type === 'Incoming') totalIncoming += Number(p.amount_paid || 0);
      if (p.payment_type === 'Outgoing') totalOutgoing += Number(p.amount_paid || 0);
    });

    return res.json({
      success: true,
      data: {
        total_incoming_paid: totalIncoming,
        total_outgoing_paid: totalOutgoing,
        net_profit: totalIncoming - totalOutgoing,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
