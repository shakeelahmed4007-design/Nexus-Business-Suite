import { supabase } from '@/shared/lib/supabaseClient';
import { invoices as initialInvoices, type Invoice } from '@/modules/Sales/invoices';

const BACKEND_URL = 'http://localhost:5000/api';

function getLocalInvoices(key: string, fallback: Invoice[]): Invoice[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalInvoices(key: string, data: Invoice[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export async function fetchInvoices(ownerAdminEmail?: string): Promise<Invoice[]> {
  const shopId = (ownerAdminEmail || 'admin@nexus.com').toLowerCase().trim();
  const localKey = `nexus_sales_invoices_${shopId}`;

  // 1. Fetch from Express Backend API
  try {
    const res = await fetch(`${BACKEND_URL}/invoices?shop_id=${encodeURIComponent(shopId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.invoices) && json.invoices.length > 0) {
        const formatted: Invoice[] = json.invoices.map((row: any) => ({
          id: row.invoice_number || row.invoice_id || row.id,
          customer: row.customer_id || row.customer || 'Customer',
          date: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : row.date || 'Today',
          dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : row.dueDate || '14 days',
          amount: Number(row.total_amount ? Math.round(row.total_amount / 1.18) : row.amount || 0),
          tax: Number(row.total_amount ? Math.round(row.total_amount - (row.total_amount / 1.18)) : row.tax || 0),
          total: Number(row.total_amount || row.total || 0),
          status: row.status || 'Sent',
          items: Array.isArray(row.items) ? row.items : [],
          ownerAdminEmail: shopId,
        }));

        setLocalInvoices(localKey, formatted);
        return formatted;
      }
    }
  } catch (e) {
    console.warn('Backend invoices fetch notice:', e);
  }

  // 2. Direct Supabase Query (Fallback)
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const formatted: Invoice[] = data.map((row: any) => ({
        id: row.invoice_number || row.invoice_id || row.id,
        customer: row.customer_id || row.customer || 'Customer',
        date: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : row.date || 'Today',
        dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : row.dueDate || '14 days',
        amount: Number(row.total_amount ? Math.round(row.total_amount / 1.18) : row.amount || 0),
        tax: Number(row.total_amount ? Math.round(row.total_amount - (row.total_amount / 1.18)) : row.tax || 0),
        total: Number(row.total_amount || row.total || 0),
        status: row.status || 'Sent',
        items: Array.isArray(row.items) ? row.items : [],
        ownerAdminEmail: shopId,
      }));

      setLocalInvoices(localKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.error('Error fetching invoices from Supabase:', err);
  }

  return getLocalInvoices(localKey, initialInvoices);
}

export async function createInvoice(
  newInvoice: {
    customer: string;
    date: string;
    dueDate: string;
    taxRate: number;
    items: { name: string; qty: number; price: number }[];
    notes?: string;
  },
  ownerAdminEmail?: string,
  createdByEmail?: string
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  const shopId = (ownerAdminEmail || 'admin@nexus.com').toLowerCase().trim();
  const localKey = `nexus_sales_invoices_${shopId}`;

  try {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${randomNum}`;

    const amount = newInvoice.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const tax = Math.round((amount * (newInvoice.taxRate || 18)) / 100);
    const total = amount + tax;

    let created: Invoice | null = null;

    // 1. Try insert via backend/Supabase with correct schema
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([
          {
            shop_id: shopId,
            invoice_number: invoiceNumber,
            customer_id: newInvoice.customer,
            issue_date: newInvoice.date,
            due_date: newInvoice.dueDate,
            total_amount: total,
            status: 'Pending',
          },
        ])
        .select()
        .single();

      if (!error && data) {
        created = {
          id: data.invoice_number || invoiceNumber,
          customer: data.customer_id || newInvoice.customer,
          date: newInvoice.date,
          dueDate: newInvoice.dueDate,
          amount: amount,
          tax: tax,
          total: total,
          status: 'Sent',
          items: newInvoice.items,
          ownerAdminEmail: shopId,
        };
      }
    } catch (e) {}

    if (!created) {
      created = {
        id: invoiceNumber,
        customer: newInvoice.customer,
        date: newInvoice.date,
        dueDate: newInvoice.dueDate,
        amount: amount,
        tax: tax,
        total: total,
        status: 'Sent',
        items: newInvoice.items,
        ownerAdminEmail: shopId,
      };
    }

    const cached = getLocalInvoices(localKey, []);
    const updated = [created, ...cached.filter((i) => i.id !== created!.id)];
    setLocalInvoices(localKey, updated);

    return { success: true, data: created };
  } catch (err: any) {
    console.error('Failed to create invoice:', err);
    return { success: false, error: err?.message || 'Failed to create invoice' };
  }
}
