import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Flag,
  AlertCircle,
  CheckCircle2,
  Clock,
  CircleDot,
  Plus,
  Loader2,
  Trash2,
  User,
  Filter,
  Users,
  Check,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useTasks, type ApiTask, type CreateTaskPayload } from '@/modules/CRM/useCrmApi';
import { useAuth } from '@/shared/context/AuthContext';
import { getAdmins, syncAdminsFromSupabase, getOwnerAdminEmail, type AdminUser } from '@/shared/lib/adminStore';
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

const inputCls =
  'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

export function TasksPage() {
  const { user, profile } = useAuth();
  const { hasAccess, canCreate, canDelete } = useDataAccess('tasks_followups');
  const { tasks, loading, error, createTask, completeTask, deleteTask, refetch } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);

  // Staff members list
  const [teamMembers, setTeamMembers] = useState<AdminUser[]>(() => getAdmins());
  const [staffFilter, setStaffFilter] = useState<string>('ALL');

  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const userRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  const isSalesOrStaff = userRole === 'sales' || userRole === 'staff' || userRole === 'agent';
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role).toLowerCase().trim();
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com' || ownerAdminEmail === 'superadmin@nexus.com';

  useEffect(() => {
    const handleAdminsChange = () => setTeamMembers(getAdmins());
    syncAdminsFromSupabase().then(() => setTeamMembers(getAdmins())).catch(() => {});
    window.addEventListener('nexus_admins_changed', handleAdminsChange);
    return () => window.removeEventListener('nexus_admins_changed', handleAdminsChange);
  }, []);

  // Filter ONLY sales and staff members added by this admin
  const myStaffMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      const role = (m.role || '').toLowerCase().trim();
      // 1. Only sales and staff roles (strictly exclude super_admin, admin, shop_admin)
      const isSalesOrStaffRole = role === 'sales' || role === 'staff' || role === 'agent' || role === 'support';
      if (!isSalesOrStaffRole) return false;

      // 2. Only staff added by this specific admin / workspace
      const creatorEmail = (m.created_by_email || '').toLowerCase().trim();
      const creatorId = m.created_by_id;
      const creatorRole = m.created_by_role;
      const staffShopId = m.shop_id;
      const currentShopId = profile?.shop_id || (user?.user_metadata as any)?.shop_id;

      if (isSuperAdminWorkspace) {
        return !creatorEmail || creatorEmail === 'admin@nexus.com' || creatorRole === 'SUPER_ADMIN';
      }

      return (
        creatorEmail === ownerAdminEmail ||
        creatorEmail === currentUserEmail ||
        creatorId === user?.id ||
        creatorId === profile?.id ||
        (staffShopId && currentShopId && staffShopId === currentShopId)
      );
    });
  }, [teamMembers, ownerAdminEmail, currentUserEmail, isSuperAdminWorkspace, user?.id, profile?.id, profile?.shop_id, user?.user_metadata]);

  // Filter tasks by selected staff member
  const displayTasks = useMemo(() => {
    if (!hasAccess) return [];
    let list = tasks;

    if (staffFilter === 'MY_TASKS') {
      list = list.filter((t) => {
        const assignedId = t.assignedToUserId;
        const assignedEmail = (t.assignedToEmail || '').toLowerCase().trim();
        const assignedName = (t.assignedAgentName || '').toLowerCase().trim();
        const myName = (profile?.full_name || user?.user_metadata?.full_name || '').toLowerCase().trim();

        return (
          assignedEmail === currentUserEmail ||
          assignedId === user?.id ||
          assignedId === profile?.id ||
          (myName && assignedName && assignedName.includes(myName))
        );
      });
    } else if (staffFilter !== 'ALL') {
      list = list.filter((t) => {
        const member = myStaffMembers.find((m) => m.id === staffFilter || m.email.toLowerCase() === staffFilter.toLowerCase());
        const targetEmail = member?.email.toLowerCase().trim() || staffFilter.toLowerCase();
        const targetId = member?.id || staffFilter;
        const targetName = (member?.full_name || '').toLowerCase().trim();

        const tEmail = (t.assignedToEmail || '').toLowerCase().trim();
        const tId = t.assignedToUserId;
        const tName = (t.assignedAgentName || '').toLowerCase().trim();

        return tEmail === targetEmail || tId === targetId || (targetName && tName && tName.includes(targetName));
      });
    }

    return list;
  }, [tasks, hasAccess, staffFilter, currentUserEmail, user?.id, profile?.id, profile?.full_name, user?.user_metadata?.full_name, myStaffMembers]);

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
      <PageHeader title="Tasks & Follow-ups" subtitle="Manage and track work distribution, staff assignments, and follow-ups.">
        <div className="flex items-center gap-3">
          {/* Staff Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-400" />
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="h-9 rounded-xl border border-ink-200 bg-white px-3 text-xs font-medium text-ink-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            >
              <option value="ALL">All Staff Members ({myStaffMembers.length})</option>
              {isSalesOrStaff && <option value="MY_TASKS">👤 My Assigned Tasks</option>}
              {myStaffMembers.map((m) => (
                <option key={m.id || m.email} value={m.id || m.email}>
                  {m.full_name || m.email} ({m.role?.toUpperCase() || 'STAFF'})
                </option>
              ))}
            </select>
          </div>

          {canCreate && (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          )}
        </div>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={refetch} className="ml-auto underline">
            Retry
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
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
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                    {colTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {colTasks.length > 0 ? (
                  colTasks.map((task, i) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      teamMembers={myStaffMembers}
                      delay={i * 0.05}
                      canDelete={canDelete}
                      onComplete={() => completeTask(task.id)}
                      onDelete={() => {
                        if (confirm('Delete this task?')) deleteTask(task.id);
                      }}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-xs text-ink-400 dark:border-ink-800">
                    No tasks in {col}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        open={modalOpen}
        teamMembers={myStaffMembers}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          await createTask(data);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function TaskCard({
  task,
  teamMembers,
  delay,
  canDelete,
  onComplete,
  onDelete,
}: {
  task: ApiTask;
  teamMembers: AdminUser[];
  delay: number;
  canDelete: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const priority = (task.priority || 'Medium') as 'Low' | 'Medium' | 'High';
  const cfg = priorityConfig[priority] || priorityConfig.Medium;
  const PriorityIcon = cfg.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.taskStatus !== 'Done';

  // Find assigned member name
  const assigneeName = useMemo(() => {
    if (task.assignedAgentName) return task.assignedAgentName;
    if (task.assignedToEmail) {
      const match = teamMembers.find((m) => m.email.toLowerCase() === task.assignedToEmail?.toLowerCase());
      if (match) return match.full_name || match.email;
    }
    if (task.assignedToUserId) {
      const match = teamMembers.find((m) => m.id === task.assignedToUserId);
      if (match) return match.full_name || match.email;
    }
    return 'Unassigned';
  }, [task, teamMembers]);

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

      {task.description && <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400 line-clamp-2">{task.description}</p>}

      {/* Assignee Badge */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          <User className="h-3 w-3" />
          <span>{assigneeName}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', cfg.bg, cfg.tone, cfg.ring)}>
          {priority}
        </span>
        {task.dueDate && (
          <span className={clsx('flex items-center gap-1 text-xs', isOverdue ? 'font-bold text-rose-500' : 'text-ink-400')}>
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-ink-100 pt-3 dark:border-ink-800">
        {task.taskStatus !== 'Done' && (
          <button
            onClick={onComplete}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center gap-1"
            title="Mark Complete"
          >
            <Check className="h-3.5 w-3.5" /> Done
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} className="rounded-lg p-1.5 text-ink-400 hover:text-rose-600" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TaskModal({
  open,
  teamMembers,
  onClose,
  onSubmit,
}: {
  open: boolean;
  teamMembers: AdminUser[];
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
    const selectedAssigneeValue = fd.get('assignedTo') as string;

    let assignedToUserId: string | undefined = undefined;
    let assignedAgentName: string | undefined = undefined;
    let assignedToEmail: string | undefined = undefined;

    if (selectedAssigneeValue && selectedAssigneeValue !== 'unassigned') {
      const member = teamMembers.find((m) => m.id === selectedAssigneeValue || m.email.toLowerCase() === selectedAssigneeValue.toLowerCase());
      if (member) {
        assignedToUserId = member.id;
        assignedAgentName = member.full_name || member.email;
        assignedToEmail = member.email;
      }
    }

    const payload: CreateTaskPayload = {
      title: (fd.get('title') as string).trim(),
      description: (fd.get('description') as string) || undefined,
      priority: fd.get('priority') as string,
      taskStatus: fd.get('taskStatus') as string,
      dueDate: (fd.get('dueDate') as string) || undefined,
      assignedToUserId,
      assignedAgentName,
      assignedToEmail,
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
    <Modal open={open} onClose={onClose} title="Create New Task" subtitle="Assign a task with priorities, staff assignment, and deadlines.">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-300">Task Title *</label>
            <input name="title" className={inputCls} placeholder="Follow up with customer regarding order" required />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-300">Assign To Staff / Sales Person *</label>
            <select name="assignedTo" className={inputCls} required defaultValue={teamMembers[0]?.id || ''}>
              <option value="" disabled>Select Staff Member</option>
              {teamMembers.map((m) => (
                <option key={m.id || m.email} value={m.id || m.email}>
                  {m.full_name || m.email} — ({m.role || 'Sales/Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-300">Description</label>
            <textarea name="description" className={inputCls + ' h-20 resize-none py-2'} placeholder="Task details, instructions, or notes..." />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-300">Priority</label>
            <select name="priority" className={inputCls} defaultValue="Medium">
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-300">Status</label>
            <select name="taskStatus" className={inputCls} defaultValue="To Do">
              {TASK_COLUMNS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-300">Due Date</label>
            <input name="dueDate" type="date" className={inputCls} defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        {formError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4" />
            {formError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Create & Assign Task'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
