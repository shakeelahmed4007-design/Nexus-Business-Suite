import { supabaseAdmin } from '../config/supabaseAdmin';
import { toSafeUUID } from '../utils/uuidHelper';

export interface ProductInput {
  shop_id: string;
  sku: string;
  product_name: string;
  category?: string;
  cost_price: number;
  selling_price: number;
  tax_percentage?: number;
  description?: string;
  image_url?: string;
  status?: 'Active' | 'Inactive' | 'Discontinued';
  initial_quantity?: number;
  low_stock_threshold?: number;
  warehouse_location?: string;
}

export class ProductService {
  async createProduct(data: ProductInput) {
    const shopId = toSafeUUID(data.shop_id);
    // 1. Insert Product
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .insert({
        shop_id: shopId,
        sku: data.sku,
        product_name: data.product_name,
        category: data.category || 'General',
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        tax_percentage: data.tax_percentage || 0.00,
        description: data.description || null,
        image_url: data.image_url || null,
        status: data.status || 'Active',
      })
      .select()
      .single();

    if (prodErr) throw new Error(prodErr.message);

    // 2. Initialize Stock Entry
    const initialQty = data.initial_quantity || 0;
    const { data: stock, error: stockErr } = await supabaseAdmin
      .from('stocks')
      .insert({
        product_id: product.product_id,
        shop_id: shopId,
        total_quantity: initialQty,
        reserved_quantity: 0,
        low_stock_threshold: data.low_stock_threshold !== undefined ? data.low_stock_threshold : 5,
        warehouse_location: data.warehouse_location || 'Main Warehouse',
      })
      .select()
      .single();

    if (stockErr) console.warn('Stock entry warning:', stockErr.message);

    return { ...product, stock };
  }

  async getProductsWithStock(shopIdInput: string) {
    const shopId = toSafeUUID(shopIdInput);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (prodErr) throw new Error(prodErr.message);
    if (!products || products.length === 0) return [];

    const productIds = products.map((p) => p.product_id);
    const { data: stocks } = await supabaseAdmin
      .from('stocks')
      .select('*')
      .in('product_id', productIds);

    const stockMap = new Map();
    (stocks || []).forEach((s) => stockMap.set(s.product_id, s));

    return products.map((p) => {
      const stock = stockMap.get(p.product_id) || {
        total_quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 5,
        available_quantity: 0,
      };
      const available_quantity = Math.max(0, (stock.total_quantity || 0) - (stock.reserved_quantity || 0));
      return {
        ...p,
        stock: {
          ...stock,
          available_quantity,
        },
      };
    });
  }

  async getStockByProductId(productId: string, shopId: string) {
    const { data: stock, error } = await supabaseAdmin
      .from('stocks')
      .select('*')
      .eq('product_id', productId)
      .eq('shop_id', shopId)
      .single();

    if (error) throw new Error(error.message);
    const available_quantity = Math.max(0, (stock.total_quantity || 0) - (stock.reserved_quantity || 0));
    return {
      ...stock,
      available_quantity,
    };
  }

  async bulkImportProducts(shopId: string, productList: Array<Partial<ProductInput>>) {
    const created: any[] = [];
    const errors: any[] = [];

    for (const item of productList) {
      try {
        if (!item.sku || !item.product_name) {
          errors.push({ item, error: 'SKU and product_name required' });
          continue;
        }
        const res = await this.createProduct({
          shop_id: shopId,
          sku: item.sku,
          product_name: item.product_name,
          category: item.category || 'General',
          cost_price: Number(item.cost_price) || 0,
          selling_price: Number(item.selling_price) || 0,
          tax_percentage: Number(item.tax_percentage) || 0,
          description: item.description,
          initial_quantity: Number(item.initial_quantity) || 0,
        });
        created.push(res);
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    return { importedCount: created.length, created, errors };
  }
}
