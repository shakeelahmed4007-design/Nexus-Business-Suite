import { useState, useMemo } from 'react';
import { Phone, Search, DollarSign, Calendar, RefreshCw, Eye } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';
import type { LeadFromCall } from './types';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface SalesPageProps {
  store: StoreType;
}

export function SalesPage({ store }: SalesPageProps) {
  const { leads, updateLeadStatus } = store;
  const [searchQuery, setSearchQuery] = useState('');
  const [viewCustomer, setViewCustomer] = useState<LeadFromCall | null>(null);

  const salesLeads = useMemo(() => {
    return leads
      .filter(l => l.status === 'Sales')
      .filter(l => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q);
      });
  }, [leads, searchQuery]);

  const calculateDaysUntil = (dateStr?: string) => {
    if (!dateStr) return 180;
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.ceil((target - now) / 86400000));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Converted Sales & Customers</h3>
            <p className="text-xs text-ink-500">Calling numbers linked to won deals. Track revenue and upcoming subscription renewals.</p>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search sales or customer..."
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
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Sale Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Sale Value (PKR)</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Renewal Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {salesLeads.length > 0 ? (
                salesLeads.map((lead, idx) => {
                  const daysLeft = calculateDaysUntil(lead.renewalDate);
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
                      <td className="py-3.5 px-4 font-mono text-ink-500">{lead.saleDate || '2024-01-15'}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        PKR {(lead.saleAmount || 50000).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <StatusBadge
                          status={lead.renewalDate || '2025-01-15'}
                          variant="renewal"
                          daysUntilRenewal={daysLeft}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewCustomer(lead)}
                            className="h-8 text-xs text-ink-700"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateLeadStatus(lead.id, 'Renewal')}
                            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Schedule Renewal
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-ink-400">
                    No converted sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Customer Details Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-2xl space-y-3 text-xs">
            <h4 className="text-sm font-bold text-ink-900 dark:text-ink-100">Customer Deal Record</h4>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Customer Name:</span>
              <span className="font-bold text-ink-900 dark:text-ink-100">{viewCustomer.name}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Phone Number:</span>
              <span className="font-mono font-bold text-brand-600">{viewCustomer.phone}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Assigned Agent:</span>
              <span className="font-semibold">{viewCustomer.agentName}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Total Sale Amount:</span>
              <span className="font-mono font-bold text-emerald-600">PKR {(viewCustomer.saleAmount || 50000).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Sale Date:</span>
              <span className="font-mono">{viewCustomer.saleDate || '2024-01-15'}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Renewal Due Date:</span>
              <span className="font-mono font-bold text-amber-600">{viewCustomer.renewalDate || '2025-01-15'}</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={() => setViewCustomer(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
