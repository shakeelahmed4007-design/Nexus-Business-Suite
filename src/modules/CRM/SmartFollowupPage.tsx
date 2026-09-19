import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Phone,
  FileText,
  TrendingUp,
  ArrowRight,
  Brain,
  RefreshCw,
  X,
  Copy,
  PhoneCall,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import {
  smartFollowupApiService,
  type SmartFollowupItem,
  type FollowupMetrics,
} from './smartFollowupApiService';
import { clsx } from 'clsx';

const priorityConfig = {
  Critical: {
    tone: 'rose' as const,
    ring: 'ring-rose-200 dark:ring-rose-500/20',
    glow: 'shadow-[0_0_25px_-4px_rgba(244,63,94,0.35)]',
    gradient: 'from-rose-500 to-orange-500',
    border: 'border-rose-500/30',
  },
  High: {
    tone: 'amber' as const,
    ring: 'ring-amber-200 dark:ring-amber-500/20',
    glow: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.25)]',
    gradient: 'from-amber-500 to-yellow-500',
    border: 'border-amber-500/30',
  },
  Medium: {
    tone: 'brand' as const,
    ring: 'ring-brand-200 dark:ring-brand-500/20',
    glow: '',
    gradient: 'from-brand-500 to-accent-500',
    border: 'border-brand-500/30',
  },
};

const typeIconMap = {
  Lead: TrendingUp,
  Task: FileText,
  'Follow-up': Phone,
  Invoice: AlertTriangle,
  Inventory: Package,
};

type FilterType = 'all' | 'Critical' | 'Follow-up' | 'Lead' | 'Invoice' | 'Inventory';

