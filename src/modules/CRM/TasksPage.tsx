import { motion } from 'framer-motion';
import { Calendar, Flag, AlertCircle, CheckCircle2, Clock, CircleDot } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { tasks, taskColumns, type Task } from '@/modules/CRM/tasks';
import { clsx } from 'clsx';

const priorityConfig = {
  High: { tone: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', ring: 'ring-rose-200 dark:ring-rose-500/20', icon: AlertCircle },
  Medium: { tone: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', ring: 'ring-amber-200 dark:ring-amber-500/20', icon: Flag },
  Low: { tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', ring: 'ring-emerald-200 dark:ring-emerald-500/20', icon: CheckCircle2 },
};

const statusIcon: Record<string, typeof Clock> = {
  'To Do': CircleDot,
  'In Progress': Clock,
  'Review': AlertCircle,
  'Done': CheckCircle2,
};

const statusColor: Record<string, string> = {
  'To Do': 'text-ink-400',
  'In Progress': 'text-brand-500',
  'Review': 'text-amber-500',
  'Done': 'text-emerald-500',
};

export function TasksPage() {
  const { hasAccess } = useDataAccess('tasks_followups');
  const displayTasks = hasAccess ? tasks : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Follow-ups" subtitle="Manage your task board with priorities and deadlines." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {taskColumns.map((col) => {
          const colTasks = displayTasks.filter((t) => t.status === col);
          const Icon = statusIcon[col];
          return (
            <div key={col} className="w-80 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={clsx('h-4 w-4', statusColor[col])} />
                  <span className="text-sm font-semibold text-ink-900 dark:text-ink-50">{col}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-400">{colTasks.length}</span>
                </div>
              </div>
              <div className="space-y-3">
                {colTasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} delay={i * 0.06} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, delay }: { task: Task; delay: number }) {
  const cfg = priorityConfig[task.priority];
  const PriorityIcon = cfg.icon;
  const isOverdue = new Date(task.dueDate) < new Date('2026-08-31') && task.status !== 'Done';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className="cursor-pointer rounded-xl border border-ink-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-lg dark:border-ink-800 dark:bg-ink-900"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{task.title}</p>
        <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', cfg.bg)}>
          <PriorityIcon className={clsx('h-3.5 w-3.5', cfg.tone)} />
        </span>
      </div>
      <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">{task.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', cfg.bg, cfg.tone, cfg.ring)}>
          {task.priority}
        </span>
        <span className={clsx('flex items-center gap-1 text-xs', isOverdue ? 'text-rose-500' : 'text-ink-400')}>
          <Calendar className="h-3 w-3" />
          {task.dueDate}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {task.assignee.split(' ').map((n) => n[0]).join('')}
        </div>
        <span className="text-xs text-ink-400">{task.relatedTo}</span>
      </div>
    </motion.div>
  );
}
