import { products as initialProducts, type Product } from '@/modules/Sales/products';
import { orders as initialOrders, type Order } from '@/modules/Sales/orders';
import { type Invoice } from '@/modules/Sales/invoices';
import { type Payment } from '@/modules/Sales/payments';

const BACKEND_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api';

export interface PosCheckoutPayload {
  shop_id: string;
  customer_id?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_percentage?: number;
  }>;
  payment_method: string;
  discount_amount?: number;
}

// ----------------------------------------------------------------------------
// PRODUCTS & STOCK
// ----------------------------------------------------------------------------
export async function fetchProductsApi(shopId: string = 'shop-001'): Promise<Product[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/products?shop_id=${encodeURIComponent(shopId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.products) && json.products.length > 0) {
        return json.products.map((p: any) => ({
          id: p.product_id || p.id,
          sku: p.sku || p.id,
          name: p.product_name || p.name,
          category: p.category || 'General',
          price: Number(p.selling_price || p.price || 0),
          stock: Number(p.stocks?.[0]?.total_quantity ?? p.stock ?? 25),
          emoji: p.image_url || getEmojiForCategory(p.category),
        }));
      }
    }

    // Auto-seed initial products to backend/Supabase if empty
    await seedInitialProducts(shopId);

    const reFetch = await fetch(`${BACKEND_URL}/products?shop_id=${encodeURIComponent(shopId)}`);
    if (reFetch.ok) {
      const json = await reFetch.json();
      if (json.success && Array.isArray(json.products) && json.products.length > 0) {
        return json.products.map((p: any) => ({
          id: p.product_id || p.id,
          sku: p.sku || p.id,
          name: p.product_name || p.name,
          category: p.category || 'General',
          price: Number(p.selling_price || p.price || 0),
          stock: Number(p.stocks?.[0]?.total_quantity ?? p.stock ?? 25),
          emoji: p.image_url || getEmojiForCategory(p.category),
        }));
      }
    }
  } catch (err) {
    console.warn('fetchProductsApi warning, returning initialProducts:', err);
  }

  return initialProducts;
}

export interface CreateProductInput {
  shopId?: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  taxPercentage?: number;
  description?: string;
  imageUrl?: string;
}

export async function createProductApi(input: CreateProductInput): Promise<{ success: boolean; product?: Product; error?: string }> {
  const shopId = input.shopId || 'shop-001';
  const costPrice = input.costPrice !== undefined ? input.costPrice : Math.round(input.price * 0.7);

  const payload = {
    shop_id: shopId,
    sku: input.sku,
    product_name: input.name,
    category: input.category || 'General',
    cost_price: costPrice,
    selling_price: input.price,
    tax_percentage: input.taxPercentage ?? 18,
    description: input.description || `${input.name} - ${input.category}`,
    image_url: input.imageUrl || '📦',
    initial_quantity: input.stock,
    low_stock_threshold: 5,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (res.ok && json.success && json.product) {
      const p = json.product;
      const createdProd: Product = {
        id: p.product_id || p.id || input.sku,
        sku: p.sku || input.sku,
        name: p.product_name || input.name,
        category: p.category || input.category,
        price: Number(p.selling_price || input.price),
        stock: Number(p.stocks?.[0]?.total_quantity ?? p.stock ?? input.stock),
        emoji: p.image_url || input.imageUrl || '📦',
      };

      const existingIdx = initialProducts.findIndex((prod) => prod.id === createdProd.id || prod.sku === createdProd.sku);
      if (existingIdx >= 0) {
        initialProducts[existingIdx] = createdProd;
      } else {
        initialProducts.unshift(createdProd);
      }

      return { success: true, product: createdProd };
    } else {
      console.warn('createProductApi non-ok or failed response:', json);
      const localProd: Product = {
        id: input.sku || `P-${Date.now()}`,
        sku: input.sku,
        name: input.name,
        category: input.category,
        price: input.price,
        stock: input.stock,
        emoji: input.imageUrl || '📦',
      };
      initialProducts.unshift(localProd);
      return { success: true, product: localProd };
    }
  } catch (err: any) {
    console.warn('createProductApi error, fallback to local insertion:', err);
    const localProd: Product = {
      id: input.sku || `P-${Date.now()}`,
      sku: input.sku,
      name: input.name,
      category: input.category,
      price: input.price,
      stock: input.stock,
      emoji: input.imageUrl || '📦',
    };
    initialProducts.unshift(localProd);
    return { success: true, product: localProd };
  }
}

