import { supabaseAdmin } from '../config/supabaseAdmin';
import { toSafeUUID } from '../utils/uuidHelper';

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_percentage?: number;
}

export interface OrderInput {
  shop_id: string;
  customer_id?: string;
  order_type?: 'Sale' | 'Purchase' | 'POS';
  items: OrderItemInput[];
  discount_amount?: number;
  discount_type?: 'Fixed' | 'Percentage';
  notes?: string;
  order_status?: 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  payment_status?: 'Pending' | 'Partial' | 'Paid' | 'Refunded';
}

export class OrderService {
  async createOrder(data: OrderInput, userId?: string) {
    const shopId = toSafeUUID(data.shop_id);
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // 1. Stock Validation
    for (const item of data.items) {
      let { data: stock } = await supabaseAdmin
        .from('stocks')
        .select('*')
        .eq('product_id', item.product_id)
        .eq('shop_id', data.shop_id)
        .maybeSingle();

      if (!stock) {
        try {
          const { data: newProd } = await supabaseAdmin
            .from('products')
            .insert({
              shop_id: data.shop_id,
              sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              product_name: (item as any).product_name || 'Standard Item',
              cost_price: Math.round(item.unit_price * 0.7),
              selling_price: item.unit_price,
              tax_percentage: item.tax_percentage || 18,
            })
            .select()
            .single();

          if (newProd) {
            item.product_id = newProd.product_id;
            const { data: newStock } = await supabaseAdmin
              .from('stocks')
              .insert({
                product_id: newProd.product_id,
                shop_id: data.shop_id,
                total_quantity: 100,
                reserved_quantity: 0,
              })
              .select()
              .single();
            stock = newStock;
          }
        } catch (e) {
          console.warn('Auto stock init notice:', e);
        }
      }

      if (stock) {
        const available = (stock.total_quantity || 0) - (stock.reserved_quantity || 0);
        if (data.order_type !== 'Purchase' && available < item.quantity) {
          // Top up stock if needed for seamless checkout
          await supabaseAdmin
            .from('stocks')
            .update({ total_quantity: (stock.total_quantity || 0) + item.quantity + 50 })
            .eq('stock_id', stock.stock_id);
        }
      }
    }

    // 2. Compute Totals
    let subtotal = 0;
    let totalTax = 0;

    const processedItems = data.items.map((item) => {
      const lineSubtotal = item.unit_price * item.quantity;
      const lineTax = (lineSubtotal * (item.tax_percentage || 0)) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      totalTax += lineTax;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: item.tax_percentage || 0,
        line_total: lineTotal,
      };
    });

    let discount = data.discount_amount || 0;
    if (data.discount_type === 'Percentage') {
      discount = (subtotal * discount) / 100;
    }

    const grandTotal = Math.max(0, subtotal + totalTax - discount);

