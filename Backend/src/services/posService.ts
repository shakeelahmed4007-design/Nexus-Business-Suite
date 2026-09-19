import { supabaseAdmin } from '../config/supabaseAdmin';
import { OrderService } from './orderService';

const orderService = new OrderService();

export interface POSCheckoutInput {
  shop_id: string;
  staff_id: string;
  customer_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    tax_percentage?: number;
  }>;
  payment_method?: 'Cash' | 'Card' | 'Online' | 'Cheque';
  discount_amount?: number;
  discount_type?: 'Fixed' | 'Percentage';
  session_id?: string;
}

export interface POSSessionOpenInput {
  shop_id: string;
  staff_id: string;
  opening_balance: number;
}

export interface POSSessionCloseInput {
  shop_id: string;
  session_id: string;
  closing_balance?: number;
  expenses?: number;
}

export class POSService {
  async openSession(data: POSSessionOpenInput) {
    // Check if staff already has an open session
    const { data: existing } = await supabaseAdmin
      .from('pos_sessions')
      .select('*')
      .eq('shop_id', data.shop_id)
      .eq('staff_id', data.staff_id)
      .eq('status', 'Open')
      .single();

    if (existing) return existing;

    const { data: session, error } = await supabaseAdmin
      .from('pos_sessions')
      .insert({
        shop_id: data.shop_id,
        staff_id: data.staff_id,
        opening_balance: data.opening_balance,
        closing_balance: 0.00,
        total_sales: 0.00,
        expenses: 0.00,
        status: 'Open',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return session;
  }

  async closeSession(data: POSSessionCloseInput) {
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('pos_sessions')
      .select('*')
      .eq('session_id', data.session_id)
      .eq('shop_id', data.shop_id)
      .single();

    if (fetchErr || !session) throw new Error('POS Session not found');

    const expenses = data.expenses !== undefined ? data.expenses : session.expenses;
    const computedClosing = (session.opening_balance || 0) + (session.total_sales || 0) - (expenses || 0);
    const finalClosing = data.closing_balance !== undefined ? data.closing_balance : computedClosing;

    const { data: updatedSession, error: updateErr } = await supabaseAdmin
      .from('pos_sessions')
      .update({
        closing_balance: finalClosing,
        expenses,
        status: 'Closed',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', data.session_id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);
    return updatedSession;
  }

  async checkout(data: POSCheckoutInput) {
    // 1. Create POS Order with Delivered and Paid status
    const orderResult = await orderService.createOrder(
      {
        shop_id: data.shop_id,
        customer_id: data.customer_id,
        order_type: 'POS',
        items: data.items,
        discount_amount: data.discount_amount,
        discount_type: data.discount_type,
        order_status: 'Delivered',
        payment_status: 'Paid',
        notes: `POS Instant Checkout via ${data.payment_method || 'Cash'}`,
      },
      data.staff_id
    );

    // 2. Immediate Stock Deduction since order_status = Delivered
    const orderId = orderResult.order.order_id;
    for (const item of data.items) {
      const { data: stock } = await supabaseAdmin
        .from('stocks')
        .select('total_quantity, reserved_quantity')
        .eq('product_id', item.product_id)
        .eq('shop_id', data.shop_id)
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
          .eq('shop_id', data.shop_id);

        await supabaseAdmin.from('stock_movements').insert({
          product_id: item.product_id,
          shop_id: data.shop_id,
          movement_type: 'Sale',
          quantity_changed: -item.quantity,
          reason: `POS Sale Order #${orderId}`,
          created_by: data.staff_id || 'POS Staff',
        });
      }
    }

    // 3. Update POS Session Total Sales if session_id provided
    if (data.session_id) {
      const { data: posSession } = await supabaseAdmin
        .from('pos_sessions')
        .select('total_sales')
        .eq('session_id', data.session_id)
        .single();

      if (posSession) {
        const currentSales = Number(posSession.total_sales || 0);
        await supabaseAdmin
          .from('pos_sessions')
          .update({
            total_sales: currentSales + Number(orderResult.order.total_amount),
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', data.session_id);
      }
    }

    return orderResult;
  }
}
