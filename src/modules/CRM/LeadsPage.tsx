import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Plus, Mail, Phone, DollarSign, User, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Card } from '@/shared/components/ui/Card';
import { Modal } from '@/shared/components/ui/Modal';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { leads as fullLeads, leadStages, type Lead } from '@/modules/CRM/leads';

const stageTones: Record<string, 'gray' | 'brand' | 'cyan' | 'amber' | 'violet' | 'green' | 'rose'> = {
  New: 'gray',
  Contacted: 'brand',
  Qualified: 'cyan',
  Proposal: 'amber',
  Negotiation: 'violet',
  Won: 'green',
  Lost: 'rose',
};

export function LeadsPage() {
  const { hasAccess, canCreate, canEdit, canDelete } = useDataAccess('lead_management');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);

  const displayLeads = hasAccess ? fullLeads : [];

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

      {view === 'kanban' ? (
        <KanbanView leads={displayLeads} canEdit={canEdit} canDelete={canDelete} />
      ) : (
        <TableView leads={displayLeads} canEdit={canEdit} canDelete={canDelete} />
      )}

      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function KanbanView({
  leads,
  canEdit,
  canDelete,
}: {
  leads: Lead[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {leadStages.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage);
        const total = stageLeads.reduce((a, l) => a + l.value, 0);
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
                        {lead.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Edit lead ${lead.id}`);
                            }}
                            className="rounded p-1 text-ink-400 hover:text-brand-600"
                            title="Edit Lead"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Delete lead ${lead.id}`);
                            }}
                            className="rounded p-1 text-ink-400 hover:text-rose-600"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-ink-50">{lead.name}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{lead.company}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">PKR {(lead.value / 1000).toFixed(0)}K</span>
                      <span className="text-xs text-ink-400">{lead.source}</span>
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

function TableView({
  leads,
  canEdit,
  canDelete,
}: {
  leads: Lead[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Lead',
      render: (l) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {l.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="font-medium text-ink-900 dark:text-ink-50">{l.name}</p>
            <p className="text-xs text-ink-400">{l.company}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (l) => (
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-xs text-ink-500"><Phone className="h-3 w-3" />{l.phone}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-500"><Mail className="h-3 w-3" />{l.email}</p>
        </div>
      ),
    },
    { key: 'value', header: 'Value', align: 'right', render: (l) => <span className="font-semibold text-ink-900 dark:text-ink-50">PKR {l.value.toLocaleString()}</span> },
    { key: 'stage', header: 'Stage', render: (l) => <Badge tone={stageTones[l.stage]}>{l.stage}</Badge> },
    { key: 'source', header: 'Source' },
    { key: 'owner', header: 'Owner', render: (l) => <span className="text-xs text-ink-500">{l.owner}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <button
              onClick={() => alert(`Editing lead ${l.name}`)}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
              title="Edit Lead"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => alert(`Deleting lead ${l.name}`)}
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
      <Table columns={columns} data={leads} rowKey={(l) => l.id} emptyText="No leads available. Data access authorization pending." />
    </Card>
  );
}

function LeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Lead"
      subtitle="Enter the prospect's details to add them to your pipeline."
    >
      <form onSubmit={(e) => {
        e.preventDefault();
        alert('Lead Created Successfully!');
        onClose();
      }}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" icon={User}><input className={inputCls} placeholder="John Doe" required /></Field>
          <Field label="Company" icon={User}><input className={inputCls} placeholder="Company Inc." required /></Field>
          <Field label="Email" icon={Mail}><input type="email" className={inputCls} placeholder="john@company.com" required /></Field>
          <Field label="Phone" icon={Phone}><input type="tel" className={inputCls} placeholder="+92 300 1234567" required /></Field>
          <Field label="Deal Value (PKR)" icon={DollarSign}><input className={inputCls} placeholder="100000" type="number" required /></Field>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Stage</label>
            <select className={inputCls}>
              {leadStages.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Source</label>
            <input className={inputCls} placeholder="Website, Referral, etc." required />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm">Create Lead</Button>
        </div>
      </form>
    </Modal>
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
