import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, Mail, MapPin, ShoppingBag, DollarSign, X, Star, Plus, Loader2, AlertCircle, User } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useCustomers, type ApiCustomer, type CreateCustomerPayload } from '@/modules/CRM/useCrmApi';

const inputCls = 'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

export function CustomersPage() {
  const { hasAccess, canCreate } = useDataAccess('customer_data');
  const { customers, loading, error, createCustomer, refetch } = useCustomers();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ApiCustomer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const displayCustomers = hasAccess ? customers : [];

  const filtered = displayCustomers.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      (c.companyName || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.phone || '').includes(query),
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading customers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Directory" subtitle="Manage your customer relationships and profiles.">
        {canCreate && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        )}
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={refetch} className="ml-auto underline">Retry</button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers..."
          className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm dark:border-ink-700 dark:bg-ink-900"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Card hover className="cursor-pointer p-5" onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                      {`${c.firstName[0]}${c.lastName[0]}`}
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-50">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">{c.companyName || '�'}</p>
                    </div>
                  </div>
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <Badge key={t} tone="brand">{t}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 dark:border-ink-800">
                  <div>
                    <p className="text-xs text-ink-400">Type</p>
                    <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{c.customerType || 'Regular'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-400">City</p>
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{c.city || '�'}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-sm text-ink-400 dark:border-ink-800 dark:bg-ink-900">
          {hasAccess ? 'No customers yet. Click "Add Customer" to create your first one.' : 'Data access authorization pending from Super Admin.'}
        </div>
      )}

      <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          await createCustomer(data);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function CustomerDrawer({ customer, onClose }: { customer: ApiCustomer | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {customer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative h-full w-full max-w-md overflow-y-auto bg-white dark:bg-ink-900 scrollbar-thin"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Customer Profile</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-bold text-white">
                  {`${customer.firstName[0]}${customer.lastName[0]}`}
                </div>
                <div>
                  <p className="text-lg font-bold text-ink-900 dark:text-ink-50">{customer.firstName} {customer.lastName}</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">{customer.companyName || '�'}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {customer.phone && <InfoRow icon={Phone} label="Phone" value={customer.phone} />}
                {customer.email && <InfoRow icon={Mail} label="Email" value={customer.email} />}
                {customer.city && <InfoRow icon={MapPin} label="City" value={customer.city} />}
                <InfoRow icon={ShoppingBag} label="Customer Type" value={customer.customerType || 'Regular'} />
                <InfoRow icon={Star} label="Member Since" value={new Date(customer.createdAt).toLocaleDateString()} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 dark:border-ink-800">
      <Icon className="h-4 w-4 text-ink-400" />
      <span className="text-xs text-ink-400">{label}</span>
      <span className="ml-auto text-sm font-medium text-ink-800 dark:text-ink-100">{value}</span>
    </div>
  );
}

function CustomerModal({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerPayload) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: CreateCustomerPayload = {
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string || undefined,
      phone: fd.get('phone') as string || undefined,
      companyName: fd.get('companyName') as string || undefined,
      city: fd.get('city') as string || undefined,
      customerType: fd.get('customerType') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    };
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Customer" subtitle="Enter the customer's details.">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">First Name</label>
            <input name="firstName" className={inputCls} placeholder="Sara" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Last Name</label>
            <input name="lastName" className={inputCls} placeholder="Ahmed" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Email</label>
            <input name="email" type="email" className={inputCls} placeholder="sara@company.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Phone</label>
            <input name="phone" type="tel" className={inputCls} placeholder="+92 300 1234567" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Company</label>
            <input name="companyName" className={inputCls} placeholder="TechVision Ltd" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">City</label>
            <input name="city" className={inputCls} placeholder="Karachi" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Customer Type</label>
            <select name="customerType" className={inputCls}>
              <option>Regular</option>
              <option>VIP</option>
              <option>Wholesale</option>
              <option>Retail</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Notes</label>
            <textarea name="notes" className={inputCls + ' h-20 resize-none py-2'} placeholder="Any additional notes..." />
          </div>
        </div>

        {formError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{formError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
