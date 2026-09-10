import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { InvoiceService } from '../services/invoiceService';

const invoiceService = new InvoiceService();

export const getInvoices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const status = req.query.status as string;
    const invoices = await invoiceService.getInvoicesByShop(shopId, status);
    return res.json({ success: true, invoices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getInvoiceById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoice_id } = req.params;
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const invoice = await invoiceService.getInvoiceById(invoice_id, shopId);
    return res.json({ success: true, invoice });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const generateInvoicePdf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoice_id } = req.params;
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';

    const htmlContent = await invoiceService.generateInvoicePdfHtml(invoice_id, shopId);

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlContent);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice_id}.html`);
    return res.send(htmlContent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
