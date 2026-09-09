import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Package,
  Clock,
  ShoppingBag,
  User as UserIcon,
  CreditCard,
  Boxes,
  Phone,
  CheckSquare,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  ShieldCheck,
  Briefcase,
  UserCheck,
  PackagePlus,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { TiltCard } from '@/shared/components/ui/TiltCard';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import {
  dashboardKpis,
  salesData,
  revenueByCategory,
  leadSourceData,
  weeklyActivity,
  recentActivity,
} from '@/modules/Overview/dashboard';

const iconMap: Record<string, typeof DollarSign> = {
  dollar: DollarSign,
  users: Users,
  package: Package,
  clock: Clock,
};

const activityIcons: Record<string, typeof DollarSign> = {
  shopping: ShoppingBag,
  user: UserIcon,
  card: CreditCard,
  box: Boxes,
  phone: Phone,
  check: CheckSquare,
};

const activityTones: Record<string, 'brand' | 'green' | 'amber' | 'cyan' | 'rose' | 'violet'> = {
  shopping: 'brand',
  user: 'cyan',
  card: 'green',
  box: 'amber',
  phone: 'rose',
  check: 'violet',
};

const chartTooltipStyle = {
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)',
  fontSize: 12,
};

import { QuickAddTeamModal } from '@/modules/Admin/QuickAddTeamModal';
import { AddStaffModal } from '@/modules/Admin/AddStaffModal';
import { AddSalesModal } from '@/modules/Admin/AddSalesModal';
import { AddProductModal } from '@/modules/Admin/AddProductModal';

