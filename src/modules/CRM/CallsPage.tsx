import { useState } from 'react';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Plus, Loader2, AlertCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Table, type Column } from '@/shared/components/ui/Table';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useCallingData, type ApiCallingData } from '@/modules/CRM/useCrmApi';

const inputCls = 'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

export function CallsPage() {
  const { hasAccess, canCreate } = useDataAccess('calling_data');
  const { callingData, loading, error, addNumber, refetch } = useCallingData();
  const [modalOpen, setModalOpen] = useState(false);

  const displayData = hasAccess ? callingData : [];

  const columns: Column<ApiCallingData>[] = [
    {
      key: 'phone',
      header: 'Phone Number',
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <Phone className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="font-medium text-ink-900 dark:text-ink-50">{c.phoneNumber}</p>
            {c.contactName && <p className="text-xs text-ink-400">{c.contactName}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => {
        const status = c.status || 'Available';
        const color = status === 'Called' ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
          : status === 'Assigned' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'
          : 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/10';
        return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (c) => <span className="text-xs text-ink-500">{c.notes || '—'}</span>,
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (c) => (
        <span className="text-xs text-ink-400">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'added',
      header: 'Added',
      render: (c) => <span className="text-xs text-ink-400">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading calling data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calling Data" subtitle="Track and manage all your calling numbers.">
        {canCreate && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Number
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Numbers', value: displayData.length, icon: Phone, color: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' },
          { label: 'Available', value: displayData.filter(d => d.status === 'Available' || !d.status).length, icon: PhoneIncoming, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
          { label: 'Assigned', value: displayData.filter(d => d.status === 'Assigned').length, icon: PhoneOutgoing, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
          { label: 'Called', value: displayData.filter(d => d.status === 'Called').length, icon: PhoneMissed, color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-ink-900 dark:text-ink-50">{stat.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader title="Calling Numbers" subtitle={`${displayData.length} numbers total`} />
        <div className="pt-3">
          <Table
            columns={columns}
            data={displayData}
            rowKey={(c) => c.id}
            emptyText={hasAccess ? 'No calling numbers yet. Click "Add Number" to get started.' : 'Data access restricted.'}
          />
        </div>
      </Card>

      <AddNumberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          await addNumber(data);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function AddNumberModal({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { phoneNumber: string; contactName?: string; notes?: string }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await onSubmit({
        phoneNumber: fd.get('phoneNumber') as string,
        contactName: fd.get('contactName') as string || undefined,
        notes: fd.get('notes') as string || undefined,
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to add number');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Calling Number" subtitle="Add a new phone number to your calling list.">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Phone Number</label>
            <input name="phoneNumber" type="tel" className={inputCls} placeholder="+92 300 1234567" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Contact Name (optional)</label>
            <input name="contactName" className={inputCls} placeholder="Sara Ahmed" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Notes (optional)</label>
            <textarea name="notes" className={inputCls + ' h-20 resize-none py-2'} placeholder="Any notes about this number..." />
          </div>
        </div>

        {formError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600"><AlertCircle className="h-4 w-4" />{formError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Add Number'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
