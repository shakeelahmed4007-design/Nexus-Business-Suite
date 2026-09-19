import { supabaseAdmin } from '../config/supabaseAdmin';

export class StockMovementService {
  async getStockMovements(shopId: string, productId?: string) {
    let query = supabaseAdmin
      .from('stock_movements')
      .select('*, products(product_name, sku)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: movements, error } = await query;
    if (error) throw new Error(error.message);
    return movements || [];
  }
}