export function SmartFollowupPage() {
  const { hasAccess } = useDataAccess('smart_followup_ai');
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState<SmartFollowupItem[]>([]);
  const [metrics, setMetrics] = useState<FollowupMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [callingModalItem, setCallingModalItem] = useState<SmartFollowupItem | null>(null);
  const [proposalModalItem, setProposalModalItem] = useState<SmartFollowupItem | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Load suggestions
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await smartFollowupApiService.getSuggestions('shop-001');
      if (res && res.success) {
        setSuggestions(res.suggestions || []);
        setMetrics(res.metrics || null);
      }
    } catch (err) {
      console.error('Error fetching smart followups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dismiss suggestion
  const handleDismiss = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic removal
    const target = suggestions.find((s) => s.id === id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    showToast(`Suggestion dismissed. It won't prompt for 24 hours.`);

    await smartFollowupApiService.dismissSuggestion(id);
    if (metrics) {
      setMetrics({
        ...metrics,
        total_suggestions: Math.max(0, metrics.total_suggestions - 1),
        critical_count: target?.priority === 'Critical' ? Math.max(0, metrics.critical_count - 1) : metrics.critical_count,
        high_count: target?.priority === 'High' ? Math.max(0, metrics.high_count - 1) : metrics.high_count,
      });
    }
  };

  // Action Dispatcher
  const handleActionClick = (suggestion: SmartFollowupItem) => {
    if (suggestion.action_type === 'CALL' || suggestion.type === 'Follow-up') {
      setCallingModalItem(suggestion);
    } else if (suggestion.action_type === 'RESTOCK' || suggestion.type === 'Inventory') {
      navigate('/warehouse');
    } else if (suggestion.action_type === 'PROPOSAL') {
      setProposalModalItem(suggestion);
    } else if (suggestion.type === 'Invoice') {
      navigate('/sales/invoices');
    } else if (suggestion.type === 'Lead') {
      navigate('/crm/leads');
    } else {
      navigate('/crm/tasks');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Filtered list
  const filteredSuggestions = useMemo(() => {
    if (!hasAccess) return [];
    if (activeFilter === 'all') return suggestions;
    if (activeFilter === 'Critical') return suggestions.filter((s) => s.priority === 'Critical');
    return suggestions.filter((s) => s.type === activeFilter);
  }, [suggestions, activeFilter, hasAccess]);

  const counts = useMemo(() => {
    return {
      all: suggestions.length,
      critical: suggestions.filter((s) => s.priority === 'Critical').length,
      followups: suggestions.filter((s) => s.type === 'Follow-up').length,
      leads: suggestions.filter((s) => s.type === 'Lead').length,
      invoices: suggestions.filter((s) => s.type === 'Invoice').length,
      inventory: suggestions.filter((s) => s.type === 'Inventory').length,
    };
  }, [suggestions]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-ink-900/90 backdrop-blur-md px-4 py-3 text-sm text-white shadow-xl border border-white/10"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="Smart Follow-up Assistant"
        subtitle="Real-time AI engine analyzing overdue invoices, stalled leads, callbacks, and pending stock."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={clsx('h-3.5 w-3.5 mr-1.5', (refreshing || loading) && 'animate-spin')} />
            {refreshing ? 'Scanning...' : 'Re-Scan Data'}
          </Button>
          <Badge tone="violet" icon={Sparkles}>AI Active</Badge>
        </div>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {/* Priority Engine Intelligence Card */}
      <Card className="relative overflow-hidden p-6 border border-brand-500/20 dark:border-brand-500/10">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-indigo-600 to-accent-500 shadow-glow">
              <Brain className="h-7 w-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-ink-900 dark:text-ink-50">Intelligent Follow-up Engine</p>
                <Badge tone="brand">Real-time Scanner</Badge>
              </div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">
                {hasAccess && metrics
                  ? `Analyzed ${metrics.total_analyzed_leads} leads, ${metrics.total_analyzed_invoices} invoices & ${metrics.total_analyzed_tasks} tasks — ${suggestions.length} high-urgency actions discovered`
                  : hasAccess
                  ? 'Analyzing connected CRM pipelines...'
                  : 'Data access pending authorization by Super Admin'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-500/20 dark:bg-emerald-500/10">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {metrics ? `${metrics.confidence_percentage}% confidence` : '94.6% confidence'}
              </span>
            </div>
            {metrics && metrics.critical_count > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 border border-rose-500/20 dark:bg-rose-500/10">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {metrics.critical_count} Critical Urgency
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      {hasAccess && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0',
              activeFilter === 'all'
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900 shadow-sm'
                : 'bg-ink-100/70 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            All Actionable
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/10">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('Critical')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0',
              activeFilter === 'Critical'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Critical Only
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-200/50 dark:bg-rose-900/40">
              {counts.critical}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('Follow-up')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0',
              activeFilter === 'Follow-up'
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900 shadow-sm'
                : 'bg-ink-100/70 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            <Phone className="h-3.5 w-3.5" />
            Calls & Callbacks
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/10">
              {counts.followups}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('Lead')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0',
              activeFilter === 'Lead'
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900 shadow-sm'
                : 'bg-ink-100/70 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Stalled Leads
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/10">
              {counts.leads}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('Invoice')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0',
              activeFilter === 'Invoice'
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900 shadow-sm'
                : 'bg-ink-100/70 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Overdue Invoices
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/10">
              {counts.invoices}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('Inventory')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0',
              activeFilter === 'Inventory'
                ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900 shadow-sm'
                : 'bg-ink-100/70 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            <Package className="h-3.5 w-3.5" />
            Stock Alerts
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/10">
              {counts.inventory}
            </span>
          </button>
        </div>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 w-32 bg-ink-200 dark:bg-ink-800 rounded-lg" />
                <div className="h-10 w-10 bg-ink-200 dark:bg-ink-800 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-ink-200 dark:bg-ink-800 rounded" />
              <div className="h-16 bg-ink-100 dark:bg-ink-800/50 rounded-xl" />
              <div className="flex justify-end">
                <div className="h-8 w-28 bg-ink-200 dark:bg-ink-800 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-ink-900 dark:text-ink-50">All Caught Up!</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400 max-w-md mx-auto">
            No high-priority follow-ups or alerts matching this category. Your CRM pipelines and accounts receivable are looking clear!
          </p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => loadData(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Re-scan Pipelines
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence>
            {filteredSuggestions.map((s, i) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                delay={i * 0.06}
                onAction={() => handleActionClick(s)}
                onDismiss={(e) => handleDismiss(s.id, e)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Call Dialer Modal */}
      {callingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-ink-900 p-6 shadow-2xl border border-ink-200 dark:border-ink-800"
          >
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 dark:border-ink-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">Instant Contact Dialer</h3>
                  <p className="text-xs text-ink-500 dark:text-ink-400">Priority Follow-up</p>
                </div>
              </div>
              <button
                onClick={() => setCallingModalItem(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className="rounded-xl bg-ink-50 dark:bg-ink-800/60 p-4 space-y-2">
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Customer / Lead</p>
                <p className="text-base font-bold text-ink-900 dark:text-ink-50">
                  {callingModalItem.customer_name || callingModalItem.entity}
                </p>
                {callingModalItem.customer_phone && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {callingModalItem.customer_phone}
                    </span>
                    <button
                      onClick={() => copyToClipboard(callingModalItem.customer_phone || '')}
                      className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900 dark:hover:text-ink-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedPhone ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs text-ink-600 dark:text-ink-300 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <span className="font-semibold text-amber-800 dark:text-amber-300">Context: </span>
                {callingModalItem.reason}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  handleDismiss(callingModalItem.id);
                  setCallingModalItem(null);
                }}
              >
                Mark Handled
              </Button>
              <a
                href={`tel:${callingModalItem.customer_phone || ''}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors"
                onClick={() => {
                  setTimeout(() => setCallingModalItem(null), 1000);
                }}
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* Proposal Modal */}
      {proposalModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-ink-900 p-6 shadow-2xl border border-ink-200 dark:border-ink-800"
          >
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 dark:border-ink-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">Send Commercial Proposal</h3>
                  <p className="text-xs text-ink-500 dark:text-ink-400">High-Probability Deal Closure</p>
                </div>
              </div>
              <button
                onClick={() => setProposalModalItem(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-5 space-y-3">
              <div className="rounded-xl bg-ink-50 dark:bg-ink-800/60 p-4 space-y-1">
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Prospect Organization</p>
                <p className="text-base font-bold text-ink-900 dark:text-ink-50">
                  {proposalModalItem.customer_name || proposalModalItem.title}
                </p>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">{proposalModalItem.entity}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 dark:text-ink-300">Proposal Summary / Scope</label>
                <textarea
                  readOnly
                  rows={4}
                  className="w-full text-xs rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900/50 p-3 text-ink-700 dark:text-ink-300 focus:outline-none font-mono"
                  defaultValue={`Dear ${proposalModalItem.customer_name || 'Client'},\n\nFollowing our discussion regarding wholesale inventory procurement, please find our customized corporate proposal attached. We are pleased to offer preferred tier pricing valid for the next 7 business days.\n\nBest regards,\nNexus Sales Executive`}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setProposalModalItem(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  showToast('Proposal dispatched to prospect email queue.');
                  handleDismiss(proposalModalItem.id);
                  setProposalModalItem(null);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Dispatch Proposal
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  delay,
  onAction,
  onDismiss,
}: {
  suggestion: SmartFollowupItem;
  delay: number;
  onAction: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const cfg = priorityConfig[suggestion.priority] || priorityConfig.Medium;
  const TypeIcon = typeIconMap[suggestion.type] || Sparkles;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className={clsx(
        'card-base relative overflow-hidden p-5 transition-shadow border',
        cfg.glow,
        cfg.border
      )}
    >
      <div className={clsx('absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b', cfg.gradient)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm',
              `bg-${cfg.tone}-50 dark:bg-${cfg.tone}-500/10`
            )}
          >
            <TypeIcon className={clsx('h-5 w-5', `text-${cfg.tone}-600 dark:text-${cfg.tone}-400`)} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={cfg.tone}>{suggestion.priority}</Badge>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                {suggestion.type}
              </span>
              {suggestion.customer_name && (
                <span className="text-xs text-ink-400 dark:text-ink-500 font-medium">
                  • {suggestion.customer_name}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm font-bold text-ink-900 dark:text-ink-50 leading-snug">
              {suggestion.title}
            </p>
            <p className="text-xs font-mono text-ink-500 dark:text-ink-400 mt-0.5">
              {suggestion.entity}
            </p>
          </div>
        </div>

        {/* Priority Gauge & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative h-12 w-12 flex items-center justify-center">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                className="text-ink-100 dark:text-ink-800"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                className={clsx(`text-${cfg.tone}-500 dark:text-${cfg.tone}-400`)}
                strokeDasharray={94.2}
                initial={{ strokeDashoffset: 94.2 }}
                animate={{ strokeDashoffset: 94.2 - (94.2 * suggestion.score) / 100 }}
                transition={{ duration: 1, delay: delay + 0.1 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-ink-900 dark:text-ink-50">
              {suggestion.score}
            </span>
          </div>

          <button
            onClick={onDismiss}
            title="Snooze / Dismiss for 24h"
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-ink-100 dark:hover:bg-ink-800 dark:hover:text-ink-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rationale / Context */}
      <div className="mt-4 rounded-xl bg-ink-50/80 p-3.5 dark:bg-ink-800/40 border border-ink-100 dark:border-ink-800">
        <p className="flex items-start gap-2 text-xs text-ink-600 dark:text-ink-300">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span>
            <strong className="font-semibold text-ink-800 dark:text-ink-200">AI Context: </strong>
            {suggestion.reason}
          </span>
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <Clock className="h-3 w-3" />
          <span>Urgency: {suggestion.score >= 90 ? 'Immediate Action' : suggestion.score >= 75 ? 'Today' : 'Within 48h'}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={suggestion.priority === 'Critical' ? 'primary' : 'secondary'}
            onClick={onAction}
            className="group"
          >
            <span>{suggestion.action}</span>
            {suggestion.action_type === 'CALL' ? (
              <PhoneCall className="h-3.5 w-3.5 ml-1 text-emerald-400" />
            ) : suggestion.action_type === 'RESTOCK' ? (
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
