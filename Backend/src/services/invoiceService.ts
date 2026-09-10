import { supabaseAdmin } from '../config/supabaseAdmin';
import { toSafeUUID } from '../utils/uuidHelper';

export class InvoiceService {
  async getInvoiceById(invoiceId: string, shopId: string) {
    const safeShopId = toSafeUUID(shopId);
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('shop_id', safeShopId)
      .single();

    if (error) throw new Error(error.message);
    return invoice;
  }

  async getInvoicesByShop(shopId: string, status?: string) {
    const safeShopId = toSafeUUID(shopId);
    let query = supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('shop_id', safeShopId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;
    if (error) throw new Error(error.message);
    return invoices || [];
  }

  async generateInvoicePdfHtml(invoiceId: string, shopId: string): Promise<string> {
    const invoice = await this.getInvoiceById(invoiceId, shopId);
    const order = invoice?.orders || {};
    const items = order?.order_items || [];

    const itemRows = items
      .map(
        (item: any, idx: number) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.products?.product_name || 'Product'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice #${invoice.invoice_number}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #4f46e5; }
          .meta { font-size: 13px; color: #64748b; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px; }
          th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; }
          .totals { margin-top: 30px; text-align: right; font-size: 14px; }
          .totals .grand { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 8px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 12px; background: #dcfce7; color: #15803d; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">NEXUS BUSINESS SUITE</div>
            <div class="meta">Official Tax Invoice</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">${(invoice.status || 'PENDING').toUpperCase()}</div>
            <div class="meta" style="margin-top: 6px;">
              <strong>Invoice #:</strong> ${invoice.invoice_number}<br/>
              <strong>Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}<br/>
              <strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div style="margin-top: 24px;" class="meta">
          <strong>Customer / Bill To:</strong> ${invoice.customer_id || 'Walk-in Customer'}
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="totals">
          <div>Subtotal: <strong>$${Number(order.subtotal || invoice.total_amount).toFixed(2)}</strong></div>
          <div>Tax: <strong>$${Number(order.tax_amount || 0).toFixed(2)}</strong></div>
          <div>Discount: <strong>-$${Number(order.discount_amount || 0).toFixed(2)}</strong></div>
          <div class="grand">Total Amount: $${Number(invoice.total_amount).toFixed(2)}</div>
        </div>
      </body>
      </html>
    `;

    return html;
  }
}
