import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/context/AuthContext';
import { getOwnerAdminEmail } from '@/shared/lib/adminStore';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------
export interface ApiLead {
  id: string;
  shopId?: string;
  createdById?: string;
  ownerAdminEmail?: string;
  createdByEmail?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  leadSource?: string;
  leadStatus?: string;
  leadValue?: number;
  priority?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  leadSource?: string;
  leadStatus?: string;
  leadValue?: number;
  priority?: string;
  notes?: string;
}

export interface ApiCustomer {
  id: string;
  shopId?: string;
  ownerAdminEmail?: string;
  createdByEmail?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  city?: string;
  customerType?: string;
  tags?: string[];
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string;
}

export interface CreateCustomerPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  city?: string;
  customerType?: string;
  notes?: string;
}

export interface ApiTask {
  id: string;
  title: string;
  description?: string;
  taskStatus: string;
  status?: string;
  priority: string;
  dueDate?: string;
  assignedToUserId?: string;
  ownerAdminEmail?: string;
  createdByEmail?: string;
  createdAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  taskStatus?: string;
  priority?: string;
  dueDate?: string;
  assignedToUserId?: string;
  linkedLeadId?: string;
  linkedCustomerId?: string;
}

export interface ApiCallingData {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status?: string;
  assignedToUserId?: string;
  ownerAdminEmail?: string;
  createdByEmail?: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// LOCAL STORAGE HELPERS
// -----------------------------------------------------------------------------
function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { }
}

