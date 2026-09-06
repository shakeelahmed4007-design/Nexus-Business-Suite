import { motion } from 'framer-motion';
import { BookOpen, Package, Plus, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Table, type Column } from '@/shared/components/ui/Table';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { purchases, supplierBreakdown, type Purchase } from '@/modules/Sales/purchases';

const statusTones = { Draft: 'gray' as const, Ordered: 'brand' as const, Received: 'green' as const, Cancelled: 'rose' as const };
const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

export function PurchasesPage() {
  const { hasAccess, canCreate } = useDataAccess('purchases');

  const displayPurchases = hasAccess ? purchases : [];
  const displayBreakdown = hasAccess ? supplierBreakdown : [];

  const totalValue = displayPurchases.reduce((a, p) => a + p.total, 0);
  const received = displayPurchases.filter((p) => p.status === 'Received').length;
  const pending = displayPurchases.filter((p) => p.status === 'Ordered').length;

  const columns: Column<Purchase>[] = [
    { key: 'id', header: 'PO #', render: (p) => <span className="font-semibold text-brand-600 dark:text-brand-400">{p.id}</span> },
    { key: 'vendor', header: 'Vendor' },
    { key: 'date', header: 'Date', render: (p) => <span className="text-xs text-ink-500">{p.date}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (p) => <span className="text-ink-600 dark:text-ink-300">{p.items}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (p) => <span className="font-semibold">PKR {p.total.toLocaleString()}</span> },
    { key: 'expected', header: 'Expected', render: (p) => <span className="text-xs text-ink-500">{p.expected}</span> },
    { key: 'status', header: 'Status', render: (p) => <Badge tone={statusTones[p.status]}>{p.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Purchases Tracking" subtitle="Manage purchase orders and supplier relationships.">
        {canCreate && (
          <Button size="sm" onClick={() => alert('Creating New Purchase Order...')}><Plus className="h-4 w-4" /> New PO</Button>
        )}
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Purchases" value={totalValue} prefix="PKR " icon={BookOpen} accent="brand" delay={0} />
        <KpiCard label="Received" value={received} icon={Package} accent="green" delay={0.08} />
        <KpiCard label="Pending Delivery" value={pending} icon={TrendingUp} accent="amber" delay={0.16} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Purchase Orders" subtitle={`${displayPurchases.length} total orders`} />
          <div className="pt-3">
            <Table columns={columns} data={displayPurchases} rowKey={(p) => p.id} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Supplier Breakdown" subtitle="Value by vendor" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={displayBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10, fill: '#67718d' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(51,102,255,0.05)' }} />
                <Bar dataKey="value" fill="#3366ff" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
