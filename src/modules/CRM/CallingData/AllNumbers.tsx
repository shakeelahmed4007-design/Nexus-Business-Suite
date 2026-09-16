import { useState, useMemo } from 'react';
import { Phone, Copy, Check, Search, Filter, PhoneCall, History, CheckSquare, Square, Users, Sparkles } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { StatusBadge } from './shared/StatusBadge';
import type { useCallingDataStore } from './useCallingDataStore';
import type { CallingNumber } from './types';

type StoreType = ReturnType<typeof useCallingDataStore>;

interface AllNumbersProps {
  store: StoreType;
  onLogCall: (num: CallingNumber) => void;
}

export function AllNumbers({ store, onLogCall }: AllNumbersProps) {
  const { roleMode, numbers, agents, returnToAdminPool, reassignNumberToAgent, convertNumberToTarget } = store;
  const [searchPhone, setSearchPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewHistoryNum, setViewHistoryNum] = useState<CallingNumber | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleCopy = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredNumbers = useMemo(() => {
    return numbers.filter(n => {
      const matchPhone = !searchPhone || n.phone.toLowerCase().includes(searchPhone.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || n.status === statusFilter || (statusFilter === 'Unused' && n.status === 'Allocated');
      const matchAgent = agentFilter === 'ALL' || n.agentId === agentFilter;
      return matchPhone && matchStatus && matchAgent;
    });
  }, [numbers, searchPhone, statusFilter, agentFilter]);

  const visibleNumbers = useMemo(() => filteredNumbers.slice(0, 100), [filteredNumbers]);

  const allVisibleSelected = useMemo(() => {
    return visibleNumbers.length > 0 && visibleNumbers.every((n) => selectedIds.includes(n.id));
  }, [visibleNumbers, selectedIds]);

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleNumbers.map((n) => n.id));
    }
  };

  const toggleSelectNum = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = (targetAgId: string) => {
    if (!targetAgId || selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      reassignNumberToAgent(id, targetAgId);
    });
    setSelectedIds([]);
  };

  const handleBulkSendTo = (target: 'Sales' | 'Trial' | 'Renewal' | 'Denied' | 'Admin') => {
    if (!target || selectedIds.length === 0) return;
    if (target === 'Sales') {
      const amtStr = window.prompt(`Enter Deal/Sale Amount in PKR for ${selectedIds.length} selected numbers:`, '50000');
      if (amtStr !== null) {
        const amt = Number(amtStr) || 50000;
        selectedIds.forEach((id) => convertNumberToTarget(id, 'Sales', undefined, amt, 'Bulk converted to Sales'));
      }
    } else {
      selectedIds.forEach((id) => convertNumberToTarget(id, target, undefined, undefined, `Bulk sent to ${target}`));
    }
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-4 text-xs font-mono text-ink-800 focus:border-brand-400 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            />
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
              <option value="Allocated">Unused / Allocated</option>
              <option value="Used">Called / Used</option>
              <option value="Expired">Expired</option>
            </select>

            {roleMode === 'Admin' && (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-800 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
              >
                <option value="ALL">All Sales Agents</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Floating Bulk Action Bar when items are selected */}
      {selectedIds.length > 0 && (
        <Card className="p-3.5 bg-brand-600 text-white border-brand-600 shadow-xl animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 font-bold text-xs">
                {selectedIds.length}
              </span>
              <div>
                <p className="text-xs font-extrabold">Multiple Numbers Selected</p>
                <p className="text-[11px] text-brand-100">Perform bulk assignment or move stage for all selected numbers.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Assign Agent Dropdown */}
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-200" />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    handleBulkAssign(e.target.value);
                    e.target.value = '';
                  }}
                  className="h-8 rounded-lg border border-white/30 bg-white/10 px-2 text-xs font-semibold text-white focus:outline-none hover:bg-white/20 dark:bg-ink-800"
                >
                  <option value="" disabled className="text-ink-900">👤 Assign Selected ({selectedIds.length}) to...</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="text-ink-900">
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bulk Send To Target Dropdown */}
              <select
                defaultValue=""
                onChange={(e) => {
                  handleBulkSendTo(e.target.value as any);
                  e.target.value = '';
                }}
                className="h-8 rounded-lg border border-white/30 bg-white/10 px-2 text-xs font-semibold text-white focus:outline-none hover:bg-white/20 dark:bg-ink-800"
              >
                <option value="" disabled className="text-ink-900">🚀 Bulk Send ({selectedIds.length}) To...</option>
                <option value="Sales" className="text-ink-900">💰 Sales Deals</option>
                <option value="Trial" className="text-ink-900">🌟 Trial Leads</option>
                <option value="Renewal" className="text-ink-900">🔄 Renewal List</option>
                <option value="Denied" className="text-ink-900">❌ Denied / Closed</option>
                <option value="Admin" className="text-ink-900">👑 Admin Pool</option>
              </select>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="h-8 px-2.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Numbers Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900 dark:text-ink-100">Allocated Calling Numbers</h3>
            <p className="text-xs text-ink-500">
              Showing {visibleNumbers.length} of {numbers.length} allocated numbers.
              {selectedIds.length > 0 && <strong className="ml-1 text-brand-600">({selectedIds.length} selected)</strong>}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/80 text-ink-500 dark:border-ink-800 dark:bg-ink-900/50">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-brand-600 focus:outline-none dark:text-brand-400"
                    title={allVisibleSelected ? 'Deselect All' : 'Select All Visible'}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4 text-ink-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold uppercase tracking-wider w-12">S.NO</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Phone Number</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Assigned Agent</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Last Call</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Call Notes / Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {visibleNumbers.map((num, idx) => {
                const isCalled = num.status === 'Used' || !!num.lastCallStatus;
                const isChecked = selectedIds.includes(num.id);

                return (
                  <tr
                    key={num.id}
                    className={`transition-colors ${isChecked
                      ? 'bg-brand-50/60 dark:bg-brand-500/10'
                      : 'hover:bg-ink-50/60 dark:hover:bg-ink-900/40'
                      }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectNum(num.id)}
                        className="text-brand-600 focus:outline-none dark:text-brand-400"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4 text-ink-400 hover:text-ink-600" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono text-ink-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-ink-900 dark:text-ink-50">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-brand-500" />
                        <span>{num.phone}</span>
                        <button
                          onClick={() => handleCopy(num.phone, num.id)}
                          className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
                          title="Copy phone"
                        >
                          {copiedId === num.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={num.agentId || ''}
                        onChange={(e) => {
                          const targetAgId = e.target.value;
                          if (targetAgId) {
                            reassignNumberToAgent(num.id, targetAgId);
                          }
                        }}
                        className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-800 shadow-xs hover:border-brand-400 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                        title="Assign to specific person / agent"
                      >
                        <option value="" disabled>-- Assign Person --</option>
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={isCalled ? 'Used' : 'Allocated'} variant="calling" />
                    </td>
                    <td className="py-3 px-4 text-ink-500 font-mono text-[11px]">
                      {num.lastCallTimestamp ? new Date(num.lastCallTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 text-ink-600 dark:text-ink-300 max-w-xs truncate">
                      {num.lastCallStatus ? (
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={num.lastCallStatus} variant="callLog" />
                          <span className="truncate text-[11px]">{num.lastCallNotes}</span>
                        </div>
                      ) : (
                        <span className="text-ink-400 italic">Unused / Not Called</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send To Target Select */}
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value as any;
                            if (!val) return;
                            if (val === 'Sales') {
                              const amtStr = window.prompt(`Enter Deal/Sale Amount in PKR for ${num.phone}:`, '50000');
                              if (amtStr !== null) {
                                const amt = Number(amtStr) || 50000;
                                convertNumberToTarget(num.id, 'Sales', undefined, amt, 'Converted via quick action');
                              }
                            } else {
                              convertNumberToTarget(num.id, val, undefined, undefined, `Quickly sent to ${val}`);
                            }
                            e.target.value = '';
                          }}
                          className="h-8 rounded-lg border border-brand-200 bg-brand-50/80 px-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 focus:outline-none dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                          title="Quickly send number to Trial, Renewal, Denied, or Admin Pool"
                        >
                          <option value="" disabled>🚀 Send To...</option>
                          <option value="Sales">💰 Sales Deals</option>
                          <option value="Trial">🌟 Trial Leads</option>
                          <option value="Renewal">🔄 Renewal List</option>
                          <option value="Denied">❌ Denied / Closed</option>
                          <option value="Admin">👑 Admin Pool</option>
                        </select>

                        {isCalled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewHistoryNum(num)}
                            className="h-8 px-2 text-xs text-ink-600"
                            title="View history"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => onLogCall(num)}
                          className="h-8 px-3 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                        >
                          <PhoneCall className="h-3.5 w-3.5" /> Log Call
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* History Modal view */}
      {viewHistoryNum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-2xl">
            <h4 className="text-sm font-bold text-ink-900 dark:text-ink-100">Call History Details</h4>
            <p className="text-xs font-mono font-bold text-brand-600 mt-1">{viewHistoryNum.phone}</p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-ink-100 pb-2 dark:border-ink-800">
                <span className="text-ink-500">Agent:</span>
                <span className="font-bold">{viewHistoryNum.agentName}</span>
              </div>
              <div className="flex justify-between border-b border-ink-100 pb-2 dark:border-ink-800">
                <span className="text-ink-500">Last Status:</span>
                <StatusBadge status={viewHistoryNum.lastCallStatus || 'Connected'} variant="callLog" />
              </div>
              <div className="flex justify-between border-b border-ink-100 pb-2 dark:border-ink-800">
                <span className="text-ink-500">Last Call Time:</span>
                <span className="font-mono">{viewHistoryNum.lastCallTimestamp ? new Date(viewHistoryNum.lastCallTimestamp).toLocaleString() : '—'}</span>
              </div>
              <div className="border-b border-ink-100 pb-2 dark:border-ink-800">
                <span className="text-ink-500 block mb-1">Call Summary Notes:</span>
                <p className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-ink-800 dark:text-ink-200">{viewHistoryNum.lastCallNotes || 'No notes provided.'}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setViewHistoryNum(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
