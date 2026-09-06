import { motion } from 'framer-motion';
import { TrendingUp, Brain, AlertTriangle, Target } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { TiltCard } from '@/shared/components/ui/TiltCard';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { forecastData, stockForecastData, forecastInsights } from '@/modules/Intelligence/forecast';
import { clsx } from 'clsx';

const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

const insightIcons = [TrendingUp, Brain, Target, AlertTriangle];
const insightTones = ['text-emerald-600 dark:text-emerald-400', 'text-brand-600 dark:text-brand-400', 'text-cyan-600 dark:text-cyan-400', 'text-amber-600 dark:text-amber-400'];

export function ForecastingPage() {
  const { hasAccess } = useDataAccess('forecasting');

  const displayData = hasAccess ? forecastData : [];
  const displayStock = hasAccess ? stockForecastData : [];
  const displayInsights = hasAccess ? forecastInsights : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Predictive Forecasting" subtitle="AI-driven sales and stock predictions with confidence ranges.">
        <Badge tone="violet" icon={Brain}>ML Model Active</Badge>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {/* Insight cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {displayInsights.map((ins, i) => (
          <TiltCard key={ins.label} intensity={6}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card-base relative overflow-hidden p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-ink-500">{ins.label}</p>
                  <p className={clsx('mt-2 text-2xl font-bold', insightTones[i])}>{ins.value}</p>
                  <p className="mt-1 text-xs text-ink-400">{ins.trend}</p>
                </div>
                <div className={clsx('rounded-xl p-2.5', insightTones[i], 'bg-opacity-10')}>
                  {(() => { const Icon = insightIcons[i]; return <Icon className="h-5 w-5" />; })()}
                </div>
              </div>
            </motion.div>
          </TiltCard>
        ))}
      </div>

      {/* Sales forecast chart */}
      <Card>
        <CardHeader
          title="Sales Forecast"
          subtitle="Actual vs predicted revenue with confidence interval"
          action={<Badge tone="green">{hasAccess ? '94.2% confidence' : 'Restricted'}</Badge>}
        />
        <div className="p-5 pt-3">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="confRange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3366ff" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3366ff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => v ? `PKR ${(Number(v) / 1000).toFixed(0)}K` : '—'} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confRange)" name="Upper Bound" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="white" name="Lower Bound" />
              <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fill="url(#actualGrad)" name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="#3366ff" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: '#3366ff' }} name="Predicted" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Actual</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand-500" style={{ borderTop: '2px dashed #3366ff' }} /> Predicted</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-500/20" /> Confidence Range</span>
          </div>
        </div>
      </Card>

      {/* Stock forecast + AI insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Stock Level Forecast" subtitle="Weekly inventory prediction" action={<Badge tone="amber">{hasAccess ? '3 SKUs at risk' : 'Restricted'}</Badge>} />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={displayStock} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockConf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="stockActual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3366ff" stopOpacity={0.3} /><stop offset="100%" stopColor="#3366ff" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#stockConf)" name="Upper" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="white" name="Lower" />
                <Area type="monotone" dataKey="actual" stroke="#3366ff" strokeWidth={3} fill="url(#stockActual)" name="Actual" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} name="Predicted" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="AI Insights" subtitle="Key predictions" />
          <div className="p-5 pt-3 space-y-3">
            {[
              { title: 'Revenue Growth', text: 'Q4 projected to reach PKR 2.46M, an 18.5% increase over Q3.', tone: 'green', icon: TrendingUp },
              { title: 'Stockout Warning', text: 'Smart Watch Pro expected to stock out by Sep 5. Reorder now.', tone: 'amber', icon: AlertTriangle },
              { title: 'Peak Season', text: 'December forecast: PKR 910K — plan inventory accordingly.', tone: 'brand', icon: Target },
            ].map((ins, i) => {
  return (
    <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <div className="flex items-center gap-2">
        <ins.icon className={clsx('h-4 w-4', `text-${ins.tone}-600 dark:text-${ins.tone}-400`)} />
        <p className="text-xs font-semibold text-ink-900 dark:text-ink-50">{ins.title}</p>
      </div>
      <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">{ins.text}</p>
    </motion.div>
  );
})}
          </div>
        </Card>
      </div>
    </div>
  );
}
