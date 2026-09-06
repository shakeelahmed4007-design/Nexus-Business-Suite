import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Truck, CheckCircle2, Clock, XCircle, MapPin, CreditCard, User } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { orders, orderStatusFlow, type Order } from '@/modules/Sales/orders';
import { clsx } from 'clsx';

const statusConfig = {
  Pending: { tone: 'amber' as const, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  Processing: { tone: 'brand' as const, icon: Package, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10' },
  Shipped: { tone: 'cyan' as const, icon: Truck, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  Delivered: { tone: 'green' as const, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  Cancelled: { tone: 'rose' as const, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
};

const paymentTones = { Paid: 'green' as const, Unpaid: 'rose' as const, Partial: 'amber' as const };

export function OrdersPage() {
  const { hasAccess } = useDataAccess('orders');
  const [selected, setSelected] = useState<Order | null>(null);

  const displayOrders = hasAccess ? orders : [];

  const columns: Column<Order>[] = [
    { key: 'id', header: 'Order ID', render: (o) => <span className="font-semibold text-brand-600 dark:text-brand-400">{o.id}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'date', header: 'Date', render: (o) => <span className="text-xs text-ink-500">{o.date}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (o) => <span className="text-ink-600 dark:text-ink-300">{o.items}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="font-semibold">PKR {o.total.toLocaleString()}</span> },
    { key: 'channel', header: 'Channel', render: (o) => <span className="text-xs text-ink-500">{o.channel}</span> },
    { key: 'payment', header: 'Payment', render: (o) => <Badge tone={paymentTones[o.payment]}>{o.payment}</Badge> },
    {
      key: 'status', header: 'Status', render: (o) => {
        const cfg = statusConfig[o.status];
        return <Badge tone={cfg.tone} icon={cfg.icon}>{o.status}</Badge>;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Order Management" subtitle="Track and manage all customer orders." />

      {!hasAccess && <AccessPendingBanner />}

      {/* Status tracker */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {orderStatusFlow.map((s, i) => {
          const cfg = statusConfig[s.key as keyof typeof statusConfig];
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', cfg.bg)}>
                    <cfg.icon className={clsx('h-5 w-5', cfg.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-ink-900 dark:text-ink-50">{s.count}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{s.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <Table columns={columns} data={displayOrders} rowKey={(o) => o.id} onRowClick={(o) => setSelected(o)} />
      </Card>

      <OrderDrawer order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {order && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" />
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative h-full w-full max-w-md overflow-y-auto bg-white dark:bg-ink-900 scrollbar-thin"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
              <div>
                <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{order.id}</h2>
                <p className="text-xs text-ink-400">{order.date}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status tracker */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Order Status</p>
                <div className="flex items-center justify-between">
                  {['Pending', 'Processing', 'Shipped', 'Delivered'].map((step, i) => {
                    const currentIdx = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].indexOf(order.status);
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step} className="flex flex-1 flex-col items-center">
                        <div className={clsx(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                          done && 'bg-emerald-500 text-white',
                          active && 'bg-brand-600 text-white ring-4 ring-brand-500/20',
                          !done && !active && 'bg-ink-100 text-ink-400 dark:bg-ink-800',
                        )}>
                          {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className="mt-1.5 text-[10px] text-ink-500">{step}</span>
                        {i < 3 && <div className={clsix('absolute mt-4 h-0.5', done ? 'bg-emerald-500' : 'bg-ink-200 dark:bg-ink-700')} style={{ width: '25%', left: `${25 * (i + 1)}%`, zIndex: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <InfoRow icon={User} label="Customer" value={order.customer} />
                <InfoRow icon={MapPin} label="Channel" value={order.channel} />
                <InfoRow icon={CreditCard} label="Payment" value={order.payment} />
                <InfoRow icon={Package} label="Items" value={`${order.items} items`} />
              </div>

              <div className="rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-4 dark:from-brand-500/10 dark:to-accent-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-600 dark:text-ink-300">Order Total</span>
                  <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">PKR {order.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
                <Button className="flex-1" onClick={() => {
                  alert('Status updated successfully!');
                  onClose();
                }}>Update Status</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function clsix(...args: any[]) { return clsx(...args); }

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 dark:border-ink-800">
      <Icon className="h-4 w-4 text-ink-400" />
      <span className="text-xs text-ink-400">{label}</span>
      <span className="ml-auto text-sm font-medium text-ink-800 dark:text-ink-100">{value}</span>
    </div>
  );
}
