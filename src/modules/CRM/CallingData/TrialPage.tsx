import { useState, useMemo } from 'react';
import { Phone, Search, Clock, CheckCircle2, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';
import type { LeadFromCall } from './types';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface TrialPageProps {
  store: StoreType;
}

export function TrialPage({ store }: TrialPageProps) {
  const { leads, updateLeadStatus } = store;
  const [searchQuery, setSearchQuery] = useState('');

  // Filter leads with status === 'Trial'
  const trialLeads = useMemo(() => {
    return leads
      .filter(l => l.status === 'Trial')
      .filter(l => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.trialRemainingMonths || 0) - (b.trialRemainingMonths || 0));
  }, [leads, searchQuery]);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Active Trial Leads</h3>
            <p className="text-xs text-ink-500">Calling numbers linked to active trial customers. Color-coded by trial expiration.</p>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search by customer or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-xs text-ink-800 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            />
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
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Trial Period</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Time Remaining</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {trialLeads.length > 0 ? (
                trialLeads.map((lead, idx) => {
                  const remMonths = lead.trialRemainingMonths ?? 6;
                  return (
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
                      <td className="py-3.5 px-4 font-semibold text-emerald-700 dark:text-emerald-400">
                        {lead.trialPeriod || '12 months'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={`${remMonths} months left`}
                          variant="trial"
                          remainingMonths={remMonths}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => updateLeadStatus(lead.id, 'Sales')}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Convert to Sale
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateLeadStatus(lead.id, 'Trial', { trialRemainingMonths: (lead.trialRemainingMonths || 6) + 6 })}
                            className="h-8 text-xs text-brand-600 hover:bg-brand-50"
                          >
                            Extend
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateLeadStatus(lead.id, 'Denied')}
                            className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Deny
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-400">
                    No leads currently on trial. Log a call as "Interested" to add leads to trial!
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
