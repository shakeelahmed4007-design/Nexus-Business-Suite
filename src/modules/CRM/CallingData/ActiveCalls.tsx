import { useState, useMemo } from 'react';
import { Phone, Search, Calendar, PhoneCall, CheckCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';
import type { CallingNumber } from './types';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface ActiveCallsProps {
  store: StoreType;
  onLogCall: (num: CallingNumber) => void;
}

export function ActiveCalls({ store, onLogCall }: ActiveCallsProps) {
  const { numbers, leads } = store;
  const [searchPhone, setSearchPhone] = useState('');

  // Active numbers awaiting response or callback
  const activeNumbers = useMemo(() => {
    return numbers.filter(n => {
      const matchPhone = !searchPhone || n.phone.toLowerCase().includes(searchPhone.toLowerCase());
      const isCallbackLater = n.lastCallStatus === 'Callback Later';
      const isInterested = n.lastCallStatus === 'Interested';
      const isLeadPending = leads.some(l => l.callingDataId === n.id && (l.status === 'Lead' || l.status === 'New'));
      return matchPhone && (isCallbackLater || isInterested || isLeadPending);
    });
  }, [numbers, leads, searchPhone]);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Active Calls & Follow-Up Callbacks</h3>
            <p className="text-xs text-ink-500">Track pending callbacks, negotiating prospects, and active responses.</p>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search phone number..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-xs font-mono text-ink-800 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
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
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Agent</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Active Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Next Call Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Last Discussion Notes</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {activeNumbers.length > 0 ? (
                activeNumbers.map((num, idx) => {
                  const linkedLog = store.callLogs.find(cl => cl.callingDataId === num.id);
                  const nextDate = linkedLog?.nextCallbackDate || 'Tomorrow 10:00 AM';

                  return (
                    <tr key={num.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-900/40">
                      <td className="py-3.5 px-4 font-mono text-ink-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-ink-900 dark:text-ink-50">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-brand-500" />
                          <span>{num.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-ink-700 dark:text-ink-200">{num.agentName}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={num.lastCallStatus || 'Callback Later'} variant="callLog" />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{nextDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-ink-600 dark:text-ink-300 max-w-xs truncate">
                        {num.lastCallNotes || 'Callback scheduled.'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => onLogCall(num)}
                          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                        >
                          <PhoneCall className="h-3.5 w-3.5" /> Log Follow-up
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-400">
                    No active pending callbacks at the moment.
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
