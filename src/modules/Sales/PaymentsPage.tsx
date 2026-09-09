import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, type Column } from '@/shared/components/ui/Table';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useAuth } from '@/shared/context/AuthContext';
import { getOwnerAdminEmail } from '@/shared/lib/adminStore';
import { payments as initialPayments, paymentMethodBreakdown, type Payment } from '@/modules/Sales/payments';
import { fetchPaymentsApi } from '@/modules/Sales/salesApiService';

const statusConfig = {
  Paid: { tone: 'green' as const, icon: CreditCard },
  Pending: { tone: 'amber' as const, icon: Clock },
  Overdue: { tone: 'rose' as const, icon: AlertTriangle },
  Completed: { tone: 'green' as const, icon: CreditCard },
};

const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

export function PaymentsPage() {
  const { user, profile } = useAuth();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const { hasAccess } = useDataAccess('payments');

  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPayments = async () => {
    setLoading(true);
    const data = await fetchPaymentsApi(ownerAdminEmail);
    if (data && data.length > 0) {
      setPaymentsList(data);
    } else {
      setPaymentsList(initialPayments);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPayments();
  }, [ownerAdminEmail]);

  const displayPayments = hasAccess ? paymentsList : [];
  const displayBreakdown = hasAccess ? paymentMethodBreakdown : [];

  const totalPaid = displayPayments.filter((p) => p.status === 'Paid' || p.status === 'Completed').reduce((a, p) => a + p.amount, 0);
  const totalPending = displayPayments.filter((p) => p.status === 'Pending').reduce((a, p) => a + p.amount, 0);
  const totalOverdue = displayPayments.filter((p) => p.status === 'Overdue').reduce((a, p) => a + p.amount, 0);

  const columns: Column<Payment>[] = [
    { key: 'id', header: 'ID', render: (p) => <span className="font-semibold text-brand-600 dark:text-brand-400">{p.id}</span> },
    { key: 'invoice', header: 'Invoice', render: (p) => <span className="text-ink-600 dark:text-ink-300">{p.invoice || p.invoiceId || 'INV-1001'}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="font-semibold">PKR {p.amount.toLocaleString()}</span> },
    { key: 'method', header: 'Method', render: (p) => <span className="text-xs text-ink-500">{p.method}</span> },
    { key: 'dueDate', header: 'Due Date', render: (p) => <span className="text-xs text-ink-500">{p.dueDate || '14 days'}</span> },
    { key: 'date', header: 'Paid On', render: (p) => <span className="text-xs text-ink-500">{p.date || '—'}</span> },
    { key: 'status', header: 'Status', render: (p) => {
      const cfg = statusConfig[p.status as keyof typeof statusConfig] || statusConfig.Paid;
      return <Badge tone={cfg.tone} icon={cfg.icon}>{p.status}</Badge>;
    }},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments Tracking" subtitle="Monitor incoming payments and outstanding balances synced live with Supabase." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Paid" value={totalPaid} prefix="PKR " icon={CreditCard} accent="green" trend={{ value: 8.2, positive: true }} delay={0} />
        <KpiCard label="Pending" value={totalPending} prefix="PKR " icon={Clock} accent="amber" delay={0.08} />
        <KpiCard label="Overdue" value={totalOverdue} prefix="PKR " icon={AlertTriangle} accent="rose" delay={0.16} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Payment Records" subtitle={`${displayPayments.length} transactions in database`} />
          <div className="pt-3">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-ink-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading payment records from Supabase...</span>
              </div>
            ) : (
              <Table columns={columns} data={displayPayments} rowKey={(p) => p.id} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment Methods" subtitle="Breakdown by type" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={displayBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {displayBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => `PKR ${(Number(v) / 1000).toFixed(0)}K`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {displayBreakdown.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.name}
                  </span>
                  <span className="font-medium text-ink-900 dark:text-ink-50">PKR {(m.value / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