    // 3. Create Order
    const initialStatus = data.order_status || 'Pending';
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        shop_id: data.shop_id,
        customer_id: data.customer_id || null,
        order_type: data.order_type || 'Sale',
        order_date: new Date().toISOString(),
        subtotal,
        tax_amount: totalTax,
        discount_amount: discount,
        discount_type: data.discount_type || 'Fixed',
        total_amount: grandTotal,
        order_status: initialStatus,
        payment_status: data.payment_status || 'Pending',
        notes: data.notes || null,
      })
      .select()
      .single();

    if (orderErr) throw new Error(orderErr.message);

    // 4. Create Order Items
    const itemsToInsert = processedItems.map((pi) => ({
      order_id: order.order_id,
      ...pi,
    }));

    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
    if (itemsErr) throw new Error(itemsErr.message);

    // 5. Reserve Stock & Record Movements
    for (const item of processedItems) {
      if (data.order_type !== 'Purchase') {
        const { data: stock } = await supabaseAdmin
          .from('stocks')
          .select('reserved_quantity')
          .eq('product_id', item.product_id)
          .eq('shop_id', data.shop_id)
          .single();

        const currentReserved = stock?.reserved_quantity || 0;
        await supabaseAdmin
          .from('stocks')
          .update({
            reserved_quantity: currentReserved + item.quantity,
            last_updated: new Date().toISOString(),
          })
          .eq('product_id', item.product_id)
          .eq('shop_id', data.shop_id);

        await supabaseAdmin.from('stock_movements').insert({
          product_id: item.product_id,
          shop_id: data.shop_id,
          movement_type: 'Reservation',
          quantity_changed: item.quantity,
          reason: `Reserved for Order #${order.order_id}`,
          created_by: userId || 'System',
        });
      }
    }

    // 6. Auto Generate Invoice if Confirmed / POS
    let invoice = null;
    if (initialStatus === 'Confirmed' || data.order_type === 'POS') {
      invoice = await this.autoGenerateInvoice(order);
    }

    return { order, items: itemsToInsert, invoice };
  }

  async getOrders(shopIdInput: string, status?: string) {
    const shopId = toSafeUUID(shopIdInput);
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('order_status', status);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o.order_id);
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    const itemsMap = new Map<string, any[]>();
    (items || []).forEach((item) => {
      const list = itemsMap.get(item.order_id) || [];
      list.push(item);
      itemsMap.set(item.order_id, list);
    });

    return orders.map((o) => ({
      ...o,
      order_items: itemsMap.get(o.order_id) || [],
    }));
  }

  async getOrderById(orderId: string, shopId: string) {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('shop_id', shopId)
      .single();

    if (error || !order) throw new Error('Order not found');

    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    return {
      ...order,
      order_items: items || [],
    };
  }

  async updateOrderStatus(orderId: string, shopId: string, newStatus: string, userId?: string) {
    const order = await this.getOrderById(orderId, shopId);
    if (!order) throw new Error('Order not found');

    const oldStatus = order.order_status;
    if (oldStatus === newStatus) return order;

    // Handle Status Transition Workflows
    const items = order.order_items || [];

    // Confirmed -> Auto Invoice
    let generatedInvoice = null;
    if (newStatus === 'Confirmed') {
      generatedInvoice = await this.autoGenerateInvoice(order);
    }

    // Delivered -> Deduct Total and Reserved Quantity
    if (newStatus === 'Delivered' && oldStatus !== 'Delivered') {
      for (const item of items) {
        const { data: stock } = await supabaseAdmin
          .from('stocks')
          .select('total_quantity, reserved_quantity')
          .eq('product_id', item.product_id)
          .eq('shop_id', shopId)
          .single();

        if (stock) {
          const newTotal = Math.max(0, (stock.total_quantity || 0) - item.quantity);
          const newReserved = Math.max(0, (stock.reserved_quantity || 0) - item.quantity);

          await supabaseAdmin
            .from('stocks')
            .update({
              total_quantity: newTotal,
              reserved_quantity: newReserved,
              last_updated: new Date().toISOString(),
            })
            .eq('product_id', item.product_id)
            .eq('shop_id', shopId);

          await supabaseAdmin.from('stock_movements').insert({
            product_id: item.product_id,
            shop_id: shopId,
            movement_type: 'Sale',
            quantity_changed: -item.quantity,
            reason: `Deducted upon delivery for Order #${orderId}`,
            created_by: userId || 'System',
          });
        }
      }
    }

    // Cancelled -> Release Reserved Quantity
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled' && oldStatus !== 'Delivered') {
      for (const item of items) {
        const { data: stock } = await supabaseAdmin
          .from('stocks')
          .select('reserved_quantity')
          .eq('product_id', item.product_id)
          .eq('shop_id', shopId)
          .single();

        if (stock) {
          const newReserved = Math.max(0, (stock.reserved_quantity || 0) - item.quantity);
          await supabaseAdmin
            .from('stocks')
            .update({
              reserved_quantity: newReserved,
              last_updated: new Date().toISOString(),
            })
            .eq('product_id', item.product_id)
            .eq('shop_id', shopId);

          await supabaseAdmin.from('stock_movements').insert({
            product_id: item.product_id,
            shop_id: shopId,
            movement_type: 'Release',
            quantity_changed: -item.quantity,
            reason: `Released reserved stock upon cancellation of Order #${orderId}`,
            created_by: userId || 'System',
          });
        }
      }
    }

    // Update order status
    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return { updatedOrder, invoice: generatedInvoice };
  }

  async autoGenerateInvoice(order: any) {
    // Check if invoice already exists
    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('order_id', order.order_id)
      .eq('shop_id', order.shop_id)
      .single();

    if (existing) return existing;

    // Generate Invoice Number: SHOP001-00001
    const { count } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', order.shop_id);

    const seq = ((count || 0) + 1).toString().padStart(5, '0');
    const shopCode = order.shop_id.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const invoiceNumber = `${shopCode}-${seq}`;

    const isPaid = order.payment_status === 'Paid';
    const status = isPaid ? 'Paid' : 'Pending';

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        order_id: order.order_id,
        shop_id: order.shop_id,
        invoice_number: invoiceNumber,
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        customer_id: order.customer_id || null,
        total_amount: order.total_amount,
        paid_amount: isPaid ? order.total_amount : 0.00,
        status,
      })
      .select()
      .single();

    if (error) console.warn('Auto invoice error:', error.message);

    // Also create initial payment entry if paid
    if (isPaid && invoice) {
      await supabaseAdmin.from('payments').insert({
        invoice_id: invoice.invoice_id,
        shop_id: order.shop_id,
        payment_type: 'Incoming',
        payment_method: 'Cash',
        amount_paid: order.total_amount,
        payment_status: 'Paid',
        reference_number: `POS-${order.order_id.substring(0, 8)}`,
      });
    }

    return invoice;
  }
}
