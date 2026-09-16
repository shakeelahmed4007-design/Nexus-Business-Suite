import { useState, useMemo, useEffect } from 'react';
import { Search, Phone, TrendingUp, DollarSign, Calendar, RefreshCw, Eye, ShoppingCart, Filter, Shield } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useCallingDataStore } from '@/modules/CRM/CallingData/useCallingDataStore';
import type { LeadFromCall } from '@/modules/CRM/CallingData/types';
import { useAuth } from '@/shared/context/AuthContext';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { getOwnerAdminEmail } from '@/shared/lib/adminStore';
import { fetchOrdersApi, type Order } from '@/modules/Sales/salesApiService';

export function SalesDealsPage() {
  const { hasAccess } = useDataAccess('pos');
  const store = useCallingDataStore();
  const { user, profile } = useAuth();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);

  const { leads, updateLeadStatus } = store;
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [viewCustomer, setViewCustomer] = useState<LeadFromCall | null>(null);
  const [posOrders, setPosOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!hasAccess) return;
    fetchOrdersApi(ownerAdminEmail).then(data => {
      setPosOrders(data || []);
    }).catch(() => {});
  }, [ownerAdminEmail, hasAccess]);

  // Calling Data Converted Sales
  const callingDataSales = useMemo(() => {
    return leads.filter(l => l.status === 'Sales');
  }, [leads]);

  // Combined Sales Records
  const filteredCallingSales = useMemo(() => {
    return callingDataSales.filter(l => {
      const matchSearch = !searchQuery ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.agentName && l.agentName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchChannel = channelFilter === 'ALL' ||
        (channelFilter === 'Calling Data' && (l.source === 'Calling Data' || !l.source)) ||
        (channelFilter === 'Website' && l.source === 'Website') ||
        (channelFilter === 'Facebook' && l.source === 'Facebook');

      return matchSearch && matchChannel;
    });
  }, [callingDataSales, searchQuery, channelFilter]);

  // Metric Totals
  const totalCallingRevenue = callingDataSales.reduce((acc, l) => acc + (l.saleAmount || 50000), 0);
  const totalPosRevenue = posOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const combinedTotalRevenue = totalCallingRevenue + totalPosRevenue;

  const totalDealsCount = callingDataSales.length + posOrders.length;
  const avgDealValue = totalDealsCount > 0 ? Math.round(combinedTotalRevenue / totalDealsCount) : 0;

  const calculateDaysUntil = (dateStr?: string) => {
    if (!dateStr) return 180;
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.ceil((target - now) / 86400000));
  };

  if (!hasAccess) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <PageHeader
          title="Sales Deals & Converted Revenue"
          subtitle="Centralized dashboard of won deals converted from Calling Data, POS Checkouts, and Website Orders."
        />
        <AccessPendingBanner title="Sales Deals Access Required" subtitle="You do not have permission to view Sales Deals or revenue data. Please contact your administrator." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Sales Deals & Converted Revenue"
        subtitle="Centralized dashboard of won deals converted from Calling Data, POS Checkouts, and Website Orders."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-brand-50 to-indigo-50/50 dark:from-brand-950/20 dark:to-indigo-950/20 border-brand-200/80 dark:border-brand-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md font-bold">
              💰
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-800 dark:text-brand-300">Total Converted Revenue</p>
              <p className="text-xl font-extrabold text-brand-950 dark:text-brand-100 font-mono">
                PKR {combinedTotalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500">Won Sales Deals</p>
              <p className="text-xl font-extrabold text-ink-900 dark:text-ink-50 font-mono">
                {totalDealsCount} Deals
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 font-bold">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500">Average Deal Value</p>
              <p className="text-xl font-extrabold text-ink-900 dark:text-ink-50 font-mono">
                PKR {avgDealValue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 font-bold">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500">Calling Data Sales</p>
              <p className="text-xl font-extrabold text-ink-900 dark:text-ink-50 font-mono">
                {callingDataSales.length} Active
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-xs text-ink-800 focus:border-brand-400 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-400" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-9 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-800 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            >
              <option value="ALL">All Source Channels</option>
              <option value="Calling Data">📞 Calling Data</option>
              <option value="Website">🌐 Website Orders</option>
              <option value="Facebook">💬 Facebook Messages</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table of Sales Deals */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-ink-100 dark:border-ink-800">
          <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Calling Data Converted Deals</h3>
          <p className="text-xs text-ink-500">List of sales converted directly from sales calls, automatically tracked with renewal dates.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/80 text-ink-500 dark:border-ink-800 dark:bg-ink-900/50">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider w-12">S.NO</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Phone Number</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer Name</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Assigned Agent</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Source</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Sale Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Sale Value (PKR)</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Renewal Due Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {filteredCallingSales.length > 0 ? (
                filteredCallingSales.map((lead, idx) => {
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
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                          {lead.source || 'Calling Data'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-ink-500">{lead.saleDate || new Date().toISOString().split('T')[0]}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        PKR {(lead.saleAmount || 50000).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          daysLeft <= 30 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {lead.renewalDate || '2025-01-15'} ({daysLeft} days)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewCustomer(lead)}
                            className="h-8 text-xs text-ink-700"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Deal
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateLeadStatus(lead.id, 'Renewal')}
                            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Renewal Queue
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-ink-400">
                    No converted sales deals recorded from calling data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal for View Customer Deal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-2xl space-y-3 text-xs">
            <h4 className="text-sm font-bold text-ink-900 dark:text-ink-100">Sales Deal Details</h4>
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
              <span className="text-ink-500">Sale Amount:</span>
              <span className="font-mono font-bold text-emerald-600">PKR {(viewCustomer.saleAmount || 50000).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
              <span className="text-ink-500">Sale Date:</span>
              <span className="font-mono">{viewCustomer.saleDate || new Date().toISOString().split('T')[0]}</span>
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
