import { supabaseAdmin } from '../config/supabaseAdmin';
import { toSafeUUID } from '../utils/uuidHelper';

export interface PaymentInput {
  shop_id: string;
  invoice_id?: string;
  vendor_id?: string;
  payment_type: 'Incoming' | 'Outgoing';
  payment_method: 'Cash' | 'Card' | 'Bank Transfer' | 'Online' | 'Cheque';
  amount_paid: number;
  reference_number?: string;
  payment_status?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
}

export class PaymentService {
  async recordPayment(data: PaymentInput) {
    const shopId = toSafeUUID(data.shop_id);
    if (data.amount_paid <= 0) {
      throw new Error('amount_paid must be greater than 0');
    }

    // 1. Insert Payment Entry
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        shop_id: shopId,
        invoice_id: data.invoice_id || null,
        payment_type: data.payment_type,
        payment_method: data.payment_method,
        amount_paid: data.amount_paid,
        payment_date: new Date().toISOString(),
        reference_number: data.reference_number || null,
        payment_status: data.payment_status || 'Paid',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 2. If Invoice Linked -> Update Invoice & Order Payment Status
    if (data.invoice_id) {
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('invoice_id', data.invoice_id)
        .eq('shop_id', data.shop_id)
        .single();

      if (invoice) {
        const newPaid = Number(invoice.paid_amount || 0) + Number(data.amount_paid);
        const total = Number(invoice.total_amount || 0);

        let newStatus = 'Partial';
        if (newPaid >= total) newStatus = 'Paid';
        if (newPaid <= 0) newStatus = 'Pending';

        await supabaseAdmin
          .from('invoices')
          .update({
            paid_amount: newPaid,
            status: newStatus,
          })
          .eq('invoice_id', data.invoice_id);

        if (invoice.order_id) {
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', invoice.order_id);
        }
      }
    }

    // 3. If Vendor Payment Linked
    if (data.vendor_id && data.payment_type === 'Outgoing') {
      await supabaseAdmin.from('vendor_payments').insert({
        vendor_id: data.vendor_id,
        shop_id: data.shop_id,
        amount_payable: data.amount_paid,
        amount_paid: data.amount_paid,
        payment_date: new Date().toISOString(),
        status: 'Paid',
      });
    }

    return payment;
  }

  async getOutstanding(shopId: string) {
    // 1. Customer Outstanding Invoices
    const { data: pendingInvoices } = await supabaseAdmin
      .from('invoices')
      .select('customer_id, total_amount, paid_amount')
      .eq('shop_id', shopId)
      .in('status', ['Pending', 'Partial', 'Overdue']);

    const customerOutstanding: Record<string, number> = {};
    let totalCustomerPending = 0;

    (pendingInvoices || []).forEach((inv) => {
      const cust = inv.customer_id || 'Unassigned Customer';
      const due = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
      if (due > 0) {
        customerOutstanding[cust] = (customerOutstanding[cust] || 0) + due;
        totalCustomerPending += due;
      }
    });

    // 2. Vendor Outstanding Payments
    const { data: pendingVendorPayments } = await supabaseAdmin
      .from('vendor_payments')
      .select('vendor_id, amount_payable, amount_paid, vendors(vendor_name)')
      .eq('shop_id', shopId)
      .in('status', ['Pending', 'Partial', 'Overdue']);

    const vendorOutstanding: Record<string, number> = {};
    let totalVendorPending = 0;

    (pendingVendorPayments || []).forEach((vp: any) => {
      const vName = vp.vendors?.vendor_name || vp.vendor_id;
      const due = Number(vp.amount_payable || 0) - Number(vp.amount_paid || 0);
      if (due > 0) {
        vendorOutstanding[vName] = (vendorOutstanding[vName] || 0) + due;
        totalVendorPending += due;
      }
    });

    return {
      summary: {
        total_customer_pending: totalCustomerPending,
        total_vendor_pending: totalVendorPending,
        net_outstanding: totalCustomerPending - totalVendorPending,
      },
      customers: customerOutstanding,
      vendors: vendorOutstanding,
    };
  }

  async getPaymentsByShop(shopIdInput: string) {
    const shopId = toSafeUUID(shopIdInput);
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('shop_id', shopId)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return payments || [];
  }
}