async function seedInitialProducts(shopId: string) {
  try {
    const productsToImport = initialProducts.map((p) => ({
      sku: p.id,
      product_name: p.name,
      category: p.category,
      cost_price: Math.round(p.price * 0.7),
      selling_price: p.price,
      tax_percentage: 18,
      description: `${p.name} - ${p.category}`,
      image_url: p.emoji,
      initial_quantity: p.stock,
      low_stock_threshold: 5,
    }));

    await fetch(`${BACKEND_URL}/products/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: shopId, products: productsToImport }),
    });
  } catch (e) {
    console.warn('seedInitialProducts notice:', e);
  }
}

function getEmojiForCategory(cat: string): string {
  switch (cat) {
    case 'Electronics': return '💻';
    case 'Audio': return '🎧';
    case 'Accessories': return '⌨️';
    case 'Wearables': return '⌚';
    case 'Displays': return '🖥️';
    default: return '📦';
  }
}

// ----------------------------------------------------------------------------
// ORDERS
// ----------------------------------------------------------------------------
export async function fetchOrdersApi(shopId: string = 'shop-001'): Promise<Order[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/orders?shop_id=${encodeURIComponent(shopId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
        return json.orders.map((o: any) => ({
          id: o.order_id ? `ORD-${o.order_id.slice(0, 5).toUpperCase()}` : o.id,
          raw_id: o.order_id || o.id,
          customer: o.customer_id || o.customer || 'Walk-in Customer',
          date: o.order_date ? new Date(o.order_date).toISOString().split('T')[0] : o.date || 'Today',
          items: Array.isArray(o.order_items) ? o.order_items.length : Number(o.items || 1),
          total: Number(o.total_amount || o.total || 0),
          channel: o.order_type || o.channel || 'POS Store',
          payment: o.payment_status === 'Paid' ? 'Paid' : (o.payment_status === 'Partial' ? 'Partial' : 'Unpaid'),
          status: mapOrderStatus(o.status || o.order_status),
        }));
      }
    }

    // Auto-seed initial orders if empty
    await seedInitialOrders(shopId);

    const reFetch = await fetch(`${BACKEND_URL}/orders?shop_id=${encodeURIComponent(shopId)}`);
    if (reFetch.ok) {
      const json = await reFetch.json();
      if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
        return json.orders.map((o: any) => ({
          id: o.order_id ? `ORD-${o.order_id.slice(0, 5).toUpperCase()}` : o.id,
          raw_id: o.order_id || o.id,
          customer: o.customer_id || o.customer || 'Walk-in Customer',
          date: o.order_date ? new Date(o.order_date).toISOString().split('T')[0] : o.date || 'Today',
          items: Array.isArray(o.order_items) ? o.order_items.length : Number(o.items || 1),
          total: Number(o.total_amount || o.total || 0),
          channel: o.order_type || o.channel || 'POS Store',
          payment: o.payment_status === 'Paid' ? 'Paid' : (o.payment_status === 'Partial' ? 'Partial' : 'Unpaid'),
          status: mapOrderStatus(o.status || o.order_status),
        }));
      }
    }
  } catch (err) {
    console.warn('fetchOrdersApi error:', err);
  }

  return initialOrders;
}

async function seedInitialOrders(shopId: string) {
  try {
    for (const ord of initialOrders) {
      await fetch(`${BACKEND_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          customer_id: ord.customer,
          order_type: ord.channel,
          payment_status: ord.payment === 'Paid' ? 'Paid' : 'Unpaid',
          order_status: ord.status,
          items: [
            {
              product_name: 'Sample Product',
              quantity: ord.items,
              unit_price: Math.round(ord.total / Math.max(1, ord.items)),
              tax_percentage: 18,
            },
          ],
        }),
      });
    }
  } catch (e) {
    console.warn('seedInitialOrders notice:', e);
  }
}

