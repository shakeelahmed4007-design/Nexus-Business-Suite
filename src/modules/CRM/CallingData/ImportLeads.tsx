import { useState } from 'react';
import { Globe, Facebook, Instagram, MessageCircle, UserPlus, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import type { useCallingDataStore } from './useCallingDataStore';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface ImportLeadsProps {
  store: StoreType;
}

export function ImportLeads({ store }: ImportLeadsProps) {
  const { importedLeads, agents, assignImportedLead, autoAssignImportedLeads } = store;
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const pendingLeads = importedLeads.filter(i => i.status === 'Pending');

  const handleSingleAssign = (leadId: string, agentId: string) => {
    if (!agentId) return;
    setAssigningId(leadId);
    setTimeout(() => {
      assignImportedLead(leadId, agentId);
      setAssigningId(null);
    }, 200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Integrations Banner */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">Connected External Integrations</h3>
        <p className="text-xs text-ink-500 mb-4">Leads generated from web forms and social media channels flow directly into this queue for distribution.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Website Lead Form', icon: Globe, connected: true, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
            { name: 'Facebook Page Messages', icon: Facebook, connected: true, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' },
            { name: 'Instagram DMs', icon: Instagram, connected: false, color: 'text-pink-500 bg-pink-50 dark:bg-pink-500/10' },
            { name: 'WhatsApp Business', icon: MessageCircle, connected: false, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-xl border border-ink-200 p-3.5 dark:border-ink-800 bg-white dark:bg-ink-900">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-900 dark:text-ink-100">{item.name}</p>
                  <p className="text-[10px] text-ink-400">{item.connected ? 'Active Sync' : 'Not Connected'}</p>
                </div>
              </div>
              <input type="checkbox" checked={item.connected} readOnly className="rounded text-brand-600 focus:ring-brand-500" />
            </div>
          ))}
        </div>
      </Card>

      {/* Imported Leads Assignment Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-ink-100 dark:border-ink-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Pending Imported Leads Queue</h3>
            <p className="text-xs text-ink-500">
              {pendingLeads.length} leads awaiting assignment to sales agents.
            </p>
          </div>
          <Button
            size="sm"
            onClick={autoAssignImportedLeads}
            disabled={pendingLeads.length === 0}
            className="bg-brand-600 hover:bg-brand-700 text-white shadow-md"
          >
            <Zap className="h-4 w-4" /> Auto Assign Round-Robin
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/80 text-ink-500 dark:border-ink-800 dark:bg-ink-900/50">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Lead Name</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Phone Number</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Email / Message</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Source Channel</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Import Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Assign to Sales Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {importedLeads.map((imp) => {
                const isAssigned = imp.status === 'Assigned';
                return (
                  <tr key={imp.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-900/40">
                    <td className="py-3.5 px-4 font-bold text-ink-900 dark:text-ink-100">{imp.name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">{imp.phone}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-ink-600 dark:text-ink-300">
                      <div>{imp.email}</div>
                      <span className="text-[10px] text-ink-400 italic">{imp.message}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {imp.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-ink-400 text-[11px]">{imp.importedDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Assigned: {imp.assignedAgentName}
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            defaultValue=""
                            onChange={(e) => handleSingleAssign(imp.id, e.target.value)}
                            disabled={assigningId === imp.id}
                            className="h-8 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-800 shadow-xs focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                          >
                            <option value="">— Select Agent —</option>
                            {agents.map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
