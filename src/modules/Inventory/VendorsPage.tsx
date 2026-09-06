import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Phone, Mail, MapPin, Building2, Package, DollarSign, LayoutGrid, List } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { vendors, type Vendor } from '@/modules/Inventory/vendors';
import { clsx } from 'clsx';

const statusTones = { Active: 'green' as const, 'On Hold': 'amber' as const, Inactive: 'gray' as const };

export function VendorsPage() {
  const { hasAccess } = useDataAccess('vendors');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const displayVendors = hasAccess ? vendors : [];

  const columns: Column<Vendor>[] = [
    { key: 'name', header: 'Vendor', render: (v) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {v.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div><p className="font-medium text-ink-900 dark:text-ink-50">{v.name}</p><p className="text-xs text-ink-400">{v.category}</p></div>
      </div>
    )},
    { key: 'contact', header: 'Contact', render: (v) => <span className="text-xs text-ink-500">{v.contact}</span> },
    { key: 'phone', header: 'Phone', render: (v) => <span className="text-xs text-ink-500">{v.phone}</span> },
    { key: 'orders', header: 'Orders', align: 'center', render: (v) => <span className="font-semibold">{v.totalOrders}</span> },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (v) => (
      <span className={v.outstanding > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
        PKR {v.outstanding.toLocaleString()}
      </span>
    )},
    { key: 'rating', header: 'Rating', render: (v) => <StarRating rating={v.rating} /> },
    { key: 'status', header: 'Status', render: (v) => <Badge tone={statusTones[v.status]}>{v.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Management" subtitle="Manage suppliers, track performance, and monitor relationships.">
        <button onClick={() => setView(view === 'grid' ? 'table' : 'grid')} className="inline-flex h-9 items-center gap-2 rounded-xl bg-ink-100 px-3 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          {view === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          {view === 'grid' ? 'Table' : 'Grid'}
        </button>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayVendors.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}>
              <Card hover className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                      {v.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-50">{v.name}</p>
                      <p className="text-xs text-ink-500">{v.category}</p>
                    </div>
                  </div>
                  <Badge tone={statusTones[v.status]}>{v.status}</Badge>
                </div>

                <div className="mt-4 space-y-1.5">
                  <p className="flex items-center gap-2 text-xs text-ink-500"><Phone className="h-3.5 w-3.5" /> {v.phone}</p>
                  <p className="flex items-center gap-2 text-xs text-ink-500"><Mail className="h-3.5 w-3.5" /> {v.email}</p>
                  <p className="flex items-center gap-2 text-xs text-ink-500"><MapPin className="h-3.5 w-3.5" /> {v.location}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
                  <StarRating rating={v.rating} />
                  <span className="text-xs text-ink-400">{v.totalOrders} orders</span>
                </div>

                {v.outstanding > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                    <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-700 dark:text-amber-300">PKR {v.outstanding.toLocaleString()} outstanding</span>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <Table columns={columns} data={displayVendors} rowKey={(v) => v.id} />
        </Card>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={clsx('h-3.5 w-3.5', s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-ink-200 dark:text-ink-700')} />
      ))}
      <span className="ml-1 text-xs font-medium text-ink-600 dark:text-ink-300">{rating.toFixed(1)}</span>
    </div>
  );
}