export function DashboardPage() {
  const navigate = useNavigate();
  const { hasAccess, isSuperAdmin } = useDataAccess('dashboard');
  const [quickAddRole, setQuickAddRole] = useState<'sales' | 'staff' | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);


  // Compute displayed KPIs depending on data access permissions
  const displayKpis = hasAccess
    ? dashboardKpis
    : dashboardKpis.map((kpi) => ({
        ...kpi,
        value: 0,
        trend: { value: 0, positive: true },
      }));

  // Compute displayed charts data depending on data access permissions
  const displaySalesData = hasAccess
    ? salesData
    : salesData.map((d) => ({ ...d, sales: 0, target: 0 }));

  const displayWeeklyActivity = hasAccess
    ? weeklyActivity
    : weeklyActivity.map((d) => ({ ...d, value: 0 }));

  const displayRevenueByCategory = hasAccess
    ? revenueByCategory
    : revenueByCategory.map((d) => ({ ...d, value: 0 }));

  const displayLeadSources = hasAccess
    ? leadSourceData
    : leadSourceData.map((d) => ({ ...d, value: 0 }));

  const displayRecentActivity = hasAccess ? recentActivity : [];

  const handleOpenAddSales = () => {
    setQuickAddRole('sales');
  };

  const handleOpenAddStaff = () => {
    setQuickAddRole('staff');
  };

  const handleOpenManageTeam = () => {
    navigate('/team-management?tab=manage');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Welcome back — here's what's happening today.">
        <div className="flex flex-wrap items-center gap-3">
          {/* Super Admin Options - Primary Action Buttons in a Row */}
          {isSuperAdmin ? (
            <>
              {/* Button 1: Add New Admin */}
              <button
                onClick={() => navigate('/admin-management?tab=add')}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Add new admin account"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add New Admin</span>
              </button>

              {/* Button 2: Add New Staff */}
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Add new staff member"
              >
                <UserCheck className="h-4 w-4" />
                <span>Add New Staff</span>
              </button>

              {/* Button 3: Add New Sales */}
              <button
                onClick={() => setIsSalesModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Add new sales representative"
              >
                <Briefcase className="h-4 w-4" />
                <span>Add New Sales</span>
              </button>

              {/* Button 4: Add Product */}
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Add new product catalog entry with image upload"
              >
                <PackagePlus className="h-4 w-4" />
                <span>Add Product</span>
              </button>

              <button
                onClick={() => navigate('/admin-management?tab=manage')}
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-all hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800 cursor-pointer"
                title="Manage Admin Access Control"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
                <span>Manage Access</span>
              </button>
            </>
          ) : (
            /* Regular Admin Options (Add Sales, Add Staff, Team Access) */
            <>
              <button
                onClick={handleOpenAddSales}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
                title="Add sales team account"
              >
                <Briefcase className="h-4 w-4" />
                <span>+ Add Sales</span>
              </button>

              <button
                onClick={handleOpenAddStaff}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                title="Add staff team account"
              >
                <UserCheck className="h-4 w-4" />
                <span>+ Add Staff</span>
              </button>

              <button
                onClick={handleOpenManageTeam}
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-all hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800"
                title="Manage Team Members & Access"
              >
                <Users className="h-3.5 w-3.5 text-brand-500" />
                <span>Team Access</span>
              </button>
            </>
          )}

          <Badge tone="green" icon={TrendingUp}>
            +9.7% this month
          </Badge>
        </div>
      </PageHeader>


      {/* Show Access Pending Banner if Super Admin has not granted data access to this admin */}
      {!hasAccess && <AccessPendingBanner />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {displayKpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={typeof kpi.value === 'number' ? kpi.value : parseFloat(String(kpi.value)) || 0}
            prefix={kpi.prefix}
            icon={iconMap[kpi.icon]}
            accent={kpi.accent}
            trend={kpi.trend}
            delay={i * 0.08}
          />
        ))}
      </div>

      {/* 3D Hero + Revenue Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TiltCard className="lg:col-span-1">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-6 text-white shadow-glow">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-accent-500/20 blur-2xl" />
            <div className="relative">
              <div style={{ transform: 'translateZ(40px)' }} className="preserve-3d">
                <p className="text-sm font-medium text-brand-100">Monthly Performance</p>
                <p className="mt-3 text-4xl font-bold tracking-tight">
                  {hasAccess ? 'PKR 680K' : 'PKR 0'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <ArrowUpRight className="h-3 w-3" /> {hasAccess ? '+9.7%' : '0%'}
                  </span>
                  <span className="text-xs text-brand-200">vs last month</span>
                </div>
              </div>
              <div className="mt-6 space-y-3" style={{ transform: 'translateZ(20px)' }}>
                {[
                  { label: 'Target', value: hasAccess ? 'PKR 650K' : 'PKR 0', pct: hasAccess ? 104 : 0 },
                  { label: 'Orders', value: hasAccess ? '232' : '0', pct: hasAccess ? 88 : 0 },
                  { label: 'New Leads', value: hasAccess ? '42' : '0', pct: hasAccess ? 72 : 0 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-100">{row.label}</span>
                      <span className="font-semibold">{row.value}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full rounded-full bg-gradient-to-r from-accent-400 to-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TiltCard>

        <Card className="lg:col-span-2">
          <CardHeader title="Revenue vs Target" subtitle="Last 6 months" action={<Badge tone="brand">Monthly</Badge>} />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={displaySalesData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => `PKR ${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="target" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" fill="url(#targetGrad)" />
                <Area type="monotone" dataKey="sales" stroke="#3366ff" strokeWidth={3} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly Activity" subtitle="Orders processed per day" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={displayWeeklyActivity} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" />
                    <stop offset="100%" stopColor="#1f4fe0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(51,102,255,0.05)' }} />
                <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue by Category" subtitle="Distribution" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={displayRevenueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {displayRevenueByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => `PKR ${(Number(v) / 1000).toFixed(0)}K`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {displayRevenueByCategory.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                  <span className="font-medium text-ink-900 dark:text-ink-100">
                    PKR {(cat.value / 1000).toFixed(0)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row: Activity feed + Lead sources */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent Activity" subtitle="Latest events across your business" />
          <div className="p-5 pt-3">
            {displayRecentActivity.length > 0 ? (
              <div className="space-y-1">
                {displayRecentActivity.map((act, i) => {
                  const Icon = activityIcons[act.icon] || ShoppingBag;
                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-${activityTones[act.icon]}-50 text-${activityTones[act.icon]}-600 dark:bg-${activityTones[act.icon]}-500/10 dark:text-${activityTones[act.icon]}-400`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-800 dark:text-ink-100">{act.text}</p>
                        <p className="text-xs text-ink-400">{act.time}</p>
                      </div>
                      {act.amount && <span className="shrink-0 text-xs font-semibold text-ink-600 dark:text-ink-300">{act.amount}</span>}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-ink-400">
                No recent activity to display. Data access pending approval by Super Admin.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Lead Sources" subtitle="Where leads come from" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={displayLeadSources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                  {displayLeadSources.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {displayLeadSources.map((src) => (
                <div key={src.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: src.color }} />
                  <span className="text-ink-600 dark:text-ink-300">{src.name}</span>
                  <span className="ml-auto font-medium text-ink-900 dark:text-ink-100">{src.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Add Sales / Staff Modal Popup */}
      <QuickAddTeamModal
        isOpen={!!quickAddRole}
        role={quickAddRole || 'sales'}
        onClose={() => setQuickAddRole(null)}
      />

      {/* Super Admin Dedicated Add Staff Modal */}
      <AddStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSuccess={() => {
          navigate('/team-management');
        }}
      />

      {/* Super Admin Dedicated Add Sales Modal */}
      <AddSalesModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onSuccess={() => {
          navigate('/team-management');
        }}
      />

      {/* Super Admin Dedicated Add Product Modal */}
      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
      />
    </div>
  );
}

