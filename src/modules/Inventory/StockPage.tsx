import { motion } from 'framer-motion';
import { Boxes, AlertTriangle, PackagePlus, PackageMinus, TrendingUp, TrendingDown } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, type Column } from '@/shared/components/ui/Table';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { stockItems, stockMovements, stockTrend, type StockItem, type StockMovement } from '@/modules/Inventory/stock';

const statusConfig = {
  'In Stock': { tone: 'green' as const },
  'Low Stock': { tone: 'amber' as const },
  'Out of Stock': { tone: 'rose' as const },
};

const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

export function StockPage() {
  const { hasAccess } = useDataAccess('stock');

  const displayItems = hasAccess ? stockItems : [];
  const displayMovements = hasAccess ? stockMovements : [];
  const displayTrend = hasAccess ? stockTrend : [];

  const totalItems = displayItems.length;
  const lowStock = displayItems.filter((s) => s.status === 'Low Stock').length;
  const outOfStock = displayItems.filter((s) => s.status === 'Out of Stock').length;
  const totalValue = displayItems.reduce((a, s) => a + s.quantity * s.unitPrice, 0);

  const columns: Column<StockItem>[] = [
    { key: 'sku', header: 'SKU', render: (s) => <span className="font-mono text-xs text-brand-600 dark:text-brand-400">{s.sku}</span> },
    { key: 'name', header: 'Product' },
    { key: 'category', header: 'Category', render: (s) => <span className="text-xs text-ink-500">{s.category}</span> },
    { key: 'quantity', header: 'Quantity', align: 'center', render: (s) => (
      <span className={s.quantity === 0 ? 'text-rose-600 dark:text-rose-400' : s.quantity < s.reorderLevel ? 'text-amber-600 dark:text-amber-400' : 'text-ink-700 dark:text-ink-200'}>
        {s.quantity}
      </span>
    )},
    { key: 'reorderLevel', header: 'Reorder At', align: 'center', render: (s) => <span className="text-xs text-ink-400">{s.reorderLevel}</span> },
    { key: 'unitPrice', header: 'Unit Price', align: 'right', render: (s) => <span className="text-ink-600 dark:text-ink-300">PKR {s.unitPrice.toLocaleString()}</span> },
    { key: 'warehouse', header: 'Warehouse', render: (s) => <span className="text-xs text-ink-500">{s.warehouse}</span> },
    { key: 'status', header: 'Status', render: (s) => <Badge tone={statusConfig[s.status].tone}>{s.status}</Badge> },
  ];

  const moveColumns: Column<StockMovement>[] = [
    { key: 'id', header: 'ID', render: (m) => <span className="font-mono text-xs text-ink-500">{m.id}</span> },
    { key: 'item', header: 'Item' },
    { key: 'type', header: 'Type', render: (m) => (
      <Badge tone={m.type === 'In' ? 'green' : m.type === 'Out' ? 'rose' : 'brand'}>
        {m.type === 'In' ? <PackagePlus className="h-3 w-3" /> : m.type === 'Out' ? <PackageMinus className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {m.type}
      </Badge>
    )},
    { key: 'quantity', header: 'Qty', align: 'center', render: (m) => <span className="font-semibold">{m.quantity}</span> },
    { key: 'from', header: 'From', render: (m) => <span className="text-xs text-ink-500">{m.from}</span> },
    { key: 'to', header: 'To', render: (m) => <span className="text-xs text-ink-500">{m.to}</span> },
    { key: 'date', header: 'Date', render: (m) => <span className="text-xs text-ink-500">{m.date}</span> },
    { key: 'by', header: 'By', render: (m) => <span className="text-xs text-ink-500">{m.by}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Management" subtitle="Monitor inventory levels, movements, and alerts." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total SKUs" value={totalItems} icon={Boxes} accent="brand" delay={0} />
        <KpiCard label="Low Stock" value={lowStock} icon={AlertTriangle} accent="amber" delay={0.08} />
        <KpiCard label="Out of Stock" value={outOfStock} icon={TrendingDown} accent="rose" delay={0.16} />
        <KpiCard label="Stock Value" value={totalValue} prefix="PKR " icon={TrendingUp} accent="green" delay={0.24} />
      </div>

      {/* Alerts */}
      {(lowStock > 0 || outOfStock > 0) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-semibold">{lowStock + outOfStock} items</span> need attention — {lowStock} low stock, {outOfStock} out of stock. Consider reordering soon.
          </p>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Stock Inbound vs Outbound" subtitle="Last 6 months" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={displayTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="inbound" stroke="#10b981" strokeWidth={2} fill="url(#inGrad)" name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#f43f5e" strokeWidth={2} fill="url(#outGrad)" name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Monthly Movements" subtitle="In vs Out comparison" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={displayTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(51,102,255,0.05)' }} />
                <Bar dataKey="inbound" fill="#10b981" radius={[6, 6, 0, 0]} name="Inbound" />
                <Bar dataKey="outbound" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Outbound" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Stock Levels" subtitle="All inventory items" />
        <div className="pt-3">
          <Table columns={columns} data={displayItems} rowKey={(s) => s.id} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Stock Movement History" subtitle="Recent in/out transactions" />
        <div className="pt-3">
          <Table columns={moveColumns} data={displayMovements} rowKey={(m) => m.id} />
        </div>
      </Card>
    </div>
  );
}