// -----------------------------------------------------------------------------
// INITIAL DEMO DATA FOR FALLBACK
// -----------------------------------------------------------------------------
const DEMO_LEADS: ApiLead[] = [
  {
    id: 'lead-demo-1',
    shopId: 'shop-1',
    createdById: 'user-1',
    ownerAdminEmail: 'admin@nexus.com',
    createdByEmail: 'admin@nexus.com',
    firstName: 'Zeeshan',
    lastName: 'Khan',
    email: 'zeeshan@example.com',
    phone: '03001234567',
    companyName: 'Tech Solutions',
    leadSource: 'Website',
    leadStatus: 'New',
    leadValue: 50000,
    priority: 'High',
    notes: 'Interested in CRM software.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEMO_CUSTOMERS: ApiCustomer[] = [
  {
    id: 'cust-demo-1',
    shopId: 'shop-1',
    ownerAdminEmail: 'admin@nexus.com',
    createdByEmail: 'admin@nexus.com',
    firstName: 'Afzal',
    lastName: 'Ahan',
    email: 'afzal@nexus.com',
    phone: '+92345678901',
    companyName: 'WedDev',
    city: 'Karachi',
    customerType: 'VIP',
    createdAt: new Date().toISOString(),
  },
];

const DEMO_TASKS: ApiTask[] = [
  {
    id: 'task-demo-1',
    title: 'Follow up with Zeeshan Khan',
    description: 'Call regarding project proposal',
    taskStatus: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    ownerAdminEmail: 'admin@nexus.com',
    createdByEmail: 'admin@nexus.com',
    createdAt: new Date().toISOString(),
  },
];

const DEMO_CALLING: ApiCallingData[] = [
  {
    id: 'call-demo-1',
    phoneNumber: '+92 300 1234567',
    contactName: 'Zeeshan Khan',
    status: 'Available',
    notes: 'Primary contact number',
    ownerAdminEmail: 'admin@nexus.com',
    createdByEmail: 'admin@nexus.com',
    createdAt: new Date().toISOString(),
  },
];

// Helper to format lead row from Supabase
function formatLeadRow(row: any): ApiLead {
  return {
    id: row.id,
    shopId: row.shop_id,
    createdById: row.created_by_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || 'admin@nexus.com',
    createdByEmail: row.created_by_email || 'admin@nexus.com',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    companyName: row.company_name || '',
    leadSource: row.lead_source || 'Manual Entry',
    leadStatus: row.lead_status || 'New',
    leadValue: row.lead_value ? Number(row.lead_value) : 0,
    priority: row.priority || 'Medium',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// Helper to format customer row from Supabase
function formatCustomerRow(row: any): ApiCustomer {
  const type = row.customer_type || 'Regular';
  return {
    id: row.id,
    shopId: row.shop_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || 'admin@nexus.com',
    createdByEmail: row.created_by_email || 'admin@nexus.com',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    companyName: row.company_name || '',
    city: row.city || '',
    customerType: type,
    tags: [type],
    totalOrders: Number(row.total_orders || 0),
    totalSpent: Number(row.total_order_value || 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Helper to format task row from Supabase
function formatTaskRow(row: any): ApiTask {
  const st = row.status || row.task_type || 'Not Started';
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    taskStatus: st,
    status: st,
    priority: row.priority || 'Medium',
    dueDate: row.due_date || new Date().toISOString(),
    assignedToUserId: row.assigned_to_user_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || 'admin@nexus.com',
    createdByEmail: row.created_by_email || 'admin@nexus.com',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Helper to format calling data row from Supabase
function formatCallingRow(row: any): ApiCallingData {
  return {
    id: row.id,
    phoneNumber: row.phone_number || '',
    contactName: row.contact_name || row.notes || '',
    status: row.status || 'Available',
    assignedToUserId: row.assigned_to_user_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || 'admin@nexus.com',
    createdByEmail: row.created_by_email || 'admin@nexus.com',
    notes: row.notes || '',
    expiresAt: row.expiry_date,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Helper to merge Supabase records with local records so nothing disappears
function mergeWithLocal<T extends { id: string }>(dbItems: T[], localCacheKey: string, fallback: T[]): T[] {
  const cached = getLocalCache<T[]>(localCacheKey, fallback);
  const dbIds = new Set(dbItems.map((i) => i.id));
  const localOnly = cached.filter((c) => !dbIds.has(c.id));
  return [...dbItems, ...localOnly];
}

// Default UUIDs for valid database constraints
const DEFAULT_SHOP_UUID = '3c337fc4-48ba-4835-a7b2-93987afe55be';
const DEFAULT_USER_UUID = '01a2e7c8-6a06-4085-9e3f-5fbcd6138a59';

function getSafeUuid(id: string | undefined | null, fallback: string = DEFAULT_USER_UUID): string {
  if (!id) return fallback;
  const clean = String(id).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) return clean;
  return fallback;
}

// -----------------------------------------------------------------------------
// LEADS HOOK
// -----------------------------------------------------------------------------
export function useLeads() {
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const localKey = `nexus_crm_leads_${ownerAdminEmail}`;
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const [leads, setLeads] = useState<ApiLead[]>(() => {
    const cached = getLocalCache<ApiLead[]>(localKey, isSuperAdminWorkspace ? DEMO_LEADS : []);
    return cached;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbErr } = await supabase
        .from('leads')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(formatLeadRow);
        const merged = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_LEADS : []);
        setLeads(merged);
        setLocalCache(localKey, merged);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('fetchLeads notice:', err);
    }

    const cached = getLocalCache<ApiLead[]>(localKey, isSuperAdminWorkspace ? DEMO_LEADS : []);
    setLeads(cached);
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const createLead = async (payload: CreateLeadPayload) => {
    let newLead: ApiLead | null = null;
    const shopId = getSafeUuid((user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id, DEFAULT_SHOP_UUID);
    const userId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);

    try {
      const { data, error: sbErr } = await supabase
        .from('leads')
        .insert({
          shop_id: shopId,
          created_by_id: userId,
          assigned_to_user_id: userId,
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          email: payload.email?.trim() || null,
          phone: payload.phone?.trim() || null,
          company_name: payload.companyName || null,
          lead_source: payload.leadSource || 'Manual Entry',
          lead_status: payload.leadStatus || 'New',
          lead_value: payload.leadValue || 0,
          priority: payload.priority || 'Medium',
          notes: payload.notes || null,
        })
        .select()
        .single();

      if (sbErr) {
        console.error('Supabase createLead error:', sbErr.message, sbErr);
      } else if (data) {
        newLead = formatLeadRow(data);
      }
    } catch (e: any) {
      console.error('createLead exception:', e);
    }

    if (!newLead) {
      newLead = {
        id: `lead-local-${Date.now()}`,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        companyName: payload.companyName,
        leadSource: payload.leadSource || 'Manual Entry',
        leadStatus: payload.leadStatus || 'New',
        leadValue: payload.leadValue || 0,
        priority: payload.priority || 'Medium',
        notes: payload.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerAdminEmail: ownerAdminEmail,
        createdByEmail: currentUserEmail,
      };
    }

    setLeads((prev) => {
      const updated = [newLead!, ...prev.filter((l) => l.id !== newLead!.id)];
      setLocalCache(localKey, updated);
      return updated;
    });

    return newLead;
  };

  const deleteLead = async (id: string) => {
    try {
      await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch { }
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await supabase.from('leads').update({ lead_status: status, updated_at: new Date().toISOString() }).eq('id', id);
    } catch { }
    setLeads((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, leadStatus: status } : l));
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  return { leads, loading, error, createLead, deleteLead, updateLeadStatus, refetch: fetchLeads };
}

// -----------------------------------------------------------------------------
// CUSTOMERS HOOK
// -----------------------------------------------------------------------------
export function useCustomers() {
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const localKey = `nexus_crm_customers_${ownerAdminEmail}`;
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const [customers, setCustomers] = useState<ApiCustomer[]>(() => {
    const cached = getLocalCache<ApiCustomer[]>(localKey, isSuperAdminWorkspace ? DEMO_CUSTOMERS : []);
    return cached;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbErr } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(formatCustomerRow);
        const merged = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_CUSTOMERS : []);
        setCustomers(merged);
        setLocalCache(localKey, merged);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('fetchCustomers notice:', err);
    }

    const cached = getLocalCache<ApiCustomer[]>(localKey, isSuperAdminWorkspace ? DEMO_CUSTOMERS : []);
    setCustomers(cached);
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const createCustomer = async (payload: CreateCustomerPayload) => {
    let newCustomer: ApiCustomer | null = null;
    const shopId = getSafeUuid((user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id, DEFAULT_SHOP_UUID);
    const userId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);

    try {
      const { data, error: sbErr } = await supabase
        .from('customers')
        .insert({
          shop_id: shopId,
          created_by_id: userId,
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          email: payload.email?.trim() || null,
          phone: payload.phone?.trim() || null,
          company_name: payload.companyName || null,
          city: payload.city || null,
          customer_type: payload.customerType || 'Individual',
          notes: payload.notes || null,
        })
        .select()
        .single();

      if (sbErr) {
        console.error('Supabase createCustomer error:', sbErr.message, sbErr);
      } else if (data) {
        newCustomer = formatCustomerRow(data);
      }
    } catch (e: any) {
      console.error('createCustomer exception:', e);
    }

    if (!newCustomer) {
      newCustomer = {
        id: `cust-local-${Date.now()}`,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        companyName: payload.companyName,
        city: payload.city,
        customerType: payload.customerType || 'Individual',
        tags: [payload.customerType || 'Individual'],
        createdAt: new Date().toISOString(),
        ownerAdminEmail: ownerAdminEmail,
        createdByEmail: currentUserEmail,
      };
    }

    setCustomers((prev) => {
      const updated = [newCustomer!, ...prev.filter((c) => c.id !== newCustomer!.id)];
      setLocalCache(localKey, updated);
      return updated;
    });

    return newCustomer;
  };

  const deleteCustomer = async (id: string) => {
    try {
      await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch { }
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  return { customers, loading, error, createCustomer, deleteCustomer, refetch: fetchCustomers };
}

// -----------------------------------------------------------------------------
// TASKS HOOK
// -----------------------------------------------------------------------------
export function useTasks() {
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const localKey = `nexus_crm_tasks_${ownerAdminEmail}`;
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const [tasks, setTasks] = useState<ApiTask[]>(() => {
    const cached = getLocalCache<ApiTask[]>(localKey, isSuperAdminWorkspace ? DEMO_TASKS : []);
    return cached;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbErr } = await supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(formatTaskRow);
        const merged = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_TASKS : []);
        setTasks(merged);
        setLocalCache(localKey, merged);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('fetchTasks notice:', err);
    }

    const cached = getLocalCache<ApiTask[]>(localKey, isSuperAdminWorkspace ? DEMO_TASKS : []);
    setTasks(cached);
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (payload: CreateTaskPayload) => {
    let newTask: ApiTask | null = null;
    const shopId = getSafeUuid((user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id, DEFAULT_SHOP_UUID);
    const userId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);
    const assignedTo = payload.assignedToUserId ? getSafeUuid(payload.assignedToUserId, userId) : userId;

    try {
      const { data, error: sbErr } = await supabase
        .from('tasks')
        .insert({
          shop_id: shopId,
          created_by_id: userId,
          assigned_to_user_id: assignedTo,
          title: payload.title.trim(),
          description: payload.description || null,
          status: payload.taskStatus || 'Not Started',
          priority: payload.priority || 'Medium',
          due_date: payload.dueDate || new Date().toISOString(),
        })
        .select()
        .single();

      if (sbErr) {
        console.error('Supabase createTask error:', sbErr.message, sbErr);
      } else if (data) {
        newTask = formatTaskRow(data);
      }
    } catch (e: any) {
      console.error('createTask exception:', e);
    }

    if (!newTask) {
      newTask = {
        id: `task-local-${Date.now()}`,
        title: payload.title,
        description: payload.description,
        taskStatus: payload.taskStatus || 'Not Started',
        priority: payload.priority || 'Medium',
        dueDate: payload.dueDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ownerAdminEmail: ownerAdminEmail,
        createdByEmail: currentUserEmail,
      };
    }

    setTasks((prev) => {
      const updated = [newTask!, ...prev.filter((t) => t.id !== newTask!.id)];
      setLocalCache(localKey, updated);
      return updated;
    });

    return newTask;
  };

  const completeTask = async (id: string) => {
    try {
      await supabase.from('tasks').update({ status: 'Completed', completion_date: new Date().toISOString() }).eq('id', id);
    } catch { }
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, taskStatus: 'Completed', status: 'Completed' } : t));
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  const deleteTask = async (id: string) => {
    try {
      await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch { }
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  return { tasks, loading, error, createTask, completeTask, deleteTask, refetch: fetchTasks };
}

// -----------------------------------------------------------------------------
// CALLING DATA HOOK
// -----------------------------------------------------------------------------
export function useCallingData() {
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const localKey = `nexus_crm_calling_${ownerAdminEmail}`;
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const [callingData, setCallingData] = useState<ApiCallingData[]>(() => {
    const cached = getLocalCache<ApiCallingData[]>(localKey, isSuperAdminWorkspace ? DEMO_CALLING : []);
    return cached;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCallingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbErr } = await supabase
        .from('calling_data')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(formatCallingRow);
        const merged = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_CALLING : []);
        setCallingData(merged);
        setLocalCache(localKey, merged);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('fetchCallingData notice:', err);
    }

    const cached = getLocalCache<ApiCallingData[]>(localKey, isSuperAdminWorkspace ? DEMO_CALLING : []);
    setCallingData(cached);
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace]);

  useEffect(() => { fetchCallingData(); }, [fetchCallingData]);

  const addNumber = async (payload: { phoneNumber: string; contactName?: string; notes?: string }) => {
    let newCall: ApiCallingData | null = null;
    const shopId = getSafeUuid((user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id, DEFAULT_SHOP_UUID);
    const userId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);

    try {
      const { data, error: sbErr } = await supabase
        .from('calling_data')
        .insert({
          shop_id: shopId,
          created_by_id: userId,
          phone_number: payload.phoneNumber.trim(),
          status: 'Available',
          notes: payload.notes || payload.contactName || null,
        })
        .select()
        .single();

      if (sbErr) {
        console.error('Supabase addNumber error:', sbErr.message, sbErr);
      } else if (data) {
        newCall = formatCallingRow(data);
      }
    } catch (e: any) {
      console.error('addNumber exception:', e);
    }

    if (!newCall) {
      newCall = {
        id: `call-local-${Date.now()}`,
        phoneNumber: payload.phoneNumber,
        contactName: payload.contactName,
        status: 'Available',
        notes: payload.notes,
        createdAt: new Date().toISOString(),
        ownerAdminEmail: ownerAdminEmail,
        createdByEmail: currentUserEmail,
      };
    }

    setCallingData((prev) => {
      const updated = [newCall!, ...prev.filter((c) => c.id !== newCall!.id)];
      setLocalCache(localKey, updated);
      return updated;
    });

    return newCall;
  };

  const logCall = async (id: string, notes: string, outcome: string) => {
    try {
      await supabase.from('calling_data').update({ status: 'Called', notes: notes, updated_at: new Date().toISOString() }).eq('id', id);
    } catch { }
    setCallingData((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, status: 'Called' } : c));
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  return { callingData, loading, error, addNumber, logCall, refetch: fetchCallingData };
}
