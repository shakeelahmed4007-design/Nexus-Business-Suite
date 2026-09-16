/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { getAdmins, syncAdminsFromSupabase } from '@/shared/lib/adminStore';
import { useAuth } from '@/shared/context/AuthContext';
import type {
  CallingNumber,
  CallLog,
  LeadFromCall,
  ImportedLead,
  SalesAgent,
  AgentPerformance,
  CallStatus,
  LeadStatus,
  RoleMode,
  DenialReason,
  RenewalContactStatus,
} from './types';

const STORAGE_KEY_NUMBERS = 'nexus_crm_calling_numbers_v2';
const STORAGE_KEY_LOGS = 'nexus_crm_call_logs_v2';
const STORAGE_KEY_LEADS = 'nexus_crm_leads_from_calls_v2';
const STORAGE_KEY_IMPORTED = 'nexus_crm_imported_leads_v2';
const STORAGE_KEY_ROLE = 'nexus_crm_role_mode_v2';
const STORAGE_KEY_CURRENT_AGENT = 'nexus_crm_current_agent_v2';

const DEFAULT_SHOP_UUID = '3c337fc4-48ba-4835-a7b2-93987afe55be';
const DEFAULT_USER_UUID = '01a2e7c8-6a06-4085-9e3f-5fbcd6138a59';

