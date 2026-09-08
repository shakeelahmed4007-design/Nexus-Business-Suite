import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flag, AlertCircle, CheckCircle2, Clock, CircleDot, Plus, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useTasks, type ApiTask, type CreateTaskPayload } from '@/modules/CRM/useCrmApi';
import { clsx } from 'clsx';

const TASK_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;
const PRIORITIES = ['Low', 'Medium', 'High'] as const;

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

const inputCls = 'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

export function TasksPage() {
  const { hasAccess, canCreate, canDelete } = useDataAccess('tasks_followups');
  const { tasks, loading, error, createTask, completeTask, deleteTask, refetch } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);

  const displayTasks = hasAccess ? tasks : [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Follow-ups" subtitle="Manage your task board with priorities and deadlines.">
        {canCreate && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        )}
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={refetch} className="ml-auto underline">Retry</button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {TASK_COLUMNS.map((col) => {
          const colTasks = displayTasks.filter((t) => (t.taskStatus || 'To Do') === col);
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
                {colTasks.length > 0 ? colTasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    delay={i * 0.06}
                    canDelete={canDelete}
                    onComplete={() => completeTask(task.id)}
                    onDelete={() => { if (confirm('Delete this task?')) deleteTask(task.id); }}
                  />
                )) : (
                  <div className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400 dark:border-ink-800">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          await createTask(data);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function TaskCard({ task, delay, canDelete, onComplete, onDelete }: {
  task: ApiTask;
  delay: number;
  canDelete: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const priority = (task.priority || 'Medium') as 'Low' | 'Medium' | 'High';
  const cfg = priorityConfig[priority] || priorityConfig.Medium;
  const PriorityIcon = cfg.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.taskStatus !== 'Done';

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
      {task.description && <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', cfg.bg, cfg.tone, cfg.ring)}>
          {priority}
        </span>
        {task.dueDate && (
          <span className={clsx('flex items-center gap-1 text-xs', isOverdue ? 'text-rose-500' : 'text-ink-400')}>
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 border-t border-ink-100 pt-3 dark:border-ink-800">
        {task.taskStatus !== 'Done' && (
          <button onClick={onComplete} className="rounded-lg px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Mark Complete">
            ? Done
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} className="rounded-lg p-1 text-ink-400 hover:text-rose-600" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TaskModal({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: CreateTaskPayload = {
      title: fd.get('title') as string,
      description: fd.get('description') as string || undefined,
      priority: fd.get('priority') as string,
      taskStatus: fd.get('taskStatus') as string,
      dueDate: fd.get('dueDate') as string || undefined,
    };
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Task" subtitle="Add a task or follow-up to your board.">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Task Title</label>
            <input name="title" className={inputCls} placeholder="Follow up with Sara Ahmed" required />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Description</label>
            <textarea name="description" className={inputCls + ' h-20 resize-none py-2'} placeholder="Task details..." />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Priority</label>
            <select name="priority" className={inputCls}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Status</label>
            <select name="taskStatus" className={inputCls}>
              {TASK_COLUMNS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Due Date</label>
            <input name="dueDate" type="date" className={inputCls} />
          </div>
        </div>

        {formError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{formError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