function mapOrderStatus(statusStr: string): 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' {
  if (!statusStr) return 'Pending';
  const clean = statusStr.trim();
  if (['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(clean)) {
    return clean as any;
  }
  if (clean.toLowerCase().includes('process')) return 'Processing';
  if (clean.toLowerCase().includes('ship')) return 'Shipped';
  if (clean.toLowerCase().includes('deliver')) return 'Delivered';
  if (clean.toLowerCase().includes('cancel')) return 'Cancelled';
  return 'Pending';
}

export async function updateOrderStatusApi(rawId: string, status: string, shopId: string = 'shop-001') {
  try {
    const res = await fetch(`${BACKEND_URL}/orders/${rawId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, shop_id: shopId }),
    });
    return res.ok;
  } catch (e) {
    console.error('updateOrderStatusApi error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------------
// POS CHECKOUT
// ----------------------------------------------------------------------------
export async function posCheckoutApi(payload: PosCheckoutPayload): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: payload.shop_id || 'shop-001',
        customer_id: payload.customer_id || 'Walk-in Customer',
        items: payload.items,
        payment_method: payload.payment_method || 'Cash',
        discount_amount: payload.discount_amount || 0,
      }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, order: json.order };
    }
    return { success: false, error: json.error || 'Checkout failed' };
  } catch (err: any) {
    console.error('posCheckoutApi error:', err);
    return { success: false, error: err?.message || 'Network error during checkout' };
  }
}

// ----------------------------------------------------------------------------
// INVOICES & PAYMENTS
// ----------------------------------------------------------------------------
export async function fetchInvoicesApi(shopId: string = 'shop-001'): Promise<Invoice[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/invoices?shop_id=${encodeURIComponent(shopId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.invoices) && json.invoices.length > 0) {
        return json.invoices.map((i: any) => ({
          id: i.invoice_number || i.invoice_id || i.id,
          customer: i.customer_id || i.customer || 'Customer',
          date: i.issue_date ? new Date(i.issue_date).toISOString().split('T')[0] : i.date || 'Today',
          dueDate: i.due_date ? new Date(i.due_date).toISOString().split('T')[0] : i.dueDate || '14 days',
          amount: Number(i.total_amount ? (i.total_amount / 1.18) : i.amount || 0),
          tax: Number(i.total_amount ? (i.total_amount - (i.total_amount / 1.18)) : i.tax || 0),
          total: Number(i.total_amount || i.total || 0),
          status: i.status === 'Paid' ? 'Paid' : (i.status === 'Overdue' ? 'Overdue' : 'Sent'),
          items: [],
          ownerAdminEmail: shopId,
        }));
      }
    }
  } catch (e) {
    console.warn('fetchInvoicesApi notice:', e);
  }
  return [];
}

export async function fetchPaymentsApi(shopId: string = 'shop-001'): Promise<Payment[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/payments?shop_id=${encodeURIComponent(shopId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.payments) && json.payments.length > 0) {
        return json.payments.map((p: any) => ({
          id: p.payment_id ? `PAY-${p.payment_id.slice(0, 5).toUpperCase()}` : p.id,
          invoiceId: p.invoice_id ? `INV-${p.invoice_id.slice(0, 5).toUpperCase()}` : (p.invoiceId || 'INV-1001'),
          customer: p.customer_id || p.customer || 'Customer',
          date: p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : p.date || 'Today',
          amount: Number(p.amount_paid || p.amount || 0),
          method: p.payment_method || 'Cash',
          status: p.payment_status === 'Paid' ? 'Completed' : (p.payment_status || 'Completed'),
        }));
      }
    }
  } catch (e) {
    console.warn('fetchPaymentsApi notice:', e);
  }
  return [];
}
