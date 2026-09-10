import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ProductService } from '../services/productService';

const productService = new ProductService();

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const { sku, product_name, category, cost_price, selling_price, tax_percentage, description, image_url, initial_quantity, low_stock_threshold } = req.body;

    if (!sku || !product_name || cost_price === undefined || selling_price === undefined) {
      return res.status(400).json({ error: 'sku, product_name, cost_price, and selling_price are required' });
    }

    const product = await productService.createProduct({
      shop_id: shopId,
      sku,
      product_name,
      category,
      cost_price: Number(cost_price),
      selling_price: Number(selling_price),
      tax_percentage: Number(tax_percentage || 0),
      description,
      image_url,
      initial_quantity: Number(initial_quantity || 0),
      low_stock_threshold: Number(low_stock_threshold || 5),
    });

    return res.status(201).json({ success: true, product });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const products = await productService.getProductsWithStock(shopId);
    return res.json({ success: true, products });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id } = req.params;
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const stock = await productService.getStockByProductId(product_id, shopId);
    return res.json({ success: true, stock });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const importProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const productList = req.body.products || req.body.items || [];

    if (!Array.isArray(productList) || productList.length === 0) {
      return res.status(400).json({ error: 'products array is required for bulk import' });
    }

    const result = await productService.bulkImportProducts(shopId, productList);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
