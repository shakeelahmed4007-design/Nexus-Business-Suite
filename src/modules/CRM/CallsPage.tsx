import { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  UserCheck,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useCallingDataStore } from './CallingData/useCallingDataStore';
import { AllNumbers } from './CallingData/AllNumbers';
import { ActiveCalls } from './CallingData/ActiveCalls';
import { TrialPage } from './CallingData/TrialPage';
import { DeniedPage } from './CallingData/DeniedPage';
import { RenewalPage } from './CallingData/RenewalPage';
import { ImportLeads } from './CallingData/ImportLeads';
import { CallLogModal } from './CallingData/shared/CallLogModal';
import { AllocateModal } from './CallingData/shared/AllocateModal';
import { ImportNumbersModal } from './CallingData/shared/ImportNumbersModal';
import type { CallingNumber } from './CallingData/types';

export type SubTab = 'all' | 'active' | 'trial' | 'denied' | 'renewal' | 'import';

export function CallsPage() {
  const { hasAccess } = useDataAccess('calling_data');
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const userRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  const isSuperAdmin = currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || userRole === 'super_admin';
  const isSalesOrStaff = userRole === 'sales' || userRole === 'staff' || userRole === 'agent';
  const isAdmin = !isSalesOrStaff && (isSuperAdmin || userRole === 'admin' || userRole === 'shop_admin' || currentUserEmail.includes('admin'));

  const store = useCallingDataStore();
  const [activeTab, setActiveTab] = useState<SubTab>('all');

  // If user is sales or staff, permanently lock them to Agent mode with their own identity
  useEffect(() => {
    if (isSalesOrStaff) {
      const matchAgent = store.agents.find(a => a.email.toLowerCase() === currentUserEmail || a.id === user?.id);
      const targetId = matchAgent ? matchAgent.id : (user?.id || 'agent-1');
      store.setRoleMode('Agent', targetId);
    }
  }, [isSalesOrStaff, currentUserEmail, user?.id, store.agents]);

  // Modals state
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedNumForLog, setSelectedNumForLog] = useState<CallingNumber | null>(null);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState<'single' | 'bulk'>('single');

  const handleOpenLogModal = (num: CallingNumber) => {
    setSelectedNumForLog(num);
    setLogModalOpen(true);
  };

  const handleQuickLog = () => {
    const target = store.numbers.find(n => n.status === 'Allocated') || store.numbers[0];
    setSelectedNumForLog(target || null);
    setLogModalOpen(true);
  };

  const navTabs: { id: SubTab; label: string; icon: any; badge?: number }[] = [
    { id: 'all', label: 'All Numbers', icon: Phone, badge: store.numbers.length },
    { id: 'active', label: 'Active Calls', icon: Clock },
    { id: 'trial', label: 'Trial', icon: CheckCircle2, badge: store.leads.filter(l => l.status === 'Trial').length },
    { id: 'denied', label: 'Denied', icon: AlertTriangle, badge: store.leads.filter(l => l.status === 'Denied').length },
    { id: 'renewal', label: 'Renewal', icon: RefreshCw, badge: store.leads.filter(l => l.status === 'Renewal').length },
    { id: 'import', label: 'Import Leads', icon: Upload, badge: store.importedLeads.filter(i => i.status === 'Pending').length },
  ];

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs dark:border-ink-800 dark:bg-ink-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-ink-900 dark:text-ink-50">Calling Data Management System</h1>
            <p className="text-xs text-ink-500">Manage calling pool, log calls, create leads automatically, and track status movement across sales stages.</p>
          </div>
        </div>
        <AccessPendingBanner title="Calling Data Access Required" subtitle="You do not have permission to view or manage Calling Data. Please contact your Super Admin to grant you access." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Main Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs dark:border-ink-800 dark:bg-ink-900">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-ink-900 dark:text-ink-50">Calling Data Management System</h1>
              <p className="text-xs text-ink-500">Manage calling pool, log calls, create leads automatically, and track status movement across sales stages.</p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && store.roleMode === 'Admin' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setUploadModalTab('bulk');
                  setUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
              >
                <Upload className="h-3.5 w-3.5" /> CSV Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadModalTab('single');
                  setUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
              >
                <Phone className="h-3.5 w-3.5" /> Add Number
              </button>
              <button
                type="button"
                onClick={() => setAllocateModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <UserCheck className="h-3.5 w-3.5" /> Allocate Pool
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleQuickLog}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-95 transition-all"
          >
            <PhoneCall className="h-3.5 w-3.5" /> Log Call
          </button>
        </div>
      </div>

      {/* Role Perspective Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/40 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-600 dark:text-ink-300">
          <Shield className="h-4 w-4 text-brand-600" />
          <span>Role View Perspective:</span>
          <span className="rounded-md bg-white px-2 py-0.5 font-bold text-brand-700 shadow-2xs dark:bg-ink-800 dark:text-brand-300">
            {store.roleMode === 'Admin' ? `👑 Admin (${store.numbers.length} Numbers)` : `👤 ${store.currentAgent.name} (${store.numbers.length} Numbers)`}
          </span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <select
              value={store.roleMode === 'Admin' ? 'admin_view' : store.currentAgentId || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'admin_view') {
                  store.setRoleMode('Admin');
                } else {
                  store.setRoleMode('Agent', val);
                }
              }}
              className="rounded-lg border border-brand-200/80 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 shadow-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-brand-500/30 dark:bg-ink-800 dark:text-ink-200"
            >
              <option value="admin_view">👑 Admin View</option>
              {store.agents.length > 0 && (
                <optgroup label="Sales Agents & Staff">
                  {store.agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      👤 {ag.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {store.agents.length === 0 && (
              <span className="text-[11px] text-ink-400 italic px-2">No Sales Agents added yet</span>
            )}
          </div>
        )}
      </div>

      {/* Clean 9 Sub-Tabs Navigation */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-ink-200/60 bg-white p-2 shadow-2xs dark:border-ink-800 dark:bg-ink-900">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
                    }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === 'all' && (
        <AllNumbers store={store} onLogCall={handleOpenLogModal} />
      )}

      {activeTab === 'active' && (
        <ActiveCalls store={store} onLogCall={handleOpenLogModal} />
      )}

      {activeTab === 'trial' && (
        <TrialPage store={store} />
      )}

      {activeTab === 'denied' && (
        <DeniedPage store={store} />
      )}

      {activeTab === 'renewal' && (
        <RenewalPage store={store} onLogCall={handleOpenLogModal} />
      )}

      {activeTab === 'import' && (
        <ImportLeads store={store} />
      )}

      {/* Modals */}
      <CallLogModal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        targetNumber={selectedNumForLog}
        availableNumbers={store.numbers}
        onSubmit={(payload) => {
          store.logCall(payload);
        }}
      />

      <AllocateModal
        open={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        agents={store.agents}
        availableCount={store.allNumbers.filter(n => n.status === 'Available').length || store.allNumbers.length}
        onAllocate={(selectedIds, count) => {
          store.allocateNumbersToAgents(selectedIds, count);
        }}
      />

      <ImportNumbersModal
        open={uploadModalOpen}
        initialTab={uploadModalTab}
        onClose={() => setUploadModalOpen(false)}
        onUpload={(numbersList) => {
          store.uploadNumbers(numbersList);
        }}
      />
    </div>
  );
}
