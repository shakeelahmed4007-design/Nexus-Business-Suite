import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Printer, X, Download, DollarSign, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { type Invoice } from '@/modules/Sales/invoices';
import { fetchInvoices, createInvoice } from '@/modules/Sales/invoiceService';

const statusTones = { Paid: 'green' as const, Sent: 'brand' as const, Overdue: 'rose' as const, Draft: 'gray' as const };

export function InvoicesPage() {
  const { hasAccess, canCreate } = useDataAccess('invoices');
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchInvoices();
    setInvoicesList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayInvoices = hasAccess ? invoicesList : [];

  const columns: Column<Invoice>[] = [
    { key: 'id', header: 'Invoice #', render: (i) => <span className="font-semibold text-brand-600 dark:text-brand-400">{i.id}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'date', header: 'Date', render: (i) => <span className="text-xs text-ink-500">{i.date}</span> },
    { key: 'dueDate', header: 'Due Date', render: (i) => <span className="text-xs text-ink-500">{i.dueDate}</span> },
    { key: 'amount', header: 'Subtotal', align: 'right', render: (i) => <span className="text-ink-600 dark:text-ink-300">PKR {i.amount.toLocaleString()}</span> },
    { key: 'tax', header: 'Tax', align: 'right', render: (i) => <span className="text-ink-600 dark:text-ink-300">PKR {i.tax.toLocaleString()}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (i) => <span className="font-semibold">PKR {i.total.toLocaleString()}</span> },
    { key: 'status', header: 'Status', render: (i) => <Badge tone={statusTones[i.status] || 'gray'}>{i.status}</Badge> },
  ];

  const totalPaid = displayInvoices.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.total, 0);
  const totalOverdue = displayInvoices.filter((i) => i.status === 'Overdue').reduce((a, i) => a + i.total, 0);
  const totalSent = displayInvoices.filter((i) => i.status === 'Sent').reduce((a, i) => a + i.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoice Management" subtitle="Generate, preview, and track invoices with Supabase integration.">
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        )}
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Paid', value: totalPaid, tone: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500/10' },
          { label: 'Sent (Pending)', value: totalSent, tone: 'text-brand-600 dark:text-brand-400', bg: 'from-brand-500/10' },
          { label: 'Overdue', value: totalOverdue, tone: 'text-rose-600 dark:text-rose-400', bg: 'from-rose-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className={`relative overflow-hidden p-5 bg-gradient-to-br ${s.bg} to-transparent`}>
              <p className="text-xs font-medium text-ink-500">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold ${s.tone}`}>PKR {s.value.toLocaleString()}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-12 text-ink-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading invoices from Supabase...</span>
          </div>
        ) : (
          <Table columns={columns} data={displayInvoices} rowKey={(i) => i.id} onRowClick={(i) => setSelected(i)} />
        )}
      </Card>

      <InvoicePreview invoice={selected} onClose={() => setSelected(null)} />
      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          loadData();
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function InvoicePreview({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-card-lg dark:bg-ink-900 scrollbar-thin z-10"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80 z-10">
              <h2 className="text-base font-semibold">Invoice {invoice.id}</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => alert('Printing Invoice...')}><Printer className="h-4 w-4" /> Print</Button>
                <Button variant="ghost" size="sm" onClick={() => alert('Downloading PDF...')}><Download className="h-4 w-4" /> PDF</Button>
                <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-8">
              {/* Invoice header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-lg font-bold text-ink-900 dark:text-ink-50">Nexus Business Suite</p>
                  <p className="text-xs text-ink-400">123 Business Ave, Karachi, Pakistan</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">INVOICE</p>
                  <p className="text-sm text-ink-500">{invoice.id}</p>
                  <Badge tone={statusTones[invoice.status] || 'gray'}>{invoice.status}</Badge>
                </div>
              </div>

              {/* Bill to */}
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Bill To</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-50">{invoice.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Dates</p>
                  <p className="mt-1 text-xs text-ink-500">Issue: {invoice.date}</p>
                  <p className="text-xs text-ink-500">Due: {invoice.dueDate}</p>
                </div>
              </div>

              {/* Items table */}
              <table className="mt-6 w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-ink-200 dark:border-ink-700">
                    <th className="pb-2 text-left text-xs font-semibold uppercase text-ink-400">Item</th>
                    <th className="pb-2 text-center text-xs font-semibold uppercase text-ink-400">Qty</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase text-ink-400">Price</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase text-ink-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-ink-100 dark:border-ink-800">
                      <td className="py-3 text-ink-700 dark:text-ink-200">{item.name}</td>
                      <td className="py-3 text-center text-ink-500">{item.qty}</td>
                      <td className="py-3 text-right text-ink-500">PKR {Number(item.price).toLocaleString()}</td>
                      <td className="py-3 text-right font-medium text-ink-800 dark:text-ink-100">PKR {(item.qty * item.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-ink-500">Subtotal</span><span className="text-ink-800 dark:text-ink-100">PKR {invoice.amount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-ink-500">Tax</span><span className="text-ink-800 dark:text-ink-100">PKR {invoice.tax.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t-2 border-ink-200 pt-2 text-base font-bold dark:border-ink-700"><span className="text-ink-900 dark:text-ink-50">Total</span><span className="text-brand-600 dark:text-brand-400">PKR {invoice.total.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="mt-8 border-t border-ink-100 pt-4 text-center text-xs text-ink-400 dark:border-ink-800">
                <p>Thank you for your business!</p>
                <p className="mt-1">Nexus Business Suite — Payment due within 14 days</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const inputCls = 'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

function CreateInvoiceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [customer, setCustomer] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [items, setItems] = useState<{ name: string; qty: number; price: number }[]>([
    { name: '', qty: 1, price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, key: string, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: val };
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!customer.trim()) {
      setErrorMsg('Please enter customer name');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please select due date');
      return;
    }
    const validItems = items.filter((i) => i.name.trim() !== '' && i.price > 0);
    if (validItems.length === 0) {
      setErrorMsg('Please add at least one valid item with name and price');
      return;
    }

    setSubmitting(true);
    const res = await createInvoice({
      customer,
      date: issueDate,
      dueDate: dueDate,
      taxRate: Number(taxRate),
      items: validItems,
    });

    setSubmitting(false);

    if (res.success) {
      alert(`🎉 Invoice ${res.data?.id} created & saved to Supabase!`);
      onCreated();
    } else {
      setErrorMsg(res.error || 'Failed to save invoice to Supabase');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Invoice"
      subtitle="Generate and save a new invoice directly into Supabase database."
      size="lg"
    >
      <form id="create-invoice-form" onSubmit={handleSubmit}>
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Customer Name</label>
            <input
              className={inputCls}
              placeholder="e.g. Ali Khan"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Issue Date</label>
            <input
              type="date"
              className={inputCls}
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Due Date</label>
            <input
              type="date"
              className={inputCls}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Tax Rate (%)</label>
            <input
              type="number"
              className={inputCls}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Line Items</label>
            <div className="space-y-2 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className={inputCls + ' flex-1'}
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    required
                  />
                  <input
                    className={inputCls + ' w-20'}
                    placeholder="Qty"
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                    required
                  />
                  <input
                    className={inputCls + ' w-28'}
                    placeholder="Unit Price"
                    type="number"
                    min={0}
                    value={item.price || ''}
                    onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                    required
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                + Add another item
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4" /> Save to Supabase
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
