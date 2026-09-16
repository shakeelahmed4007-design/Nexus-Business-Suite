import { motion } from 'framer-motion';
import { Phone, Users, CheckCircle, Clock, AlertTriangle, TrendingUp, Upload, UserCheck } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import type { useCallingDataStore } from './useCallingDataStore';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface DashboardProps {
  store: StoreType;
  onOpenUpload: () => void;
  onOpenAllocate: () => void;
}

export function CallingDataDashboard({ store, onOpenUpload, onOpenAllocate }: DashboardProps) {
  const { roleMode, currentAgent, allNumbers, numbers, agentPerformances } = store;

  const isAdmin = roleMode === 'Admin';

  // Overall Pool Stats
  const totalNumbers = allNumbers.length;
  const allocatedCount = allNumbers.filter(n => n.status === 'Allocated' || n.status === 'Used').length;
  const availableCount = allNumbers.filter(n => n.status === 'Available').length;
  const expiredCount = allNumbers.filter(n => n.status === 'Expired').length;
  const usedCount = allNumbers.filter(n => n.status === 'Used').length;

  const totalCallsMade = agentPerformances.reduce((acc, p) => acc + p.callsMade, 0);
  const totalSales = agentPerformances.reduce((acc, p) => acc + p.sales, 0);
  const conversionRate = totalCallsMade > 0 ? ((totalSales / totalCallsMade) * 100).toFixed(1) : '0';

  // My Agent Stats
  const myPerformance = agentPerformances.find(p => p.agentId === currentAgent.id) || {
    allocated: numbers.length,
    callsMade: numbers.filter(n => n.status === 'Used').length,
    sales: store.leads.filter(l => l.status === 'Sales').length,
    trial: store.leads.filter(l => l.status === 'Trial').length,
    denied: store.leads.filter(l => l.status === 'Denied').length,
    renewal: store.leads.filter(l => l.status === 'Renewal').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-600 p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
              {isAdmin ? 'Admin View: Full Pool Overview' : `Agent View: ${currentAgent.name}`}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            {isAdmin ? 'Calling Data Raw Pool & Performance' : 'My Calling Data & Performance'}
          </h2>
          <p className="mt-1 text-sm text-brand-100">
            {isAdmin
              ? 'Manage 1,000 raw numbers pool, batch allocation to sales agents, and track conversion rates.'
              : `Tracking your allocated numbers, logged calls, trial conversions, and sales.`}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-xs font-bold text-white shadow-xs backdrop-blur-xs transition-all hover:bg-white/25 active:scale-95"
            >
              <Upload className="h-4 w-4 text-white" /> Upload Numbers
            </button>
            <button
              type="button"
              onClick={onOpenAllocate}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-brand-700 shadow-lg transition-all hover:bg-brand-50 active:scale-95"
            >
              <UserCheck className="h-4 w-4 text-brand-600" /> Allocate to Agents
            </button>
          </div>
        )}
      </div>

      {/* Admin Metrics Cards */}
      {isAdmin ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            { label: 'Total Pool Numbers', value: totalNumbers, icon: Phone, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
            { label: 'Allocated Numbers', value: allocatedCount, icon: Users, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
            { label: 'Available in Pool', value: availableCount, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
            { label: 'Expired Numbers', value: expiredCount, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
            { label: 'Calls Made (Used)', value: usedCount, icon: Clock, color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' },
            { label: 'Call -> Sale Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink-400">{stat.label}</p>
                    <p className="text-xl font-extrabold text-ink-900 dark:text-ink-50">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Agent Personal Metrics Cards */
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: 'My Allocated Numbers', value: myPerformance.allocated, icon: Phone, color: 'bg-blue-50 text-blue-600' },
            { label: 'My Calls Made', value: myPerformance.callsMade, icon: Clock, color: 'bg-purple-50 text-purple-600' },
            { label: 'My Sales Converted', value: myPerformance.sales, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'My Active Trials', value: myPerformance.trial, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'My Denied Leads', value: myPerformance.denied, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink-400">{stat.label}</p>
                    <p className="text-xl font-extrabold text-ink-900 dark:text-ink-50">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Admin View: Agent Performance Table */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-4 dark:border-ink-800">
            <div>
              <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">Sales Agent Performance Matrix</h3>
              <p className="text-xs text-ink-500">Real-time breakdown of allocation, calls made, and conversions per agent.</p>
            </div>
            <Button size="sm" onClick={onOpenAllocate}>
              <UserCheck className="h-4 w-4" /> Re-allocate Pool
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-ink-500 dark:border-ink-800 dark:bg-ink-900/50">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Agent Name</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Allocated</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Calls Made</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Sales</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Trial</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Denied</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {agentPerformances.map((ag) => (
                  <tr key={ag.agentId} className="hover:bg-ink-50/60 dark:hover:bg-ink-900/40">
                    <td className="py-3.5 px-4 font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-black">
                        {ag.agentName.charAt(0)}
                      </div>
                      {ag.agentName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{ag.allocated}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-600 dark:text-purple-400">{ag.callsMade}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{ag.sales}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{ag.trial}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{ag.denied}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{ag.renewal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
            <div>
              <h4 className="text-base font-bold text-ink-900 dark:text-ink-100">Automated Workflow Status Engine</h4>
              <p className="text-xs text-ink-500">How phone numbers dynamically transition across CRM modules.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200 dark:border-brand-500/20">
              Active Workflow
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Interested Card */}
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-xs">
                🌟
              </div>
              <div className="space-y-0.5 leading-snug">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Log Interested Call</span>
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    → Trial Page
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                  Creates a verified Lead record and transfers number to Trial queue.
                </p>
              </div>
            </div>

            {/* Sale Card */}
            <div className="flex items-start gap-3 rounded-xl bg-indigo-50/60 p-3.5 border border-indigo-200/80 dark:bg-indigo-500/10 dark:border-indigo-500/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-xs">
                💰
              </div>
              <div className="space-y-0.5 leading-snug">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Log Closed Sale</span>
                  <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-extrabold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    → Sales Page
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                  Converts deal to Won Sale with PKR deal value and 1-year renewal date.
                </p>
              </div>
            </div>

            {/* Callback Card */}
            <div className="flex items-start gap-3 rounded-xl bg-amber-50/60 p-3.5 border border-amber-200/80 dark:bg-amber-500/10 dark:border-amber-500/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">
                ⏰
              </div>
              <div className="space-y-0.5 leading-snug">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200">Callback Later</span>
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    → Active Calls
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Schedules follow-up reminders with target callback date.
                </p>
              </div>
            </div>

            {/* Denied Card */}
            <div className="flex items-start gap-3 rounded-xl bg-rose-50/60 p-3.5 border border-rose-200/80 dark:bg-rose-500/10 dark:border-rose-500/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white font-bold text-xs">
                ❌
              </div>
              <div className="space-y-0.5 leading-snug">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-950 dark:text-rose-200">Not Interested</span>
                  <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                    → Denied Page
                  </span>
                </div>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                  Archives call with specific denial reason for analysis.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
            <div>
              <h4 className="text-base font-bold text-ink-900 dark:text-ink-100">External Lead Imports Status</h4>
              <p className="text-xs text-ink-500">Live integration feeds from external channels.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Feeds
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60 border border-ink-200/60 dark:border-ink-700/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-xs">
                  🌐
                </div>
                <span className="text-xs font-bold text-ink-800 dark:text-ink-100">Website Lead Form</span>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60 border border-ink-200/60 dark:border-ink-700/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-xs">
                  💬
                </div>
                <span className="text-xs font-bold text-ink-800 dark:text-ink-100">Facebook Page Messages</span>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">
                  ⏳
                </div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Pending Unassigned Leads</span>
              </div>
              <span className="rounded-md bg-amber-200/70 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 dark:bg-amber-500/30 dark:text-amber-300">
                {store.importedLeads.filter(i => i.status === 'Pending').length} Pending
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
