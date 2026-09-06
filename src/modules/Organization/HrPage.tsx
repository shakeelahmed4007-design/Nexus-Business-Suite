import { motion } from 'framer-motion';
import { Users, Calendar, UserSquare2, Mail, Phone, Briefcase } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { employees, departments, attendanceTrend } from '@/modules/Organization/employees';
import { clsx } from 'clsx';

const statusConfig = {
  Active: { tone: 'green' as const, dot: 'bg-emerald-500' },
  'On Leave': { tone: 'amber' as const, dot: 'bg-amber-500' },
  Remote: { tone: 'brand' as const, dot: 'bg-brand-500' },
};

const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

export function HrPage() {
  const { hasAccess } = useDataAccess('hr');

  const displayEmployees = hasAccess ? employees : [];
  const displayDepartments = hasAccess ? departments : [];
  const displayTrend = hasAccess ? attendanceTrend : [];

  const activeCount = displayEmployees.filter((e) => e.status === 'Active').length;
  const onLeave = displayEmployees.filter((e) => e.status === 'On Leave').length;
  const avgAttendance = displayEmployees.length > 0
    ? Math.round(displayEmployees.reduce((a, e) => a + e.attendance, 0) / displayEmployees.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Team Management" subtitle="Employee directory, attendance, and department overview." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Employees" value={displayEmployees.length} icon={Users} accent="brand" delay={0} />
        <KpiCard label="Active Today" value={activeCount} icon={UserSquare2} accent="green" delay={0.08} />
        <KpiCard label="Avg Attendance" value={avgAttendance} suffix="%" icon={Calendar} accent="cyan" delay={0.16} />
      </div>

      {/* Departments */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {displayDepartments.map((d, i) => (
          <motion.div key={d.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 text-center">
              <div className={clsx('mx-auto h-2 w-12 rounded-full', d.color)} />
              <p className="mt-3 text-2xl font-bold text-ink-900 dark:text-ink-50">{d.count}</p>
              <p className="text-xs text-ink-500">{d.name}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Employee directory */}
        <Card className="lg:col-span-2">
          <CardHeader title="Employee Directory" subtitle={`${displayEmployees.length} team members`} />
          <div className="p-5 pt-3 space-y-2">
            {displayEmployees.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-xl border border-ink-100 p-3 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/40"
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                    {e.avatar}
                  </div>
                  <span className={clsix('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-ink-900', statusConfig[e.status].dot)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{e.name}</p>
                  <p className="text-xs text-ink-500">{e.role}</p>
                </div>
                <div className="hidden flex-col items-end gap-1 sm:flex">
                  <Badge tone={statusConfig[e.status].tone}>{e.status}</Badge>
                  <span className="text-xs text-ink-400">{e.attendance}% attendance</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Attendance chart */}
        <Card>
          <CardHeader title="Weekly Attendance" subtitle="Present vs absent" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attendanceTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(51,102,255,0.05)' }} />
                <Bar dataKey="present" fill="#10b981" radius={[6, 6, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Role Permission Matrix */}
      <Card>
        <CardHeader title="Role Permission Matrix" subtitle="Manage module access for different roles" />
        <div className="overflow-x-auto p-5 pt-3 scrollbar-thin">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 dark:border-ink-800">
                <th className="px-4 py-3 text-left font-semibold text-ink-500">Module</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-500">Admin</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-500">Call Agent</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-500">Inventory Mgr</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-500">HR</th>
              </tr>
            </thead>
            <tbody>
              {[
                { mod: 'Overview & Reports', roles: ['Admin', 'Call Agent', 'Inventory Mgr', 'HR'] },
                { mod: 'CRM & Sales', roles: ['Admin', 'Call Agent'] },
                { mod: 'POS & Invoices', roles: ['Admin', 'Call Agent'] },
                { mod: 'Inventory & Stock', roles: ['Admin', 'Inventory Mgr'] },
                { mod: 'Team & HR', roles: ['Admin', 'HR'] },
                { mod: 'Intelligence (AI)', roles: ['Admin'] },
              ].map((row, i) => (
                <tr key={i} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-50">{row.mod}</td>
                  {['Admin', 'Call Agent', 'Inventory Mgr', 'HR'].map((role) => (
                    <td key={role} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        defaultChecked={row.roles.includes(role)}
                        disabled={role === 'Admin'} // Admin always has access
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/20"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <button onClick={() => alert('Permissions updated!')} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
              Save Permissions
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function clsix(...args: any[]) { return clsx(...args); }
