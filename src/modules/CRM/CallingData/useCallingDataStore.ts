/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { getAdmins, syncAdminsFromSupabase, getCrudFlags } from '@/shared/lib/adminStore';
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

        const creatorRole = (u.created_by_role || '').toUpperCase();

        // Strict isolation:
        if (isSuper) {
          // Super Admin must NOT see staff/sales created by regular Admins!
          if (creatorRole === 'ADMIN' || creatorRole === 'SHOP_ADMIN') return;
          if (creatorEmail && creatorEmail !== 'admin@nexus.com' && creatorEmail !== 'superadmin@nexus.com') {
            return;
          }
        } else if (!hasSharedAccess) {
          // Block if the agent was not created by this admin AND the agent is not the admin themselves
          if (creatorEmail !== cleanCurrent && cleanEmail !== cleanCurrent) {
            return;
          }
        }

        if (u.role !== 'sales') return;

        if (!existingIds.has(uId)) {
          existingIds.add(uId);
          const roleLabel = 'Sales';
          const displayName = u.full_name || (cleanEmail ? cleanEmail.split('@')[0] : `Team Member ${idx + 1}`);

          resultList.push({
            id: uId,
            name: `${displayName} (${roleLabel})`,
            email: u.email || `member${idx + 1}@nexus.com`,
            role: 'Sales Agent',
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
    const hasSales = resultList.length > 0;
    if (!hasSales) {
      DEFAULT_SEED_AGENTS.filter(a => a.role === 'Sales Agent').forEach(seed => {
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

  const allAdmins = getAdmins();
  const currentAdminProfile = allAdmins.find(a => (a.email || '').toLowerCase().trim() === currentUserEmail);
  const adminPerms = currentAdminProfile?.permissions;

  const isSuperAdmin = currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || userRole === 'super_admin';
  const hasDeleteAccess = getCrudFlags(adminPerms, 'calling_data').can_delete;

  const isSalesAgent = userRole === 'sales' || userRole === 'agent';
  // Treat them as a pure agent if they are in sales/agent/staff role without super admin
  const isPureAgent = isSalesAgent && !isSuperAdmin;
  const isSalesOrStaff = (userRole === 'sales' || userRole === 'staff' || userRole === 'agent') && !isSuperAdmin;

  // Check if this admin has been explicitly granted Super Admin shared data access
  const { access: hasCallingDataAccess } = getCrudFlags(adminPerms, 'calling_data');
  const hasExplicitDataAccess = isSuperAdmin || ((currentAdminProfile as any)?.grant_super_admin_data_access === true) || hasCallingDataAccess;
  const hasSharedAgentsAccess = isSuperAdmin || ((currentAdminProfile as any)?.grant_super_admin_data_access === true);

  const activeShopId = getSafeUuid(authShopId || profile?.shop_id, DEFAULT_SHOP_UUID);
  const activeAdminUserId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);

  const [roleMode, setRoleModeState] = useState<RoleMode>(() => {
    if (isSalesOrStaff) return 'Agent';
    return getStored<RoleMode>(STORAGE_KEY_ROLE, 'Admin');
  });
  const [currentAgentId, setCurrentAgentIdState] = useState<string>(() => getStored<string>(STORAGE_KEY_CURRENT_AGENT, 'agent-1'));
  const [agents, setAgents] = useState<SalesAgent[]>(() => getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess));

  useEffect(() => {
    const handleAdminsChanged = () => {
      setAgents(getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess));
    };

    // Auto-sync team members from Supabase profiles on store mount
    syncAdminsFromSupabase().then(() => {
      setAgents(getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess));
    }).catch(() => { });

    window.addEventListener('nexus_admins_changed', handleAdminsChanged);
    window.addEventListener('storage', handleAdminsChanged);
    return () => {
      window.removeEventListener('nexus_admins_changed', handleAdminsChanged);
      window.removeEventListener('storage', handleAdminsChanged);
    };
  }, [currentUserEmail, isSuperAdmin, hasSharedAgentsAccess]);

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

  // Sync state to local storage safely
  useEffect(() => { if (numbers.length > 0) setStored(STORAGE_KEY_NUMBERS, numbers); }, [numbers]);
  useEffect(() => { if (callLogs.length > 0) setStored(STORAGE_KEY_LOGS, callLogs); }, [callLogs]);
  useEffect(() => {
    if (leads.length > 0) {
      setStored(STORAGE_KEY_LEADS, leads);
    }
  }, [leads]);
  useEffect(() => { if (importedLeads.length > 0) setStored(STORAGE_KEY_IMPORTED, importedLeads); }, [importedLeads]);
  useEffect(() => { setStored(STORAGE_KEY_ROLE, roleMode); }, [roleMode]);
  useEffect(() => { setStored(STORAGE_KEY_CURRENT_AGENT, currentAgentId); }, [currentAgentId]);

  // Fetch real database records from Supabase tables if present
  const fetchSupabaseData = useCallback(async () => {
    try {
      // 1. Fetch Calling Inventory Numbers for current active shop
      let numDataRes = await supabase
        .from('calling_data_inventory')
        .select('*')
        .eq('shop_id', activeShopId)
        .order('created_at', { ascending: false });

      if (numDataRes.error || !numDataRes.data || numDataRes.data.length === 0) {
        const fallbackRes = await supabase
          .from('calling_data_inventory')
          .select('*')
          .order('created_at', { ascending: false });
        if (Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
          numDataRes = fallbackRes;
        }
      }

      const numData = numDataRes.data;
      const numErr = numDataRes.error;

      if (!numErr && Array.isArray(numData) && numData.length > 0) {
        const formattedNums: CallingNumber[] = numData.map((row: any) => {
          let metaAgentId = row.assigned_to_user_id || undefined;
          let metaAgentName = row.assigned_to_name || undefined;
          let metaAgentEmail = row.assigned_to_email || undefined;
          let metaAllocatedDate = row.allocated_date || undefined;
          let metaExpiryDate = row.expiry_date || undefined;
          let metaUserNotes = row.notes || undefined;

          if (row.notes && typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(row.notes);
              if (parsed && typeof parsed === 'object') {
                if (parsed.agentId) metaAgentId = parsed.agentId;
                if (parsed.agentName) metaAgentName = parsed.agentName;
                if (parsed.agentEmail) metaAgentEmail = parsed.agentEmail;
                if (parsed.allocatedDate) metaAllocatedDate = parsed.allocatedDate;
                if (parsed.expiryDate) metaExpiryDate = parsed.expiryDate;
                if (parsed.userNotes !== undefined) metaUserNotes = parsed.userNotes;
              }
            } catch (e) { }
          }

          // Resolve agent email if missing from notes
          if (!metaAgentEmail) {
            if (metaAgentId) {
              const matchedAg = agents.find(a => a.id === metaAgentId) || allAdmins.find(a => a.id === metaAgentId);
              if (matchedAg?.email) metaAgentEmail = matchedAg.email;
            }
            if (!metaAgentEmail && metaAgentName) {
              const cleanTargetName = metaAgentName.toLowerCase().replace(/\s*\((sales|staff|agent)\)\s*/gi, '').trim();
              const matchedAg = agents.find(a => a.name.toLowerCase().replace(/\s*\((sales|staff|agent)\)\s*/gi, '').trim() === cleanTargetName) ||
                allAdmins.find(a => (a.full_name || '').toLowerCase().trim() === cleanTargetName);
              if (matchedAg?.email) metaAgentEmail = matchedAg.email;
            }
          }

          const isCreatedByCurrent = Boolean(
            (row.admin_user_id && (
              row.admin_user_id === activeAdminUserId ||
              row.admin_user_id === user?.id ||
              row.admin_user_id === profile?.id
            ))
          );
          let resolvedAdminEmail: string | undefined = isCreatedByCurrent ? currentUserEmail : undefined;
          if (!resolvedAdminEmail && row.admin_user_id) {
            const matchedAdmin = allAdmins.find(a => a.id === row.admin_user_id);
            if (matchedAdmin?.email) resolvedAdminEmail = matchedAdmin.email;
          }

          const hasAgent = Boolean(metaAgentId || metaAgentName || metaAgentEmail);
          return {
            id: row.id,
            phone: row.phone_number,
            source: row.source || 'Manual Entry',
            status: hasAgent ? 'Allocated' : (row.status || 'Available'),
            adminId: row.admin_user_id || (isCreatedByCurrent ? activeAdminUserId : DEFAULT_USER_UUID),
            adminEmail: resolvedAdminEmail,
            ownerAdminEmail: resolvedAdminEmail,
            shopId: row.shop_id || activeShopId,
            agentId: metaAgentId,
            agentName: metaAgentName,
            agentEmail: metaAgentEmail,
            allocatedDate: metaAllocatedDate,
            expiryDate: metaExpiryDate,
            allocationStatus: row.allocation_status || (hasAgent ? 'Active' : 'Unallocated'),
            callCount: Number(row.call_count || 0),
            lastCallTimestamp: row.last_call_timestamp || undefined,
            lastCallNotes: metaUserNotes,
            lastCallStatus: row.last_call_status || undefined,
            linkedLeadId: row.linked_lead_id || undefined,
            createdAt: row.created_at || new Date().toISOString(),
          };
        });

        setNumbers((prev) => {
          const map = new Map<string, CallingNumber>();
          prev.forEach((n) => map.set(n.phone, n));
          formattedNums.forEach((n) => {
            const existing = map.get(n.phone);
            if (existing) {
              const finalAgentId = n.agentId || existing.agentId;
              const finalAgentName = n.agentName || existing.agentName;
              const finalAgentEmail = n.agentEmail || existing.agentEmail;
              const isAllocated = Boolean(finalAgentId) || existing.status === 'Allocated' || n.status === 'Allocated';
              map.set(n.phone, {
                ...existing,
                ...n,
                agentId: finalAgentId,
                agentName: finalAgentName,
                agentEmail: finalAgentEmail,
                allocatedDate: finalAgentId ? (n.allocatedDate || existing.allocatedDate) : undefined,
                expiryDate: finalAgentId ? (n.expiryDate || existing.expiryDate) : undefined,
                status: isAllocated ? 'Allocated' : (n.status || existing.status || 'Available'),
                allocationStatus: isAllocated ? 'Active' : (n.allocationStatus || existing.allocationStatus || 'Unallocated'),
                adminEmail: n.adminEmail || existing.adminEmail,
                ownerAdminEmail: n.ownerAdminEmail || existing.ownerAdminEmail,
                adminId: n.adminId || existing.adminId,
              });
            } else {
              map.set(n.phone, n);
            }
          });
          return Array.from(map.values());
        });
      }

      // 2. Fetch Call Logs
      const { data: logData, error: logErr } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!logErr && Array.isArray(logData) && logData.length > 0) {
        const formattedLogs: CallLog[] = logData.map((row: any) => {
          const isCreatedByCurrent = Boolean(
            (row.admin_user_id && (
              row.admin_user_id === activeAdminUserId ||
              row.admin_user_id === user?.id ||
              row.admin_user_id === profile?.id
            ))
          );
          let resolvedAdminEmail: string | undefined = isCreatedByCurrent ? currentUserEmail : undefined;
          if (!resolvedAdminEmail && row.admin_user_id) {
            const matchedAdmin = allAdmins.find(a => a.id === row.admin_user_id);
            if (matchedAdmin?.email) resolvedAdminEmail = matchedAdmin.email;
          }

          return {
            id: row.id,
            callingDataId: row.calling_data_inventory_id || undefined,
            phone: row.phone_number || '',
            shopId: row.shop_id || activeShopId,
            agentId: row.agent_user_id || 'agent-1',
            agentName: row.agent_name || 'Agent',
            callStatus: row.call_status || 'Busy',
            duration: Number(row.duration_seconds || 0),
            customerName: row.customer_name || undefined,
            notes: row.notes || '',
            nextCallbackDate: row.next_callback_date ? row.next_callback_date.split('T')[0] : undefined,
            timestamp: row.created_at || new Date().toISOString(),
            adminId: row.admin_user_id || (isCreatedByCurrent ? activeAdminUserId : DEFAULT_USER_UUID),
            adminEmail: resolvedAdminEmail,
            ownerAdminEmail: resolvedAdminEmail,
          };
        });
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
        .order('created_at', { ascending: false });

      if (!leadErr && Array.isArray(leadData) && leadData.length > 0) {
        const formattedLeads: LeadFromCall[] = leadData.map((row: any) => {
          const isCreatedByCurrent = Boolean(
            (row.admin_user_id && (
              row.admin_user_id === activeAdminUserId ||
              row.admin_user_id === user?.id ||
              row.admin_user_id === profile?.id
            ))
          );
          let resolvedAdminEmail: string | undefined = row.admin_email || (isCreatedByCurrent ? currentUserEmail : undefined);
          if (!resolvedAdminEmail && row.admin_user_id) {
            const matchedAdmin = allAdmins.find(a => a.id === row.admin_user_id);
            if (matchedAdmin?.email) resolvedAdminEmail = matchedAdmin.email;
          }

          return {
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
            adminId: row.admin_user_id || (isCreatedByCurrent ? activeAdminUserId : DEFAULT_USER_UUID),
            adminEmail: resolvedAdminEmail,
            ownerAdminEmail: resolvedAdminEmail,
          };
        });
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
        .order('created_at', { ascending: false });

      if (!impErr && Array.isArray(impData) && impData.length > 0) {
        const formattedImp: ImportedLead[] = impData.map((row: any) => ({
          id: row.id,
          name: row.customer_name || '',
          phone: row.phone_number || '',
          email: row.email || '',
          source: row.source || 'Website',
          status: row.status || 'Pending',
          createdDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          importedDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          notes: row.notes || undefined,
          adminId: row.admin_user_id || DEFAULT_USER_UUID,
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
  }, [activeShopId, activeAdminUserId, currentUserEmail, isSuperAdmin, hasSharedAgentsAccess]);

  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  const setRoleMode = (role: RoleMode, agentId?: string) => {
    setRoleModeState(role);
    if (agentId) setCurrentAgentIdState(agentId);
  };

  const myAgent = useMemo(() => {
    const cleanEmail = currentUserEmail.toLowerCase().trim();
    return agents.find(a =>
      (cleanEmail && (a.email || '').toLowerCase().trim() === cleanEmail) ||
      (a.id && (a.id === user?.id || a.id === profile?.id || a.id === currentAdminProfile?.id)) ||
      (a.name && (
        (user?.user_metadata?.full_name && a.name.toLowerCase().includes(user.user_metadata.full_name.toLowerCase())) ||
        (profile?.full_name && a.name.toLowerCase().includes(profile.full_name.toLowerCase())) ||
        (currentAdminProfile?.full_name && a.name.toLowerCase().includes(currentAdminProfile.full_name.toLowerCase()))
      ))
    );
  }, [agents, currentUserEmail, user?.id, profile?.id, profile?.full_name, currentAdminProfile, user?.user_metadata?.full_name]);

  const currentAgent = useMemo(() => {
    if (isSalesOrStaff && myAgent) {
      return myAgent;
    }
    return agents.find(a => a.id === currentAgentId) || agents[0] || DEFAULT_FALLBACK_AGENT;
  }, [agents, currentAgentId, isSalesOrStaff, myAgent]);

  // Keep roleMode locked to Agent and currentAgentId synced for sales/staff
  useEffect(() => {
    if (isSalesOrStaff) {
      setRoleModeState('Agent');
      if (myAgent?.id) {
        setCurrentAgentIdState(myAgent.id);
      }
    }
  }, [isSalesOrStaff, myAgent?.id]);

  // Helper to check if a CallingNumber, Lead, CallLog belongs to the logged in sales / staff person
  const isAssignedToCurrentUser = useCallback((item: {
    agentId?: string;
    agentName?: string;
    agentEmail?: string;
  }) => {
    if (!item) return false;

    const cleanEmail = currentUserEmail.toLowerCase().trim();

    // 1. Direct Email Match
    if (cleanEmail) {
      if (item.agentEmail && item.agentEmail.toLowerCase().trim() === cleanEmail) {
        return true;
      }
      const matchedAgent = agents.find(a => (a.email || '').toLowerCase().trim() === cleanEmail);
      if (matchedAgent && item.agentId && matchedAgent.id === item.agentId) {
        return true;
      }
      const matchedAdmin = allAdmins.find(a => (a.email || '').toLowerCase().trim() === cleanEmail);
      if (matchedAdmin && item.agentId && matchedAdmin.id === item.agentId) {
        return true;
      }
    }

    // 2. Candidate IDs Match
    const candidateIds = new Set<string>();
    if (user?.id) candidateIds.add(user.id);
    if (profile?.id) candidateIds.add(profile.id);
    if (currentAdminProfile?.id) candidateIds.add(currentAdminProfile.id);
    if (myAgent?.id) candidateIds.add(myAgent.id);
    if (currentAgentId && currentAgentId !== 'agent-1') candidateIds.add(currentAgentId);

    if (item.agentId && candidateIds.has(item.agentId)) {
      return true;
    }

    // 3. Name Match
    const myNames = [
      profile?.full_name,
      user?.user_metadata?.full_name,
      currentAdminProfile?.full_name,
      myAgent?.name,
      cleanEmail ? cleanEmail.split('@')[0] : '',
    ].filter(Boolean).map(n => n!.toLowerCase().trim());

    if (item.agentName) {
      const cleanItemName = item.agentName.toLowerCase().replace(/\s*\((sales|staff|agent)\)\s*/gi, '').trim();
      for (const rawName of myNames) {
        const cleanName = rawName.replace(/\s*\((sales|staff|agent)\)\s*/gi, '').trim();
        if (cleanName && cleanItemName && (cleanName === cleanItemName || cleanItemName.includes(cleanName) || cleanName.includes(cleanItemName))) {
          return true;
        }
      }
    }

    return false;
  }, [currentUserEmail, agents, allAdmins, user?.id, user?.user_metadata?.full_name, profile?.id, profile?.full_name, currentAdminProfile, myAgent, currentAgentId]);

  // Strict isolation filter: Super Admin sees only superadmin records; Regular Admin sees ONLY their own records
  const isAccessible = useCallback((recordAdminEmail?: string, recordAdminId?: string, recordShopId?: string) => {
    const cleanRecordEmail = (recordAdminEmail || '').toLowerCase().trim();
    const cleanCurrent = currentUserEmail.toLowerCase().trim();

    // 1. Direct Ownership Check:
    // Does this record belong to the currently logged in admin/user?
    const isMyRecord = Boolean(
      (cleanRecordEmail && cleanCurrent && cleanRecordEmail === cleanCurrent) ||
      (recordAdminId && recordAdminId !== DEFAULT_USER_UUID && (
        (activeAdminUserId && activeAdminUserId !== DEFAULT_USER_UUID && recordAdminId === activeAdminUserId) ||
        (user?.id && user.id !== DEFAULT_USER_UUID && recordAdminId === user.id) ||
        (profile?.id && profile.id !== DEFAULT_USER_UUID && recordAdminId === profile.id)
      ))
    );

    // If it belongs to me, I can always see it
    if (isMyRecord) {
      return true;
    }

    // 2. Identify Super Admin / System Default records
    const isSuperRecord = Boolean(
      cleanRecordEmail === 'admin@nexus.com' ||
      cleanRecordEmail === 'superadmin@nexus.com' ||
      (!cleanRecordEmail && (!recordAdminId || recordAdminId === DEFAULT_USER_UUID)) ||
      (cleanRecordEmail === '' && recordAdminId === DEFAULT_USER_UUID)
    );

    if (isSuperAdmin) {
      // Super Admin ONLY sees Super Admin records; records created by regular Admins are hidden!
      return isSuperRecord;
    }

    if (hasSharedAgentsAccess) {
      return true;
    }

    // Isolated Admin: MUST NOT see Super Admin records or unassigned legacy records
    if (isSuperRecord) {
      return false;
    }

    // Records created by other regular admins are hidden
    return false;
  }, [isSuperAdmin, hasSharedAgentsAccess, currentUserEmail, user?.id, profile?.id, activeAdminUserId]);

  const scopedNumbers = useMemo(() => {
    if (isSalesOrStaff) {
      // Sales Agent sees ONLY numbers assigned to them
      return numbers.filter(n => isAssignedToCurrentUser(n));
    }

    return numbers.filter(n => {
      const email = (n as any).adminEmail || (n as any).ownerAdminEmail;
      const recordAdminId = n.adminId;
      if (email || recordAdminId) {
        return isAccessible(email, recordAdminId, n.shopId);
      }
      if (n.agentId) {
        const agentBelongsToUs = agents.some(a => a.id === n.agentId);
        if (agentBelongsToUs) return true;
        return false;
      }
      if (isSuperAdmin) return true;
      return false;
    });
  }, [numbers, isSalesOrStaff, isAssignedToCurrentUser, isAccessible, agents, isSuperAdmin]);

  const scopedLeads = useMemo(() => {
    if (isSalesOrStaff) {
      return leads.filter(l => isAssignedToCurrentUser(l));
    }

    return leads.filter(l => {
      const email = (l as any).adminEmail || (l as any).ownerAdminEmail;
      const recordAdminId = (l as any).adminId;
      if (email || recordAdminId) {
        return isAccessible(email, recordAdminId, (l as any).shopId);
      }
      if (l.agentId) {
        const agentBelongsToUs = agents.some(a => a.id === l.agentId);
        if (agentBelongsToUs) return true;
        return false;
      }
      if (isSuperAdmin) return true;
      return false;
    });
  }, [leads, isSalesOrStaff, isAssignedToCurrentUser, isAccessible, agents, isSuperAdmin]);

  const scopedCallLogs = useMemo(() => {
    if (isSalesOrStaff) {
      return callLogs.filter(cl => isAssignedToCurrentUser(cl));
    }

    return callLogs.filter(cl => {
      const email = (cl as any).adminEmail || (cl as any).ownerAdminEmail;
      const recordAdminId = (cl as any).adminId;
      if (email || recordAdminId) {
        return isAccessible(email, recordAdminId, cl.shopId);
      }
      if (cl.agentId) {
        const agentBelongsToUs = agents.some(a => a.id === cl.agentId);
        if (agentBelongsToUs) return true;
        return false;
      }
      if (isSuperAdmin) return true;
      return false;
    });
  }, [callLogs, isSalesOrStaff, isAssignedToCurrentUser, isAccessible, agents, isSuperAdmin]);

  const scopedImportedLeads = useMemo(() => {
    if (isSalesOrStaff) {
      return importedLeads.filter(i => isAssignedToCurrentUser({
        agentId: i.assignedAgentId,
        agentName: i.assignedAgentName,
      }));
    }

    return importedLeads.filter(i => {
      const email = (i as any).adminEmail || (i as any).ownerAdminEmail;
      const recordAdminId = (i as any).adminId;
      if (email || recordAdminId) {
        return isAccessible(email, recordAdminId, i.shopId);
      }
      if (i.assignedAgentId) {
        const agentBelongsToUs = agents.some(a => a.id === i.assignedAgentId);
        if (agentBelongsToUs) return true;
        return false;
      }
      if (isSuperAdmin) return true;
      return false;
    });
  }, [importedLeads, isSalesOrStaff, isAssignedToCurrentUser, isAccessible, agents, isSuperAdmin]);

  const visibleNumbers = useMemo(() => {
    if (isSalesOrStaff) return scopedNumbers;
    if (roleMode === 'Admin') return scopedNumbers;
    return scopedNumbers.filter(n => n.agentId === currentAgentId);
  }, [scopedNumbers, roleMode, currentAgentId, isSalesOrStaff]);

  const visibleLeads = useMemo(() => {
    if (isSalesOrStaff) return scopedLeads;
    if (roleMode === 'Admin') return scopedLeads;
    return scopedLeads.filter(l => l.agentId === currentAgentId);
  }, [scopedLeads, roleMode, currentAgentId, isSalesOrStaff]);

  const visibleCallLogs = useMemo(() => {
    if (isSalesOrStaff) return scopedCallLogs;
    if (roleMode === 'Admin') return scopedCallLogs;
    return scopedCallLogs.filter(cl => cl.agentId === currentAgentId);
  }, [scopedCallLogs, roleMode, currentAgentId, isSalesOrStaff]);

  const visibleImportedLeads = useMemo(() => {
    if (isSalesOrStaff) return scopedImportedLeads;
    if (roleMode === 'Admin') return scopedImportedLeads;
    return scopedImportedLeads.filter(il => il.assignedAgentId === currentAgentId);
  }, [scopedImportedLeads, roleMode, currentAgentId, isSalesOrStaff]);

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
    const currentAdminId = user?.id || profile?.id || activeAdminUserId;
    const newItems: CallingNumber[] = rawNumbers.map((phone) => ({
      id: crypto.randomUUID(),
      phone: phone.trim(),
      source: 'CSV Upload' as any,
      status: 'Available',
      adminId: currentAdminId,
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
        admin_user_id: currentAdminId,
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
  }, [activeAdminUserId, activeShopId, currentUserEmail, user?.id, profile?.id]);

  // Workflow Action 2: Allocate available or unallocated pool numbers to selected agents
  const allocateNumbersToAgents = useCallback((targetAgentIds: string[], countPerAgent: number = 250) => {
    const now = new Date();
    const allocatedDate = now.toISOString().split('T')[0];
    const expiryDate = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const activeAgentsList = agents.length > 0 ? agents : getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess);

    const allocationsToPersist: Array<{
      agentId: string;
      agentName: string;
      allocatedDate: string;
      expiryDate: string;
      ids: string[];
      phones: string[];
    }> = [];

    setNumbers(prev => {
      const copy = [...prev];
      let pool = copy.filter(n => isAccessible(n.adminEmail || (n as any).ownerAdminEmail, n.adminId, n.shopId) && n.status === 'Available');
      if (pool.length === 0) {
        pool = copy.filter(n => isAccessible(n.adminEmail || (n as any).ownerAdminEmail, n.adminId, n.shopId));
      }

      let poolIdx = 0;
      targetAgentIds.forEach(agId => {
        const ag = activeAgentsList.find(a => a.id === agId) || getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess).find(a => a.id === agId);
        if (!ag) return;

        const agentAllocatedIds: string[] = [];
        const agentAllocatedPhones: string[] = [];

        for (let c = 0; c < countPerAgent && poolIdx < pool.length; c++) {
          const item = pool[poolIdx++];
          item.status = 'Allocated';
          item.agentId = ag.id;
          item.agentName = ag.name;
          item.agentEmail = ag.email;
          item.allocatedDate = allocatedDate;
          item.expiryDate = expiryDate;
          item.allocationStatus = 'Active';
          if (item.id && item.id.length === 36 && item.id.includes('-')) {
            agentAllocatedIds.push(item.id);
          } else {
            agentAllocatedPhones.push(item.phone);
          }
        }

        if (agentAllocatedIds.length > 0 || agentAllocatedPhones.length > 0) {
          allocationsToPersist.push({
            agentId: ag.id,
            agentName: ag.name,
            agentEmail: ag.email,
            allocatedDate,
            expiryDate,
            ids: agentAllocatedIds,
            phones: agentAllocatedPhones,
          });
        }
      });

      return copy;
    });

    try {
      allocationsToPersist.forEach(alloc => {
        const notesPayload = JSON.stringify({
          agentId: alloc.agentId,
          agentName: alloc.agentName,
          agentEmail: alloc.agentEmail,
          allocatedDate: alloc.allocatedDate,
          expiryDate: alloc.expiryDate,
        });

        if (alloc.ids.length > 0) {
          supabase.from('calling_data_inventory')
            .update({ status: 'Allocated', notes: notesPayload, updated_at: new Date().toISOString() })
            .in('id', alloc.ids)
            .then(({ error }) => {
              if (error) console.error('Supabase allocate error:', error.message, error);
            });
        }
        if (alloc.phones.length > 0) {
          supabase.from('calling_data_inventory')
            .update({ status: 'Allocated', notes: notesPayload, updated_at: new Date().toISOString() })
            .in('phone_number', alloc.phones)
            .then(({ error }) => {
              if (error) console.error('Supabase allocate error by phone:', error.message, error);
            });
        }
      });
    } catch (e) {
      console.error('Supabase allocate catch:', e);
    }
  }, [agents, currentUserEmail, isSuperAdmin, hasSharedAgentsAccess]);

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

      // Auto-create Follow-up Task in Tasks & Follow-ups
      if (newStatus === 'Sales' || newStatus === 'Renewal') {
        try {
          const leadObj = leads.find(l => l.id === leadId);
          const customerName = leadObj?.name || 'Customer';
          const taskTitle = newStatus === 'Sales'
            ? `Sales Won - Finalize Agreement & Onboarding: ${customerName}`
            : `Subscription Renewal Follow-up: ${customerName}`;
          const taskDesc = newStatus === 'Sales'
            ? `Sales Deal converted successfully! Follow up with ${customerName} to finalize invoices, initiate product onboarding, and schedule delivery confirmation.`
            : `Annual subscription renewal due soon for ${customerName}. Connect to review service utilization and process contract renewal.`;

          const dueDate = new Date(Date.now() + (newStatus === 'Sales' ? 2 : 14) * 86400000).toISOString().split('T')[0];

          const autoTask = {
            id: `task-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: taskTitle,
            description: taskDesc,
            type: newStatus === 'Sales' ? 'satisfaction_followup' : 'renewal',
            status: 'To Do',
            taskStatus: 'To Do',
            priority: 'High',
            due_date: dueDate,
            dueDate: dueDate,
            assignedAgentName: leadObj?.agentName || currentAgent?.name || 'Assigned Agent',
            linkedEntityName: customerName,
            customer_phone: targetPhone,
            notes: leadObj?.notes || 'Automated task generated upon deal conversion',
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          const ownerEmail = getOwnerAdminEmail(currentUserEmail, userRole);
          const tasksKey = `nexus_crm_tasks_${ownerEmail}`;
          const existingTasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
          existingTasks.unshift(autoTask);
          localStorage.setItem(tasksKey, JSON.stringify(existingTasks));
          window.dispatchEvent(new Event('storage'));
        } catch { }
      }
    }
  }, [leads, currentAgent?.name, currentUserEmail, userRole]);

  // Workflow Action 5: Assign External Lead (Website/Facebook) to Agent
  const assignImportedLead = useCallback((importedLeadId: string, targetAgentId: string) => {
    const targetImp = importedLeads.find(i => i.id === importedLeadId);
    if (!targetImp) return;

    const availableAgents = agents.length > 0 ? agents : getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess);
    const ag = availableAgents.find(a => a.id === targetAgentId) || availableAgents[0];
    if (!ag) return;

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
  }, [importedLeads, agents, currentUserEmail, isSuperAdmin, hasSharedAgentsAccess]);

  // Workflow Action 6: Auto assign pending imported leads round-robin
  const autoAssignImportedLeads = useCallback(() => {
    const pending = importedLeads.filter(i => i.status === 'Pending');
    if (pending.length === 0) return;

    const availableAgents = agents.length > 0 ? agents : getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess);
    if (availableAgents.length === 0) return;
    pending.forEach((imp, idx) => {
      const assignedAg = availableAgents[idx % availableAgents.length];
      assignImportedLead(imp.id, assignedAg.id);
    });
  }, [importedLeads, assignImportedLead, agents, currentUserEmail, isSuperAdmin, hasSharedAgentsAccess]);

  // Workflow Action 7: Return allocated calling number back to Admin Pool
  const returnToAdminPool = useCallback((callingNumberId: string, reason: string = 'Returned to Admin Pool') => {
    const num = numbers.find(n => n.id === callingNumberId || n.phone === callingNumberId);
    if (!num) return;

    setNumbers(prev =>
      prev.map(n => {
        if (n.id === callingNumberId || n.phone === callingNumberId) {
          return {
            ...n,
            status: 'Available',
            agentId: undefined,
            agentName: undefined,
            allocatedDate: undefined,
            expiryDate: undefined,
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
        ? supabase.from('calling_data_inventory').update({ status: 'Available', notes: null, updated_at: new Date().toISOString() }).eq('id', num.id)
        : supabase.from('calling_data_inventory').update({ status: 'Available', notes: null, updated_at: new Date().toISOString() }).eq('phone_number', num.phone);

      query.then(({ error }) => {
        if (error) console.error('Supabase returnToAdminPool error:', error.message, error);
      });
    } catch (e) {
      console.error('Supabase returnToAdminPool catch:', e);
    }
  }, [numbers]);

  // Workflow Action 8: Reassign a single number to a specific agent
  const reassignNumberToAgent = useCallback((callingNumberId: string, targetAgentId: string) => {
    const availableAgents = agents.length > 0 ? agents : getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess);
    const targetAgent = availableAgents.find(a => a.id === targetAgentId) || getDynamicAgents(currentUserEmail, isSuperAdmin, hasSharedAgentsAccess).find(a => a.id === targetAgentId);
    if (!targetAgent) return;

    const targetNum = numbers.find(n => n.id === callingNumberId || n.phone === callingNumberId);
    const allocatedDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    setNumbers(prev =>
      prev.map(n => {
        if (n.id === callingNumberId || n.phone === callingNumberId) {
          return {
            ...n,
            status: 'Allocated',
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            agentEmail: targetAgent.email,
            allocationStatus: 'Active',
            allocatedDate,
            expiryDate,
          };
        }
        return n;
      })
    );

    try {
      if (targetNum) {
        const notesPayload = JSON.stringify({
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          agentEmail: targetAgent.email,
          allocatedDate,
          expiryDate,
          userNotes: targetNum.lastCallNotes || undefined,
        });

        const isUuid = targetNum.id && targetNum.id.length === 36 && targetNum.id.includes('-');
        const query = isUuid
          ? supabase.from('calling_data_inventory').update({ status: 'Allocated', notes: notesPayload, updated_at: new Date().toISOString() }).eq('id', targetNum.id)
          : supabase.from('calling_data_inventory').update({ status: 'Allocated', notes: notesPayload, updated_at: new Date().toISOString() }).eq('phone_number', targetNum.phone);

        query.then(({ error }) => {
          if (error) console.error('Supabase reassignNumberToAgent error:', error.message, error);
        });
      }
    } catch (e) {
      console.error('Supabase reassign error:', e);
    }
  }, [numbers, agents, currentUserEmail, isSuperAdmin, hasSharedAgentsAccess]);

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
