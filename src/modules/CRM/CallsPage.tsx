import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Table, type Column } from '@/shared/components/ui/Table';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { callLogs, callStats, type CallLog } from '@/modules/CRM/calls';

const typeConfig = {
  Incoming: { icon: PhoneIncoming, tone: 'green' as const, arrow: ArrowDownRight, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  Outgoing: { icon: PhoneOutgoing, tone: 'brand' as const, arrow: ArrowUpRight, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10' },
  Missed: { icon: PhoneMissed, tone: 'rose' as const, arrow: Minus, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
};

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallsPage() {
  const { hasAccess } = useDataAccess('calling_data');

  const displayLogs = hasAccess ? callLogs : [];
  const displayTotal = hasAccess ? callStats.total : 0;
  const displayIncoming = hasAccess ? callStats.incoming : 0;
  const displayOutgoing = hasAccess ? callStats.outgoing : 0;
  const totalMin = hasAccess ? Math.floor(callStats.totalDuration / 60) : 0;

  const columns: Column<CallLog>[] = [
    {
      key: 'type', header: 'Type', render: (c) => {
        const cfg = typeConfig[c.type];
        return (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bg}`}>
            <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
        );
      },
    },
    {
      key: 'contact', header: 'Contact', render: (c) => (
        <div>
          <p className="font-medium text-ink-900 dark:text-ink-50">{c.contact}</p>
          <p className="text-xs text-ink-400">{c.number}</p>
        </div>
      ),
    },
    { key: 'typeLabel', header: 'Call Type', render: (c) => <span className={`text-xs font-medium ${typeConfig[c.type].color}`}>{c.type}</span> },
    {
      key: 'duration', header: 'Duration', render: (c) => (
        <span className="inline-flex items-center gap-1 text-sm text-ink-600 dark:text-ink-300">
          <Clock className="h-3.5 w-3.5 text-ink-400" />
          {c.duration}
        </span>
      ),
    },
    { key: 'date', header: 'Date & Time', render: (c) => <span className="text-xs text-ink-500">{c.date}</span> },
    { key: 'notes', header: 'Notes', render: (c) => <span className="text-xs text-ink-500">{c.notes || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Calling Data" subtitle="Track all incoming, outgoing, and missed calls." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Calls" value={displayTotal} icon={PhoneIncoming} accent="brand" delay={0} />
        <KpiCard label="Incoming" value={displayIncoming} icon={PhoneIncoming} accent="green" delay={0.08} />
        <KpiCard label="Outgoing" value={displayOutgoing} icon={PhoneOutgoing} accent="cyan" delay={0.16} />
        <KpiCard label="Talk Time" value={totalMin} suffix=" min" icon={Clock} accent="amber" delay={0.24} />
      </div>

      <Card>
        <CardHeader title="Call Logs" subtitle={hasAccess ? `${callStats.missed} missed calls` : 'Data access restricted'} />
        <div className="pt-3">
          <Table columns={columns} data={displayLogs} rowKey={(c) => c.id} />
        </div>
      </Card>
    </div>
  );
}
