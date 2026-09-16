import { useState, useMemo } from 'react';
import { Phone, Search, Filter, Trash2, Eye } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';
import type { LeadFromCall, LeadStatus } from './types';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface LeadManagementProps {
  store: StoreType;
}

export function LeadManagement({ store }: LeadManagementProps) {
  const { roleMode, leads, agents, updateLeadStatus } = store;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [selectedLead, setSelectedLead] = useState<LeadFromCall | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchQ = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchAgent = agentFilter === 'ALL' || l.agentId === agentFilter;
      return matchQ && matchStatus && matchAgent;
    });
  }, [leads, searchQuery, statusFilter, agentFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Master Calling Data Lead Management</h3>
            <p className="text-xs text-ink-500">Comprehensive database of all leads created automatically from calling logs and external sources.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <Filter className="h-3.5 w-3.5" /> Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-800 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Trial">Trial</option>
              <option value="Sales">Sales</option>
              <option value="Denied">Denied</option>
              <option value="Renewal">Renewal</option>
              <option value="Lead">Pending Lead</option>
            </select>

            {roleMode === 'Admin' && (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-800 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
              >
                <option value="ALL">All Agents</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search lead name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-xs text-ink-800 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/80 text-ink-500 dark:border-ink-800 dark:bg-ink-900/50">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider w-12">S.NO</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Phone Number</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Lead Name</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Assigned Agent</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Source</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Created Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead, idx) => (
                  <tr key={lead.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-900/40">
                    <td className="py-3.5 px-4 font-mono text-ink-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-ink-900 dark:text-ink-50">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-brand-500" />
                        <span>{lead.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-ink-900 dark:text-ink-100">{lead.name}</td>
                    <td className="py-3.5 px-4 font-medium text-ink-600 dark:text-ink-300">{lead.agentName}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        className="h-7 rounded-md border border-ink-200 bg-white px-2 text-[11px] font-semibold text-ink-800 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                      >
                        <option value="New">New</option>
                        <option value="Trial">Trial</option>
                        <option value="Sales">Sales</option>
                        <option value="Denied">Denied</option>
                        <option value="Renewal">Renewal</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink-500">
                      <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-300">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-ink-400 text-[11px]">{lead.createdDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLead(lead)}
                        className="h-8 text-xs text-ink-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-ink-400">
                    No leads match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-2xl space-y-3 text-xs">
            <h4 className="text-sm font-bold text-ink-900 dark:text-ink-100">Lead Comprehensive Record</h4>
            <div className="flex justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Lead Name:</span>
              <span className="font-bold text-ink-900 dark:text-ink-100">{selectedLead.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Phone:</span>
              <span className="font-mono font-bold text-brand-600">{selectedLead.phone}</span>
            </div>
            <div className="flex justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Assigned Agent:</span>
              <span className="font-semibold">{selectedLead.agentName}</span>
            </div>
            <div className="flex justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Status:</span>
              <StatusBadge status={selectedLead.status} variant="lead" />
            </div>
            <div className="flex justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Originating Source:</span>
              <span className="font-bold text-indigo-600">{selectedLead.source}</span>
            </div>
            <div className="border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500 block mb-1">Notes / Call Summary:</span>
              <p className="p-2 rounded bg-ink-50 dark:bg-ink-800 text-ink-800 dark:text-ink-200">{selectedLead.notes || 'No extra notes recorded.'}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={() => setSelectedLead(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
