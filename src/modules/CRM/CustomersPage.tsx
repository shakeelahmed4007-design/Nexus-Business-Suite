import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, Mail, MapPin, ShoppingBag, DollarSign, X, Star } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { customers as fullCustomers, type Customer } from '@/modules/CRM/customers';

const tagTones: Record<string, 'brand' | 'amber' | 'green' | 'cyan' | 'violet'> = {
  VIP: 'violet',
  New: 'brand',
  Wholesale: 'amber',
  Retail: 'cyan',
};

export function CustomersPage() {
  const { hasAccess, canCreate, canEdit, canDelete } = useDataAccess('customer_data');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const displayCustomers = hasAccess ? fullCustomers : [];

  const filtered = displayCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.company.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Directory" subtitle="Manage your customer relationships and profiles." />

      {!hasAccess && <AccessPendingBanner />}

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
                      {c.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-50">{c.name}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">{c.company}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <Badge key={t} tone={tagTones[t] || 'gray'}>{t}</Badge>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 dark:border-ink-800">
                  <div>
                    <p className="text-xs text-ink-400">Orders</p>
                    <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{c.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-400">Total Spent</p>
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400">PKR {(c.totalSpent / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-sm text-ink-400 dark:border-ink-800 dark:bg-ink-900">
          No customer records found. {hasAccess ? '' : 'Data access authorization pending from Super Admin.'}
        </div>
      )}

      <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CustomerDrawer({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
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
                  {customer.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-lg font-bold text-ink-900 dark:text-ink-50">{customer.name}</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">{customer.company}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    {customer.tags.map((t) => (
                      <Badge key={t} tone={tagTones[t] || 'gray'}>{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <InfoRow icon={Phone} label="Phone" value={customer.phone} />
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                <InfoRow icon={MapPin} label="City" value={customer.city} />
                <InfoRow icon={ShoppingBag} label="Total Orders" value={String(customer.totalOrders)} />
                <InfoRow icon={DollarSign} label="Total Spent" value={`PKR ${customer.totalSpent.toLocaleString()}`} />
                <InfoRow icon={Star} label="Customer Since" value={customer.joinedAt} />
              </div>

              <div className="mt-6 rounded-xl bg-ink-50 p-4 dark:bg-ink-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Last Contact</p>
                <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{customer.lastContact}</p>
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
