import { useState, useMemo } from 'react';
import { Phone, Search, RefreshCw, CheckCircle, PhoneCall, AlertTriangle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';
import type { CallingNumber } from './types';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface RenewalPageProps {
  store: StoreType;
  onLogCall: (num: CallingNumber) => void;
}

export function RenewalPage({ store, onLogCall }: RenewalPageProps) {
  const { leads, numbers, updateLeadStatus } = store;
  const [searchQuery, setSearchQuery] = useState('');

  const renewalLeads = useMemo(() => {
    return leads
      .filter(l => l.status === 'Renewal')
      .filter(l => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q);
      });
  }, [leads, searchQuery]);

  const calculateDaysUntil = (dateStr?: string) => {
    if (!dateStr) return 45;
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((target - now) / 86400000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Subscription Renewals Due</h3>
            <p className="text-xs text-ink-500">Calling numbers linked to existing accounts due for contract renewal.</p>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search renewal customer..."
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
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Renewal Due Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Contact Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {renewalLeads.length > 0 ? (
                renewalLeads.map((lead, idx) => {
                  const daysLeft = calculateDaysUntil(lead.renewalDate);
                  const matchingNum = numbers.find(n => n.id === lead.callingDataId || n.phone === lead.phone);

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
                      <td className="py-3.5 px-4 font-mono">
                        <StatusBadge
                          status={lead.renewalDate || '2025-01-15'}
                          variant="renewal"
                          daysUntilRenewal={daysLeft}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          lead.contactStatus === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                          lead.contactStatus === 'In Discussion' ? 'bg-amber-50 text-amber-700' : 'bg-ink-100 text-ink-600'
                        }`}>
                          {lead.contactStatus || 'Not Contacted'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {matchingNum && (
                            <Button
                              size="sm"
                              onClick={() => onLogCall(matchingNum)}
                              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                            >
                              <PhoneCall className="h-3.5 w-3.5" /> Call
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => updateLeadStatus(lead.id, 'Sales', { contactStatus: 'Confirmed' })}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Confirm Renewal
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-400">
                    No customers currently due for renewal.
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
