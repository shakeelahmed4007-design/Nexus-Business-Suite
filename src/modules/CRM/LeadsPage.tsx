import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Plus, Mail, Phone, DollarSign, User, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Card } from '@/shared/components/ui/Card';
import { Modal } from '@/shared/components/ui/Modal';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useLeads, type ApiLead, type CreateLeadPayload } from '@/modules/CRM/useCrmApi';

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'] as const;
const LEAD_SOURCES = ['Website', 'Cold Call', 'Referral', 'Social Media', 'Manual Entry'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

const stageTones: Record<string, 'gray' | 'brand' | 'cyan' | 'amber' | 'violet' | 'green' | 'rose'> = {
  New: 'gray',
  Contacted: 'brand',
  Qualified: 'cyan',
  Negotiating: 'violet',
  Won: 'green',
  Lost: 'rose',
};

export function LeadsPage() {
  const { hasAccess, canCreate, canEdit, canDelete } = useDataAccess('lead_management');
  const { leads, loading, error, createLead, deleteLead, updateLeadStatus, refetch } = useLeads();
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);

  const displayLeads = hasAccess ? leads : [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading leads...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Lead Management" subtitle="Track and manage your sales pipeline.">
        <Button variant="secondary" size="sm" onClick={() => setView(view === 'kanban' ? 'table' : 'kanban')}>
          {view === 'kanban' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          {view === 'kanban' ? 'Table View' : 'Kanban View'}
        </Button>

        {canCreate && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Lead
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

      {view === 'kanban' ? (
        <KanbanView leads={displayLeads} canEdit={canEdit} canDelete={canDelete} onDelete={deleteLead} onStatusChange={updateLeadStatus} />
      ) : (
        <TableView leads={displayLeads} canEdit={canEdit} canDelete={canDelete} onDelete={deleteLead} />
      )}

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          await createLead(data);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function KanbanView({ leads, canEdit, canDelete, onDelete, onStatusChange }: {
  leads: ApiLead[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {LEAD_STATUSES.map((stage) => {
        const stageLeads = leads.filter((l) => (l.leadStatus || 'New') === stage);
        const total = stageLeads.reduce((a, l) => a + (l.leadValue || 0), 0);
        return (
          <div key={stage} className="w-72 shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={stageTones[stage]}>{stage}</Badge>
                <span className="text-xs text-ink-400">{stageLeads.length}</span>
              </div>
              <span className="text-xs font-medium text-ink-500">{(total / 1000).toFixed(0)}K</span>
            </div>
            <div className="space-y-3 min-h-[120px]">
              {stageLeads.length > 0 ? (
                stageLeads.map((lead, i) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    className="cursor-pointer rounded-xl border border-ink-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-lg dark:border-ink-800 dark:bg-ink-900"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {`${lead.firstName[0]}${lead.lastName[0]}`}
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <select
                            value={lead.leadStatus || 'New'}
                            onChange={(e) => { e.stopPropagation(); onStatusChange(lead.id, e.target.value); }}
                            className="rounded border border-ink-200 bg-transparent px-1 text-[10px] text-ink-500 dark:border-ink-700"
                          >
                            {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('Delete this lead?')) onDelete(lead.id); }}
                            className="rounded p-1 text-ink-400 hover:text-rose-600"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-ink-50">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{lead.companyName || '�'}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">PKR {((lead.leadValue || 0) / 1000).toFixed(0)}K</span>
                      <span className="text-xs text-ink-400">{lead.leadSource || '�'}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400 dark:border-ink-800">
                  No leads in stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ leads, canEdit, canDelete, onDelete }: {
  leads: ApiLead[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const columns: Column<ApiLead>[] = [
    {
      key: 'name',
      header: 'Lead',
      render: (l) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {`${l.firstName[0]}${l.lastName[0]}`}
          </div>
          <div>
            <p className="font-medium text-ink-900 dark:text-ink-50">{l.firstName} {l.lastName}</p>
            <p className="text-xs text-ink-400">{l.companyName || '�'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (l) => (
        <div className="space-y-0.5">
          {l.phone && <p className="flex items-center gap-1.5 text-xs text-ink-500"><Phone className="h-3 w-3" />{l.phone}</p>}
          {l.email && <p className="flex items-center gap-1.5 text-xs text-ink-500"><Mail className="h-3 w-3" />{l.email}</p>}
        </div>
      ),
    },
    { key: 'leadValue', header: 'Value', align: 'right', render: (l) => <span className="font-semibold text-ink-900 dark:text-ink-50">PKR {(l.leadValue || 0).toLocaleString()}</span> },
    { key: 'leadStatus', header: 'Stage', render: (l) => <Badge tone={stageTones[l.leadStatus || 'New']}>{l.leadStatus || 'New'}</Badge> },
    { key: 'leadSource', header: 'Source', render: (l) => <span className="text-xs">{l.leadSource || '�'}</span> },
    { key: 'priority', header: 'Priority', render: (l) => <span className="text-xs text-ink-500">{l.priority || '�'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          {canDelete && (
            <button
              onClick={() => { if (confirm('Delete this lead?')) onDelete(l.id); }}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600"
              title="Delete Lead"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Table columns={columns} data={leads} rowKey={(l) => l.id} emptyText="No leads yet. Click 'Add Lead' to create your first one." />
    </Card>
  );
}

const inputCls = 'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

function Field({ label, icon: Icon, children }: { label: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}

function LeadModal({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLeadPayload) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: CreateLeadPayload = {
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string || undefined,
      phone: fd.get('phone') as string || undefined,
      companyName: fd.get('companyName') as string || undefined,
      leadValue: Number(fd.get('leadValue')) || 0,
      leadSource: fd.get('leadSource') as string,
      leadStatus: fd.get('leadStatus') as string,
      priority: fd.get('priority') as string,
      notes: fd.get('notes') as string || undefined,
    };
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Lead" subtitle="Enter the prospect's details to add them to your pipeline.">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name" icon={User}><input name="firstName" className={inputCls} placeholder="Sara" required /></Field>
          <Field label="Last Name" icon={User}><input name="lastName" className={inputCls} placeholder="Ahmed" required /></Field>
          <Field label="Email" icon={Mail}><input name="email" type="email" className={inputCls} placeholder="sara@company.com" /></Field>
          <Field label="Phone" icon={Phone}><input name="phone" type="tel" className={inputCls} placeholder="+92 300 1234567" /></Field>
          <Field label="Company" icon={User}><input name="companyName" className={inputCls} placeholder="TechVision Ltd" /></Field>
          <Field label="Deal Value (PKR)" icon={DollarSign}><input name="leadValue" className={inputCls} placeholder="100000" type="number" min="0" /></Field>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Lead Source</label>
            <select name="leadSource" className={inputCls}>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Status</label>
            <select name="leadStatus" className={inputCls}>
              {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Priority</label>
            <select name="priority" className={inputCls}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Notes</label>
            <textarea name="notes" className={inputCls + ' h-20 resize-none py-2'} placeholder="Any additional notes..." />
          </div>
        </div>

        {formError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{formError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
