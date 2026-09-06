import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Clock,
  DollarSign,
  Target,
  Package,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { salesData } from '@/modules/Overview/dashboard';
import { supplierBreakdown } from '@/modules/Sales/purchases';

const chartTooltipStyle = {
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)',
  fontSize: 12,
};

export function ReportsPage() {
  const { hasAccess } = useDataAccess('reports');

  const displaySalesData = hasAccess ? salesData : [];
  const displaySupplierBreakdown = hasAccess ? supplierBreakdown : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive business performance insights." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Avg. Order Value" value={hasAccess ? 2930 : 0} prefix="PKR " icon={DollarSign} accent="brand" trend={{ value: hasAccess ? 7.4 : 0, positive: true }} delay={0} />
        <KpiCard label="Conversion Rate" value={hasAccess ? 24 : 0} suffix="%" icon={Target} accent="green" trend={{ value: hasAccess ? 3.1 : 0, positive: true }} delay={0.08} />
        <KpiCard label="New Customers" value={hasAccess ? 38 : 0} icon={Users} accent="cyan" trend={{ value: hasAccess ? 14 : 0, positive: true }} delay={0.16} />
        <KpiCard label="Avg. Fulfillment" value={hasAccess ? 2.3 : 0} suffix=" days" icon={Clock} accent="amber" trend={{ value: hasAccess ? 0.5 : 0, positive: false }} delay={0.24} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sales Trend" subtitle="Revenue & order count over 6 months" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={displaySalesData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area yAxisId="left" type="monotone" dataKey="sales" stroke="#3366ff" strokeWidth={3} fill="url(#rSales)" name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Supplier Performance" subtitle="Order volume by vendor" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={supplierBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <YAxis type="category" dataKey="vendor" tick={{ fontSize: 11, fill: '#67718d' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(51,102,255,0.05)' }} />
                <Bar dataKey="value" fill="#3366ff" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales vs Target" subtitle="Monthly comparison" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(51,102,255,0.05)' }} />
                <Bar dataKey="target" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Target" />
                <Bar dataKey="sales" fill="#3366ff" radius={[6, 6, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Stats" />
          <div className="p-5 pt-3 space-y-4">
            {[
              { label: 'Total Orders', value: '1,128', icon: ShoppingCart, tone: 'text-brand-600 dark:text-brand-400' },
              { label: 'Avg. Deal Size', value: 'PKR 162K', icon: TrendingUp, tone: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Active SKUs', value: '48', icon: Package, tone: 'text-amber-600 dark:text-amber-400' },
              { label: 'Total Customers', value: '286', icon: Users, tone: 'text-cyan-600 dark:text-cyan-400' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3 dark:border-ink-800"
              >
                <span className="flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${s.tone}`} />
                  <span className="text-sm text-ink-600 dark:text-ink-300">{s.label}</span>
                </span>
                <span className="text-sm font-bold text-ink-900 dark:text-ink-50">{s.value}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
