import { useState, useMemo } from 'react';
import { Phone, Search, AlertCircle, RotateCcw, Archive } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface DeniedPageProps {
  store: StoreType;
}

export function DeniedPage({ store }: DeniedPageProps) {
  const { leads, updateLeadStatus } = store;
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  const deniedLeads = useMemo(() => {
    return leads
      .filter(l => l.status === 'Denied')
      .filter(l => {
        const matchQ = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.toLowerCase().includes(searchQuery.toLowerCase());
        const matchReason = reasonFilter === 'ALL' || l.denialReason === reasonFilter;
        return matchQ && matchReason;
      });
  }, [leads, searchQuery, reasonFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Denied & Rejected Calling Leads</h3>
            <p className="text-xs text-ink-500">Analyze lost prospects, reason for rejection, and re-engage lost leads.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-800 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            >
              <option value="ALL">All Rejection Reasons</option>
              <option value="Budget">Price / Budget Issue</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Wrong Number">Wrong Number</option>
              <option value="Competitor">Using Competitor</option>
            </select>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search phone or name..."
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
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer Name</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Agent Name</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Denial Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Rejection Reason</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {deniedLeads.length > 0 ? (
                deniedLeads.map((lead, idx) => (
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
                    <td className="py-3.5 px-4 font-mono text-ink-500">{lead.denialDate || '2024-01-12'}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                        <AlertCircle className="h-3 w-3 text-rose-500" />
                        {lead.denialReason || 'Not Interested'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => updateLeadStatus(lead.id, 'Lead')}
                          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Retry Contact
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-400">
                    No denied or rejected leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