function getSafeUuid(val: any, fallback: string): string {
  if (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return val;
  }
  return fallback;
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

export const DEFAULT_FALLBACK_AGENT: SalesAgent = {
  id: 'admin',
  name: 'Admin / Unassigned',
  email: 'admin@nexus.com',
  role: 'Admin',
  avatarColor: 'bg-brand-600',
};

export const INITIAL_AGENTS: SalesAgent[] = [DEFAULT_FALLBACK_AGENT];

export const DEFAULT_SEED_AGENTS: SalesAgent[] = [
  { id: 'agent-sales-1', name: 'Ali Raza (Sales)', email: 'ali.sales@nexus.com', role: 'Sales Agent', avatarColor: 'bg-indigo-600' },
  { id: 'agent-staff-1', name: 'Sara Khan (Staff)', email: 'sara.staff@nexus.com', role: 'Staff Member', avatarColor: 'bg-emerald-600' },
  { id: 'agent-sales-2', name: 'Usman Malik (Sales)', email: 'usman.sales@nexus.com', role: 'Sales Agent', avatarColor: 'bg-amber-600' },
];

export function getDynamicAgents(currentUserEmail?: string, isSuper?: boolean, hasSharedAccess?: boolean): SalesAgent[] {
  const resultList: SalesAgent[] = [];
  const existingIds = new Set<string>();

  // 1. Add Unassigned Admin Fallback
  resultList.push(DEFAULT_FALLBACK_AGENT);
  existingIds.add(DEFAULT_FALLBACK_AGENT.id);

  try {
    const adminUsers = getAdmins();
    if (Array.isArray(adminUsers) && adminUsers.length > 0) {
      const activeMembers = adminUsers.filter((u) => u.status !== 'Inactive');
      const cleanCurrent = (currentUserEmail || '').toLowerCase().trim();

      activeMembers.forEach((u, idx) => {
        const uId = u.id || `team-member-${idx + 1}`;
        const cleanEmail = (u.email || '').toLowerCase().trim();
        const creatorEmail = (u.created_by_email || '').toLowerCase().trim();

        // Ignore default superadmin fallback duplication
        if (cleanEmail === 'admin@nexus.com' && u.full_name === 'Super Admin') return;

        // Strict isolation: isolated admin only sees agents they created
        if (!isSuper && !hasSharedAccess) {
          if (cleanCurrent && creatorEmail && creatorEmail !== cleanCurrent) {
            return;
          }
          if (cleanCurrent && !creatorEmail && u.created_by_role === 'SUPER_ADMIN') {
            return;
          }
        }

        if (!existingIds.has(uId)) {
          existingIds.add(uId);
          const roleLabel = u.role === 'sales' ? 'Sales' : u.role === 'staff' ? 'Staff' : u.role === 'admin' || u.role === 'shop_admin' ? 'Admin' : 'Team';
          const displayName = u.full_name || (cleanEmail ? cleanEmail.split('@')[0] : `Team Member ${idx + 1}`);

          resultList.push({
            id: uId,
            name: `${displayName} (${roleLabel})`,
            email: u.email || `member${idx + 1}@nexus.com`,
            role: u.role === 'sales' ? 'Sales Agent' : u.role === 'staff' ? 'Staff Member' : u.role === 'admin' || u.role === 'shop_admin' ? 'Admin' : 'Team Member',
            avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          });
        }
      });
    }
  } catch (e) {
    console.warn('Failed to load team members from Team Management store:', e);
  }

  // 2. Only add seed agents for Super Admin or when granted shared access
  if (isSuper || hasSharedAccess) {
    const hasSalesOrStaff = resultList.some(a => a.id !== 'admin');
    if (!hasSalesOrStaff) {
      DEFAULT_SEED_AGENTS.forEach(seed => {
        if (!existingIds.has(seed.id)) {
          resultList.push(seed);
        }
      });
    }
  }

  return resultList;
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { }
}

function generateInitialPool(): CallingNumber[] {
  return [];
}

function generateInitialLeads(): LeadFromCall[] {
  return [];
}

function generateInitialCallLogs(): CallLog[] {
  return [];
}

function generateInitialImportedLeads(): ImportedLead[] {
  return [];
}

export function useCallingDataStore() {
  const { user, profile, shopId: authShopId } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const userRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  const isSuperAdmin = currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || userRole === 'super_admin';
  const isSalesOrStaff = userRole === 'sales' || userRole === 'staff' || userRole === 'agent';

  // Check if this admin has been explicitly granted Super Admin shared data access
  const allAdmins = getAdmins();
  const currentAdminProfile = allAdmins.find(a => (a.email || '').toLowerCase().trim() === currentUserEmail);
  const hasExplicitDataAccess = isSuperAdmin || (currentAdminProfile?.grant_super_admin_data_access === true);

  const activeShopId = getSafeUuid(authShopId || profile?.shop_id, DEFAULT_SHOP_UUID);
  const activeAdminUserId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);

  const [roleMode, setRoleModeState] = useState<RoleMode>(() => getStored<RoleMode>(STORAGE_KEY_ROLE, 'Admin'));
  const [currentAgentId, setCurrentAgentIdState] = useState<string>(() => getStored<string>(STORAGE_KEY_CURRENT_AGENT, 'agent-1'));
  const [agents, setAgents] = useState<SalesAgent[]>(() => getDynamicAgents(currentUserEmail, isSuperAdmin, hasExplicitDataAccess));

  useEffect(() => {
    const handleAdminsChanged = () => {
      setAgents(getDynamicAgents(currentUserEmail, isSuperAdmin, hasExplicitDataAccess));
    };

    // Auto-sync team members from Supabase profiles on store mount
    syncAdminsFromSupabase().then(() => {
      setAgents(getDynamicAgents(currentUserEmail, isSuperAdmin, hasExplicitDataAccess));
    }).catch(() => { });

    window.addEventListener('nexus_admins_changed', handleAdminsChanged);
    window.addEventListener('storage', handleAdminsChanged);
    return () => {
      window.removeEventListener('nexus_admins_changed', handleAdminsChanged);
      window.removeEventListener('storage', handleAdminsChanged);
    };
  }, [currentUserEmail, isSuperAdmin, hasExplicitDataAccess]);

  const [numbers, setNumbers] = useState<CallingNumber[]>(() => {
    const cached = getStored<CallingNumber[]>(STORAGE_KEY_NUMBERS, []);
    return Array.isArray(cached) ? cached.filter(n => n && n.id && !n.id.includes('mock-demo-data')) : [];
  });

  const [callLogs, setCallLogs] = useState<CallLog[]>(() => {
    const cached = getStored<CallLog[]>(STORAGE_KEY_LOGS, []);
    return Array.isArray(cached) ? cached.filter(l => l && l.id && !l.id.includes('mock-demo-data')) : [];
  });

  const [leads, setLeads] = useState<LeadFromCall[]>(() => {
    const cached = getStored<LeadFromCall[]>(STORAGE_KEY_LEADS, []);
    return Array.isArray(cached) ? cached.filter(l => l && l.id && !l.id.includes('mock-demo-data')) : [];
  });

  const [importedLeads, setImportedLeads] = useState<ImportedLead[]>(() => {
    const cached = getStored<ImportedLead[]>(STORAGE_KEY_IMPORTED, []);
    return Array.isArray(cached) ? cached.filter(i => i && i.id && !i.id.includes('mock-demo-data')) : [];
  });

  // Sync state to local storage
  useEffect(() => { setStored(STORAGE_KEY_NUMBERS, numbers); }, [numbers]);
  useEffect(() => { setStored(STORAGE_KEY_LOGS, callLogs); }, [callLogs]);
  useEffect(() => {
    setStored(STORAGE_KEY_LEADS, leads);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_crm_calling_data_changed'));
    }
  }, [leads]);
  useEffect(() => { setStored(STORAGE_KEY_IMPORTED, importedLeads); }, [importedLeads]);
  useEffect(() => { setStored(STORAGE_KEY_ROLE, roleMode); }, [roleMode]);
  useEffect(() => { setStored(STORAGE_KEY_CURRENT_AGENT, currentAgentId); }, [currentAgentId]);

  // Fetch real database records from Supabase tables if present
  const fetchSupabaseData = useCallback(async () => {
    try {
      syncAdminsFromSupabase().then(() => {
        setAgents(getDynamicAgents());
      }).catch(() => { });

      // 1. Fetch Calling Inventory Numbers for current active shop
      const { data: numData, error: numErr } = await supabase
        .from('calling_data_inventory')
        .select('*')
        .eq('shop_id', activeShopId)
        .order('created_at', { ascending: false });

      if (!numErr && Array.isArray(numData) && numData.length > 0) {
        const formattedNums: CallingNumber[] = numData.map((row: any) => ({
          id: row.id,
          phone: row.phone_number,
          source: row.source || 'Manual Entry',
          status: row.status || 'Available',
          adminId: row.admin_user_id || activeAdminUserId,
          shopId: row.shop_id || activeShopId,
          agentId: row.assigned_to_user_id || undefined,
          agentName: row.assigned_to_name || undefined,
          allocatedDate: row.allocated_date || undefined,
          expiryDate: row.expiry_date || undefined,
          allocationStatus: row.allocation_status || 'Active',
          callCount: Number(row.call_count || 0),
          lastCallTimestamp: row.last_call_timestamp || undefined,
          lastCallNotes: row.last_call_notes || undefined,
          lastCallStatus: row.last_call_status || undefined,
          linkedLeadId: row.linked_lead_id || undefined,
          createdAt: row.created_at || new Date().toISOString(),
        }));
        setNumbers((prev) => {
          const map = new Map<string, CallingNumber>();
          prev.forEach((n) => map.set(n.phone, n));
          formattedNums.forEach((n) => {
            const existing = map.get(n.phone);
            map.set(n.phone, existing ? { ...existing, ...n } : n);
          });
          return Array.from(map.values());
        });
      }

      // 2. Fetch Call Logs
      const { data: logData, error: logErr } = await supabase
        .from('call_logs')
        .select('*')
        .eq('shop_id', activeShopId)
        .order('created_at', { ascending: false });

      if (!logErr && Array.isArray(logData) && logData.length > 0) {
        const formattedLogs: CallLog[] = logData.map((row: any) => ({
          id: row.id,
          callingDataId: row.calling_data_inventory_id || row.id,
          phone: row.phone_number || '',
          shopId: row.shop_id || activeShopId,
          agentId: row.agent_user_id || 'agent-1',
          agentName: row.agent_name || 'Agent',
          callStatus: row.call_status || 'Connected',
          duration: Number(row.call_duration_seconds ?? row.duration_seconds ?? 0),
          customerName: row.customer_name || undefined,
          notes: row.call_notes || row.notes || '',
          timestamp: row.call_time || row.created_at || new Date().toISOString(),
        }));
        setCallLogs((prev) => {
          const map = new Map<string, CallLog>();
          prev.forEach((l) => map.set(l.id, l));
          formattedLogs.forEach((l) => map.set(l.id, l));
          return Array.from(map.values());
        });
      }

      // 3. Fetch Leads From Call
      const { data: leadData, error: leadErr } = await supabase
        .from('leads_from_call')
        .select('*')
        .eq('shop_id', activeShopId)
        .order('created_at', { ascending: false });

      if (!leadErr && Array.isArray(leadData) && leadData.length > 0) {
        const formattedLeads: LeadFromCall[] = leadData.map((row: any) => ({
          id: row.id,
          callLogId: row.call_log_id || undefined,
          callingDataId: row.calling_data_inventory_id || undefined,
          phone: row.phone_number || '',
          name: row.customer_name || 'Lead Customer',
          shopId: row.shop_id || activeShopId,
          agentId: row.agent_user_id || 'agent-1',
          agentName: row.agent_name || 'Agent',
          status: row.status || 'New',
          source: row.source || 'Calling Data',
          createdFromCall: row.created_from_call ?? true,
          createdDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          trialPeriod: row.trial_period || undefined,
          trialStartDate: row.trial_start_date ? row.trial_start_date.split('T')[0] : undefined,
          trialRemainingMonths: row.trial_end_date ? Math.max(0, Math.ceil((new Date(row.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))) : undefined,
          saleAmount: row.sale_amount ? Number(row.sale_amount) : undefined,
          saleDate: row.sale_date ? row.sale_date.split('T')[0] : undefined,
          renewalDate: row.renewal_date ? row.renewal_date.split('T')[0] : undefined,
          denialReason: row.denial_reason || undefined,
          denialDate: row.denial_date ? row.denial_date.split('T')[0] : undefined,
          notes: row.notes || undefined,
        }));
        setLeads((prev) => {
          const map = new Map<string, LeadFromCall>();
          prev.forEach((l) => map.set(l.phone || l.id, l));
          formattedLeads.forEach((l) => {
            const existing = map.get(l.phone || l.id);
            map.set(l.phone || l.id, existing ? { ...existing, ...l } : l);
          });
          return Array.from(map.values());
        });
      }

      // 4. Fetch Imported Leads
      const { data: impData, error: impErr } = await supabase
        .from('imported_leads')
        .select('*')
        .eq('shop_id', activeShopId)
        .order('created_at', { ascending: false });

      if (!impErr && Array.isArray(impData) && impData.length > 0) {
        const formattedImp: ImportedLead[] = impData.map((row: any) => ({
          id: row.id,
          name: row.customer_name || '',
          phone: row.phone_number || '',
          email: row.email || '',
          source: row.source || 'Website',
          message: row.message || '',
          importedDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          status: row.status || 'Pending',
          assignedAgentId: row.assigned_to_user_id || undefined,
          assignedAgentName: row.assigned_to_name || undefined,
        }));
        setImportedLeads((prev) => {
          const map = new Map<string, ImportedLead>();
          prev.forEach((i) => map.set(i.id, i));
          formattedImp.forEach((i) => map.set(i.id, i));
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Supabase calling data sync notice:', e);
    }
  }, []);

  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  const setRoleMode = (role: RoleMode, agentId?: string) => {
    setRoleModeState(role);
    if (agentId) setCurrentAgentIdState(agentId);
  };

  const currentAgent = useMemo(() => {
    return agents.find(a => a.id === currentAgentId) || agents[0] || DEFAULT_FALLBACK_AGENT;
  }, [agents, currentAgentId]);

  // Strict isolation filter: Super Admin sees all; Isolated Admin sees ONLY their own records
  const isAccessible = useCallback((recordAdminEmail?: string, recordAdminId?: string, recordShopId?: string) => {
    const cleanRecordEmail = (recordAdminEmail || '').toLowerCase().trim();
    const isSuperRecord = !cleanRecordEmail || cleanRecordEmail === 'admin@nexus.com' || cleanRecordEmail === 'superadmin@nexus.com' || recordAdminId === DEFAULT_USER_UUID;

    if (isSuperAdmin) {
      return true;
    }

    if (hasExplicitDataAccess) {
      return true;
    }

    // Isolated Admin: MUST NOT see Super Admin records
    if (isSuperRecord) {
      return false;
    }

    // Admin sees only records they created
    return cleanRecordEmail === currentUserEmail || (user?.id && recordAdminId === user.id);
  }, [isSuperAdmin, hasExplicitDataAccess, currentUserEmail, user?.id]);

  const scopedNumbers = useMemo(() => {
    return numbers.filter(n => isAccessible(n.adminEmail || (n as any).ownerAdminEmail, n.adminId, n.shopId));
  }, [numbers, isAccessible]);

  const visibleNumbers = useMemo(() => {
    if (isSalesOrStaff) {
      return scopedNumbers.filter(n =>
        n.agentId === currentAgentId ||
        n.agentId === user?.id ||
        (n.agentName && user?.user_metadata?.full_name && n.agentName.toLowerCase().includes(user.user_metadata.full_name.toLowerCase()))
      );
    }
    if (roleMode === 'Admin') return scopedNumbers;
    return scopedNumbers.filter(n => n.agentId === currentAgentId);
  }, [scopedNumbers, roleMode, currentAgentId, isSalesOrStaff, user?.id, user?.user_metadata?.full_name]);

  const scopedLeads = useMemo(() => {
    return leads.filter(l => isAccessible((l as any).adminEmail || (l as any).ownerAdminEmail, l.agentId, l.shopId));
  }, [leads, isAccessible]);

  const visibleLeads = useMemo(() => {
    if (isSalesOrStaff) {
      return scopedLeads.filter(l =>
        l.agentId === currentAgentId ||
        l.agentId === user?.id ||
        (l.agentName && user?.user_metadata?.full_name && l.agentName.toLowerCase().includes(user.user_metadata.full_name.toLowerCase()))
      );
    }
    if (roleMode === 'Admin') return scopedLeads;
    return scopedLeads.filter(l => l.agentId === currentAgentId);
  }, [scopedLeads, roleMode, currentAgentId, isSalesOrStaff, user?.id, user?.user_metadata?.full_name]);

  const scopedCallLogs = useMemo(() => {
    return callLogs.filter(cl => isAccessible((cl as any).adminEmail || (cl as any).ownerAdminEmail, cl.agentId, cl.shopId));
  }, [callLogs, isAccessible]);

  const visibleCallLogs = useMemo(() => {
    if (isSalesOrStaff) {
      return scopedCallLogs.filter(cl =>
        cl.agentId === currentAgentId ||
        cl.agentId === user?.id ||
        (cl.agentName && user?.user_metadata?.full_name && cl.agentName.toLowerCase().includes(user.user_metadata.full_name.toLowerCase()))
      );
    }
    if (roleMode === 'Admin') return scopedCallLogs;
    return scopedCallLogs.filter(cl => cl.agentId === currentAgentId);
  }, [scopedCallLogs, roleMode, currentAgentId, isSalesOrStaff, user?.id, user?.user_metadata?.full_name]);

  const scopedImportedLeads = useMemo(() => {
    return importedLeads.filter(il => isAccessible((il as any).adminEmail || (il as any).ownerAdminEmail, il.assignedAgentId, (il as any).shopId));
  }, [importedLeads, isAccessible]);

  const visibleImportedLeads = useMemo(() => {
    if (isSalesOrStaff) {
      return scopedImportedLeads.filter(il =>
        il.assignedAgentId === currentAgentId ||
        il.assignedAgentId === user?.id ||
        (il.assignedAgentName && user?.user_metadata?.full_name && il.assignedAgentName.toLowerCase().includes(user.user_metadata.full_name.toLowerCase()))
      );
    }
    if (roleMode === 'Admin') return scopedImportedLeads;
    return scopedImportedLeads.filter(il => il.assignedAgentId === currentAgentId);
  }, [scopedImportedLeads, roleMode, currentAgentId, isSalesOrStaff, user?.id, user?.user_metadata?.full_name]);

  // Performance calculation
  const agentPerformances: AgentPerformance[] = useMemo(() => {
    return agents.map(ag => {
      const agNums = scopedNumbers.filter(n => n.agentId === ag.id);
      const agLeads = scopedLeads.filter(l => l.agentId === ag.id);
      const agLogs = scopedCallLogs.filter(cl => cl.agentId === ag.id);

      return {
        agentId: ag.id,
        agentName: ag.name,
        allocated: agNums.length,
        callsMade: agLogs.length || agNums.filter(n => n.status === 'Used').length,
        sales: agLeads.filter(l => l.status === 'Sales').length,
        trial: agLeads.filter(l => l.status === 'Trial').length,
        denied: agLeads.filter(l => l.status === 'Denied').length,
        renewal: agLeads.filter(l => l.status === 'Renewal').length,
      };
    });
  }, [agents, scopedNumbers, scopedLeads, scopedCallLogs]);

  // Workflow Action 1: Upload Numbers CSV (Admin)
  const uploadNumbers = useCallback((rawNumbers: string[], sourceName: string = 'CSV Import') => {
    const now = new Date();
    const newItems: CallingNumber[] = rawNumbers.map((phone) => ({
      id: crypto.randomUUID(),
      phone: phone.trim(),
      source: 'CSV Upload' as any,
      status: 'Available',
      adminId: user?.id || activeAdminUserId,
      adminEmail: currentUserEmail,
      ownerAdminEmail: currentUserEmail,
      shopId: activeShopId,
      callCount: 0,
      createdAt: now.toISOString(),
    }));

    setNumbers(prev => [...newItems, ...prev]);

    try {
      const rows = newItems.map((n) => ({
        id: n.id,
        shop_id: activeShopId,
        admin_user_id: activeAdminUserId,
        phone_number: n.phone,
        source: 'CSV Import',
        data_type: 'Raw Data',
        status: 'Available',
      }));
      supabase.from('calling_data_inventory').insert(rows).then(({ error }) => {
        if (error) console.error('Supabase uploadNumbers error:', error.message, error);
      });
    } catch (e) {
      console.error('Supabase uploadNumbers catch:', e);
    }

    return newItems.length;
  }, [activeAdminUserId, activeShopId]);

  // Workflow Action 2: Allocate available or unallocated pool numbers to selected agents
  const allocateNumbersToAgents = useCallback((targetAgentIds: string[], countPerAgent: number = 250) => {
    const now = new Date();
    const allocatedDate = now.toISOString().split('T')[0];
    const expiryDate = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const allocatedIds: string[] = [];
    const allocatedPhones: string[] = [];

    setNumbers(prev => {
      const copy = [...prev];
      let pool = copy.filter(n => isAccessible(n.adminEmail || (n as any).ownerAdminEmail, n.adminId, n.shopId) && n.status === 'Available');
      if (pool.length === 0) {
        pool = copy.filter(n => isAccessible(n.adminEmail || (n as any).ownerAdminEmail, n.adminId, n.shopId));
      }

      let poolIdx = 0;
      const activeAgentsList = agents.length > 0 ? agents : getDynamicAgents(currentUserEmail, isSuperAdmin, hasExplicitDataAccess);
      targetAgentIds.forEach(agId => {
        const ag = activeAgentsList.find(a => a.id === agId) || getDynamicAgents(currentUserEmail, isSuperAdmin, hasExplicitDataAccess).find(a => a.id === agId);
        if (!ag) return;

        for (let c = 0; c < countPerAgent && poolIdx < pool.length; c++) {
          const item = pool[poolIdx++];
          item.status = 'Allocated';
          item.agentId = ag.id;
          item.agentName = ag.name;
          item.allocatedDate = allocatedDate;
          item.expiryDate = expiryDate;
          item.allocationStatus = 'Active';
          if (item.id && item.id.length === 36 && item.id.includes('-')) {
            allocatedIds.push(item.id);
          } else {
            allocatedPhones.push(item.phone);
          }
        }
      });

      return copy;
    });

    try {
      if (allocatedIds.length > 0) {
        supabase.from('calling_data_inventory')
          .update({ status: 'Allocated', updated_at: new Date().toISOString() })
          .in('id', allocatedIds)
          .then(({ error }) => {
            if (error) console.error('Supabase allocate error:', error.message, error);
          });
      }
      if (allocatedPhones.length > 0) {
        supabase.from('calling_data_inventory')
          .update({ status: 'Allocated', updated_at: new Date().toISOString() })
          .in('phone_number', allocatedPhones)
          .then(({ error }) => {
            if (error) console.error('Supabase allocate error by phone:', error.message, error);
          });
      }
    } catch (e) {
      console.error('Supabase allocate catch:', e);
    }
  }, []);

  // Workflow Action 3: Log Call (Agent makes call & logs status)
  const logCall = useCallback((payload: {
    callingNumberId: string;
    duration: number; // in seconds
    callStatus: CallStatus;
    customerName?: string;
    notes: string;
    nextCallbackDate?: string;
    trialPeriod?: string;
    saleAmount?: number;
    denialReason?: DenialReason;
  }) => {
    const targetNum = numbers.find(n => n.id === payload.callingNumberId);
    if (!targetNum) return;

    const activeAgentId = targetNum.agentId || currentAgentId || DEFAULT_FALLBACK_AGENT.id;
    const activeAgentName = targetNum.agentName || currentAgent?.name || DEFAULT_FALLBACK_AGENT.name;
    const timestamp = new Date().toISOString();

    // 1. Create CallLog entry
    const newLog: CallLog = {
      id: `log-${Date.now()}`,
      callingDataId: targetNum.id,
      phone: targetNum.phone,
      agentId: activeAgentId,
      agentName: activeAgentName,
      adminId: targetNum.adminId || user?.id,
      adminEmail: targetNum.adminEmail || currentUserEmail,
      ownerAdminEmail: targetNum.adminEmail || currentUserEmail,
      callStatus: payload.callStatus,
      duration: payload.duration,
      customerName: payload.customerName,
      notes: payload.notes,
      nextCallbackDate: payload.nextCallbackDate,
      timestamp,
    };

    // 2. Map Call Status -> Lead Status
    let newLeadStatus: LeadStatus = 'New';
    if (payload.callStatus === 'Closed Sale') {
      newLeadStatus = 'Sales';
    } else if (payload.callStatus === 'Interested') {
      newLeadStatus = 'Trial';
    } else if (payload.callStatus === 'Connected' && (payload.saleAmount || payload.notes.toLowerCase().includes('sale'))) {
      newLeadStatus = 'Sales';
    } else if (payload.callStatus === 'Not Interested' || payload.callStatus === 'Invalid') {
      newLeadStatus = 'Denied';
    } else if (payload.callStatus === 'Callback Later') {
      newLeadStatus = 'Lead';
    } else if (payload.callStatus === 'Escalate to Admin') {
      newLeadStatus = 'New';
    } else if (payload.callStatus === 'Connected') {
      newLeadStatus = 'New';
    }

    // 3. Create or update LeadFromCall
    const leadId = targetNum.linkedLeadId || `lead-${Date.now()}`;
    const name = payload.customerName || `Customer (${targetNum.phone.slice(-4)})`;

    const newLead: LeadFromCall = {
      id: leadId,
      callLogId: newLog.id,
      callingDataId: targetNum.id,
      phone: targetNum.phone,
      name,
      agentId: activeAgentId,
      agentName: activeAgentName,
      adminId: targetNum.adminId || user?.id,
      adminEmail: targetNum.adminEmail || currentUserEmail,
      ownerAdminEmail: targetNum.adminEmail || currentUserEmail,
      status: newLeadStatus,
      source: 'Calling Data',
      createdFromCall: true,
      createdDate: new Date().toISOString().split('T')[0],
      trialPeriod: payload.trialPeriod || '12 months',
      trialStartDate: newLeadStatus === 'Trial' ? new Date().toISOString().split('T')[0] : undefined,
      trialRemainingMonths: newLeadStatus === 'Trial' ? 12 : undefined,
      saleAmount: payload.saleAmount || (newLeadStatus === 'Sales' ? 50000 : undefined),
      saleDate: newLeadStatus === 'Sales' ? new Date().toISOString().split('T')[0] : undefined,
      renewalDate: newLeadStatus === 'Sales' ? new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0] : undefined,
      denialReason: payload.denialReason || (newLeadStatus === 'Denied' ? 'Not Interested' : undefined),
      denialDate: newLeadStatus === 'Denied' ? new Date().toISOString().split('T')[0] : undefined,
      notes: payload.notes,
    };

    setCallLogs(prev => [newLog, ...prev]);

    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === leadId || l.phone === targetNum.phone);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newLead };
        return copy;
      }
      return [newLead, ...prev];
    });

    // 4. Update Number record
    const isEscalatedToAdmin = payload.callStatus === 'Escalate to Admin';
    setNumbers(prev =>
      prev.map(n => {
        if (n.id === targetNum.id) {
          return {
            ...n,
            status: isEscalatedToAdmin ? 'Available' : 'Used',
            agentId: isEscalatedToAdmin ? undefined : n.agentId,
            agentName: isEscalatedToAdmin ? undefined : n.agentName,
            allocationStatus: isEscalatedToAdmin ? 'Returned' : n.allocationStatus,
            callCount: n.callCount + 1,
            lastCallTimestamp: timestamp,
            lastCallStatus: payload.callStatus,
            lastCallNotes: payload.notes,
            linkedLeadId: leadId,
          };
        }
        return n;
      })
    );

    // 5. Supabase Real DB Persistence with valid shop_id & admin_user_id UUIDs
    try {
      const isUuid = targetNum.id && targetNum.id.length === 36 && targetNum.id.includes('-');
      const inventoryId = isUuid ? targetNum.id : null;
      const callLogUuid = crypto.randomUUID();

      const invQuery = isUuid
        ? supabase.from('calling_data_inventory').update({ status: isEscalatedToAdmin ? 'Available' : 'Used', updated_at: new Date().toISOString() }).eq('id', targetNum.id)
        : supabase.from('calling_data_inventory').update({ status: isEscalatedToAdmin ? 'Available' : 'Used', updated_at: new Date().toISOString() }).eq('phone_number', targetNum.phone);

      invQuery.then(({ error }) => {
        if (error) console.error('Supabase inventory status update error:', error.message, error);
      });

      supabase.from('call_logs').insert({
        id: callLogUuid,
        shop_id: activeShopId,
        calling_data_inventory_id: inventoryId,
        agent_user_id: activeAdminUserId,
        phone_number: targetNum.phone,
        customer_name: name,
        call_status: payload.callStatus,
        call_duration_seconds: payload.duration,
        call_notes: payload.notes,
      }).then(({ error }) => {
        if (error) console.error('Supabase call_logs insert error:', error.message, error);
      });

      supabase.from('leads_from_call').insert({
        shop_id: activeShopId,
        call_log_id: callLogUuid,
        calling_data_inventory_id: inventoryId,
        agent_user_id: activeAdminUserId,
        phone_number: targetNum.phone,
        customer_name: name,
        status: newLeadStatus,
        source: 'Calling Data',
        notes: payload.notes,
        trial_period: payload.trialPeriod || null,
        sale_amount: payload.saleAmount || (newLeadStatus === 'Sales' ? 50000 : null),
        sale_date: newLeadStatus === 'Sales' ? new Date().toISOString() : null,
        denial_reason: payload.denialReason || null,
      }).then(({ error }) => {
        if (error) console.error('Supabase leads_from_call insert error:', error.message, error);
      });

      supabase.from('leads').insert({
        shop_id: activeShopId,
        created_by_id: activeAdminUserId,
        first_name: name.split(' ')[0] || 'Calling',
        last_name: name.split(' ').slice(1).join(' ') || 'Lead',
        phone: targetNum.phone,
        lead_source: 'Cold Call',
        lead_status: newLeadStatus === 'Trial' ? 'Qualified' : newLeadStatus === 'Sales' ? 'Won' : newLeadStatus === 'Denied' ? 'Lost' : 'New',
        lead_value: payload.saleAmount || 50000,
        notes: payload.notes,
      }).then(({ error }) => {
        if (error) console.error('Supabase leads insert error:', error.message, error);
      });

      if (newLeadStatus === 'Sales' || newLeadStatus === 'Renewal') {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Sales';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        supabase.from('customers').insert({
          shop_id: activeShopId,
          created_by_id: activeAdminUserId,
          first_name: firstName,
          last_name: lastName,
          phone: targetNum.phone,
          company_name: payload.notes ? payload.notes.slice(0, 35) : 'Calling Data Sales Lead',
          customer_type: newLeadStatus === 'Renewal' ? 'Subscription' : 'Regular',
          total_orders: 1,
          total_order_value: payload.saleAmount || 50000,
        }).then(({ error }) => {
          if (error) console.error('Supabase customers insert error:', error.message, error);
        });
      }
    } catch (e) {
      console.error('Supabase logCall error:', e);
    }
  }, [numbers, currentAgentId, currentAgent?.name, activeShopId, activeAdminUserId]);

  // Workflow Action 4: Move lead status directly from pages & sync number status
  const updateLeadStatus = useCallback((leadId: string, newStatus: LeadStatus, extraData?: Partial<LeadFromCall>) => {
    let targetPhone: string | undefined = undefined;

    setLeads(prev =>
      prev.map(l => {
        if (l.id === leadId) {
          targetPhone = l.phone;
          const updated: LeadFromCall = {
            ...l,
            status: newStatus,
            ...extraData,
          };
          if (newStatus === 'Sales' && !updated.saleDate) {
            updated.saleDate = new Date().toISOString().split('T')[0];
            updated.saleAmount = updated.saleAmount || 50000;
            updated.renewalDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
          } else if (newStatus === 'Denied' && !updated.denialDate) {
            updated.denialDate = new Date().toISOString().split('T')[0];
            updated.denialReason = updated.denialReason || 'Budget';
          }
          return updated;
        }
        return l;
      })
    );

    // Sync CallingNumber lastCallStatus
    if (targetPhone) {
      let mappedCallStatus: CallStatus = 'Connected';
      if (newStatus === 'Trial') mappedCallStatus = 'Interested';
      else if (newStatus === 'Sales') mappedCallStatus = 'Connected';
      else if (newStatus === 'Denied') mappedCallStatus = 'Not Interested';

      setNumbers(prev =>
        prev.map(n => (n.phone === targetPhone ? { ...n, lastCallStatus: mappedCallStatus } : n))
      );

      try {
        supabase.from('leads_from_call').update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        }).eq('phone_number', targetPhone).then(({ error }) => {
          if (error) console.error('Supabase update leads_from_call error:', error.message, error);
        });

        supabase.from('leads').update({
          lead_status: newStatus === 'Trial' ? 'Qualified' : newStatus === 'Sales' ? 'Won' : newStatus === 'Denied' ? 'Lost' : 'New',
          updated_at: new Date().toISOString(),
        }).eq('phone', targetPhone).then(({ error }) => {
          if (error) console.error('Supabase update leads error:', error.message, error);
        });
      } catch { }
    }
  }, []);

  // Workflow Action 5: Assign External Lead (Website/Facebook) to Agent
  const assignImportedLead = useCallback((importedLeadId: string, targetAgentId: string) => {
    const targetImp = importedLeads.find(i => i.id === importedLeadId);
    if (!targetImp) return;

    const availableAgents = agents.length > 0 ? agents : getDynamicAgents();
    const ag = availableAgents.find(a => a.id === targetAgentId) || availableAgents[0];

    // 1. Mark imported lead assigned
    setImportedLeads(prev =>
      prev.map(i => (i.id === importedLeadId ? { ...i, status: 'Assigned', assignedAgentId: ag.id, assignedAgentName: ag.name } : i))
    );

    // 2. Create LeadFromCall with source Website/Facebook
    const newLead: LeadFromCall = {
      id: `lead-imp-${Date.now()}`,
      phone: targetImp.phone,
      name: targetImp.name,
      agentId: ag.id,
      agentName: ag.name,
      status: 'New',
      source: targetImp.source as any,
      createdFromCall: false,
      createdDate: new Date().toISOString().split('T')[0],
      notes: targetImp.message,
    };

    setLeads(prev => [newLead, ...prev]);
  }, [importedLeads, agents]);

  // Workflow Action 6: Auto assign pending imported leads round-robin
  const autoAssignImportedLeads = useCallback(() => {
    const pending = importedLeads.filter(i => i.status === 'Pending');
    if (pending.length === 0) return;

    const availableAgents = agents.length > 0 ? agents : getDynamicAgents();
    pending.forEach((imp, idx) => {
      const assignedAg = availableAgents[idx % availableAgents.length];
      assignImportedLead(imp.id, assignedAg.id);
    });
  }, [importedLeads, assignImportedLead, agents]);

  // Workflow Action 7: Return allocated calling number back to Admin Pool
  const returnToAdminPool = useCallback((callingNumberId: string, reason: string = 'Returned to Admin Pool') => {
    const num = numbers.find(n => n.id === callingNumberId);
    if (!num) return;

    setNumbers(prev =>
      prev.map(n => {
        if (n.id === callingNumberId) {
          return {
            ...n,
            status: 'Available',
            agentId: undefined,
            agentName: undefined,
            allocationStatus: 'Returned',
            lastCallNotes: `Returned to Admin Pool: ${reason}`,
            lastCallStatus: 'Escalate to Admin',
          };
        }
        return n;
      })
    );

    try {
      const isUuid = num.id && num.id.length === 36 && num.id.includes('-');
      const query = isUuid
        ? supabase.from('calling_data_inventory').update({ status: 'Available', updated_at: new Date().toISOString() }).eq('id', num.id)
        : supabase.from('calling_data_inventory').update({ status: 'Available', updated_at: new Date().toISOString() }).eq('phone_number', num.phone);

      query.then(({ error }) => {
        if (error) console.error('Supabase returnToAdminPool error:', error.message, error);
      });
    } catch (e) {
      console.error('Supabase returnToAdminPool catch:', e);
    }
  }, [numbers]);

  // Workflow Action 8: Reassign a single number to a specific agent
  const reassignNumberToAgent = useCallback((callingNumberId: string, targetAgentId: string) => {
    const availableAgents = agents.length > 0 ? agents : getDynamicAgents();
    const targetAgent = availableAgents.find(a => a.id === targetAgentId) || getDynamicAgents().find(a => a.id === targetAgentId);
    if (!targetAgent) return;

    const targetNum = numbers.find(n => n.id === callingNumberId);

    setNumbers(prev =>
      prev.map(n => {
        if (n.id === callingNumberId) {
          return {
            ...n,
            status: 'Allocated',
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            allocationStatus: 'Active',
            allocatedDate: new Date().toISOString().split('T')[0],
          };
        }
        return n;
      })
    );

    try {
      if (targetNum) {
        const isUuid = targetNum.id && targetNum.id.length === 36 && targetNum.id.includes('-');
        const query = isUuid
          ? supabase.from('calling_data_inventory').update({ status: 'Allocated', updated_at: new Date().toISOString() }).eq('id', targetNum.id)
          : supabase.from('calling_data_inventory').update({ status: 'Allocated', updated_at: new Date().toISOString() }).eq('phone_number', targetNum.phone);

        query.then(({ error }) => {
          if (error) console.error('Supabase reassignNumberToAgent error:', error.message, error);
        });
      }
    } catch (e) {
      console.error('Supabase reassign error:', e);
    }
  }, [numbers, agents]);

  // Workflow Action 9: Quick Convert Number to Target (Lead, Trial, Sales, Renewal, Denied, Admin)
  const convertNumberToTarget = useCallback((
    callingNumberId: string,
    target: 'Lead' | 'Trial' | 'Sales' | 'Denied' | 'Renewal' | 'Admin',
    customerName?: string,
    amount?: number,
    notes?: string
  ) => {
    if (target === 'Admin') {
      returnToAdminPool(callingNumberId, notes || 'Sent to Admin Pool via quick action');
      return;
    }

    let mappedCallStatus: CallStatus = 'Connected';
    if (target === 'Sales') mappedCallStatus = 'Closed Sale';
    else if (target === 'Trial') mappedCallStatus = 'Interested';
    else if (target === 'Lead') mappedCallStatus = 'Callback Later';
    else if (target === 'Denied') mappedCallStatus = 'Not Interested';
    else if (target === 'Renewal') mappedCallStatus = 'Closed Sale';

    const num = numbers.find(n => n.id === callingNumberId);
    logCall({
      callingNumberId,
      duration: 60,
      callStatus: mappedCallStatus,
      customerName: customerName || (num ? `Customer (${num.phone.slice(-4)})` : 'Customer'),
      saleAmount: target === 'Sales' ? (amount || 50000) : undefined,
      notes: notes || `Directly converted to ${target}`,
    });
  }, [numbers, returnToAdminPool, logCall]);

  // Workflow Action 10: Directly Convert calling number to closed sale
  const convertToSale = useCallback((callingNumberId: string, customerName: string, amount: number = 50000, notes: string = 'Direct Sale Converted') => {
    logCall({
      callingNumberId,
      duration: 120,
      callStatus: 'Closed Sale',
      customerName,
      saleAmount: amount,
      notes,
    });
  }, [logCall]);

  // Workflow Action 11: Reset Calling System Data to Fresh Clean State
  const resetToDefaultData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_NUMBERS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_LEADS);
    localStorage.removeItem(STORAGE_KEY_IMPORTED);

    setNumbers([]);
    setLeads([]);
    setCallLogs([]);
    setImportedLeads([]);
  }, []);

  return {
    roleMode,
    currentAgentId,
    currentAgent,
    setRoleMode,

    numbers: visibleNumbers,
    allNumbers: scopedNumbers,
    leads: visibleLeads,
    allLeads: scopedLeads,
    callLogs: visibleCallLogs,
    importedLeads: visibleImportedLeads,
    allImportedLeads: scopedImportedLeads,
    agentPerformances,
    agents: agents,

    uploadNumbers,
    allocateNumbersToAgents,
    reassignNumberToAgent,
    convertNumberToTarget,
    logCall,
    returnToAdminPool,
    convertToSale,
    updateLeadStatus,
    assignImportedLead,
    autoAssignImportedLeads,
    resetToDefaultData,
  };
}
