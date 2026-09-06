import { supabase } from '@/shared/lib/supabaseClient';
import { invoices as initialInvoices, type Invoice } from '@/modules/Sales/invoices';

export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase invoices fetch warning (using fallback data if table not created yet):', error.message);
      return initialInvoices;
    }

    if (data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        customer: row.customer,
        date: row.date,
        dueDate: row.due_date || row.dueDate,
        amount: Number(row.amount || 0),
        tax: Number(row.tax || 0),
        total: Number(row.total || 0),
        status: row.status,
        items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items) : []),
      }));
    }

    return initialInvoices;
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return initialInvoices;
  }
}

export async function createInvoice(newInvoice: {
  customer: string;
  date: string;
  dueDate: string;
  taxRate: number;
  items: { name: string; qty: number; price: number }[];
  notes?: string;
}): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  try {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceId = `INV-${randomNum}`;

    const amount = newInvoice.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const tax = Math.round((amount * (newInvoice.taxRate || 18)) / 100);
    const total = amount + tax;

    const payload = {
      id: invoiceId,
      customer: newInvoice.customer,
      date: newInvoice.date,
      due_date: newInvoice.dueDate,
      amount: amount,
      tax: tax,
      total: total,
      status: 'Sent',
      items: newInvoice.items,
    };

    // Execute direct Supabase insert call
    const { data, error } = await supabase
      .from('invoices')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert invoice error:', error.message);
      return { success: false, error: error.message };
    }

    const created: Invoice = {
      id: data.id,
      customer: data.customer,
      date: data.date,
      dueDate: data.due_date,
      amount: Number(data.amount),
      tax: Number(data.tax),
      total: Number(data.total),
      status: data.status,
      items: data.items,
    };

    return { success: true, data: created };
  } catch (err: any) {
    console.error('Failed to create invoice:', err);
    return { success: false, error: err?.message || 'Failed to create invoice' };
  }
}
