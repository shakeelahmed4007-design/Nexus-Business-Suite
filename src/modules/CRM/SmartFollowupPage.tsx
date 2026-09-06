import { motion } from 'framer-motion';
import { Sparkles, Zap, Phone, FileText, TrendingUp, ArrowRight, Brain } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { prioritySuggestions, type PrioritySuggestion } from '@/modules/CRM/aiSuggestions';
import { clsx } from 'clsx';

const priorityConfig = {
  Critical: { tone: 'rose' as const, ring: 'ring-rose-200 dark:ring-rose-500/20', glow: 'shadow-[0_0_20px_-4px_rgba(244,63,94,0.3)]', gradient: 'from-rose-500 to-orange-500' },
  High: { tone: 'amber' as const, ring: 'ring-amber-200 dark:ring-amber-500/20', glow: '', gradient: 'from-amber-500 to-yellow-500' },
  Medium: { tone: 'brand' as const, ring: 'ring-brand-200 dark:ring-brand-500/20', glow: '', gradient: 'from-brand-500 to-accent-500' },
};

const typeIcon = {
  Lead: TrendingUp,
  Task: FileText,
  'Follow-up': Phone,
};

export function SmartFollowupPage() {
  const { hasAccess } = useDataAccess('smart_followup_ai');
  const displaySuggestions = hasAccess ? prioritySuggestions : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Smart Follow-up Assistant" subtitle="AI-powered priority suggestions for your leads and tasks.">
        <Badge tone="violet" icon={Sparkles}>AI Active</Badge>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-ink-900 dark:text-ink-50">Priority Engine</p>
              <p className="text-sm text-ink-500 dark:text-ink-400">
                {hasAccess
                  ? `Analyzed 42 leads and 10 tasks — ${prioritySuggestions.length} suggestions ready`
                  : 'Data access pending authorization by Super Admin'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {hasAccess ? '94.2% confidence' : 'Access Restricted'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {displaySuggestions.map((s, i) => (
          <SuggestionCard key={s.id} suggestion={s} delay={i * 0.08} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, delay }: { suggestion: PrioritySuggestion; delay: number }) {
  const cfg = priorityConfig[suggestion.priority];
  const TypeIcon = typeIcon[suggestion.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={clsx('card-base relative overflow-hidden p-5', cfg.glow)}
    >
      <div className={clsx('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', cfg.gradient)} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', `bg-${cfg.tone}-50 dark:bg-${cfg.tone}-500/10`)}>
            <TypeIcon className={clsx('h-5 w-5', `text-${cfg.tone}-600 dark:text-${cfg.tone}-400`)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={cfg.tone}>{suggestion.priority}</Badge>
              <span className="text-xs text-ink-400">{suggestion.type}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-50">{suggestion.title}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">{suggestion.entity}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink-100 dark:text-ink-800" />
              <motion.circle
                cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                className={clsx(`text-${cfg.tone}-500 dark:text-${cfg.tone}-400`)}
                strokeDasharray={94.2}
                initial={{ strokeDashoffset: 94.2 }}
                animate={{ strokeDashoffset: 94.2 - (94.2 * suggestion.score) / 100 }}
                transition={{ duration: 1, delay: delay + 0.2 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink-900 dark:text-ink-50">{suggestion.score}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
        <p className="flex items-start gap-2 text-xs text-ink-600 dark:text-ink-300">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span><span className="font-semibold">Why: </span>{suggestion.reason}</span>
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="secondary">
          {suggestion.action} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
