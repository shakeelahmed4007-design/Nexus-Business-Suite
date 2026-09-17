/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/context/AuthContext';
import { getOwnerAdminEmail, getAdmins } from '@/shared/lib/adminStore';

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
  assignedToName?: string;
  assignedToEmail?: string;
  ownerAdminEmail?: string;
  createdByEmail?: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
}

const DEFAULT_SHOP_UUID = '3c337fc4-48ba-4835-a7b2-93987afe55be';
const DEFAULT_USER_UUID = '01a2e7c8-6a06-4085-9e3f-5fbcd6138a59';

function getSafeUuid(val: any, fallback: string): string {
  if (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return val;
  }
  return fallback;
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
// POS-CRM AUTO SYNC HELPER
// -----------------------------------------------------------------------------
export interface PosCrmSyncPayload {
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  total_amount: number;
  items_summary?: string;
}

export async function syncPosCheckoutToCrm(payload: PosCrmSyncPayload) {
  const shopId = payload.shop_id || 'admin@nexus.com';
  const cleanPhone = payload.customer_phone.trim();
  if (!cleanPhone) return;

  const parts = payload.customer_name.trim().split(' ');
  const firstName = parts[0] || 'POS';
  const lastName = parts.slice(1).join(' ') || 'Customer';

  try {
    // 1. Check if customer exists in Supabase
    const { data: existingCust } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle();

    if (existingCust) {
      const prevSpent = Number(existingCust.lifetime_value || existingCust.total_spent || 0);
      const prevOrders = Number(existingCust.total_purchases || existingCust.total_orders || 1);
      const newOrders = prevOrders + 1;
      const newSpent = prevSpent + payload.total_amount;
      const avgValue = Math.round(newSpent / newOrders);
      const isHighValue = newSpent >= 50000;

      await supabase
        .from('customers')
        .update({
          total_purchases: newOrders,
          total_orders: newOrders,
          lifetime_value: newSpent,
          total_spent: newSpent,
          average_order_value: avgValue,
          last_purchase_date: new Date().toISOString(),
          is_high_value: isHighValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCust.id);

      try {
        await supabase.from('pos_customer_purchases').insert({
          shop_id: shopId,
          customer_id: existingCust.id,
          customer_phone: cleanPhone,
          customer_name: payload.customer_name,
          customer_email: payload.customer_email || null,
          customer_address: payload.customer_address || null,
          order_amount: payload.total_amount,
          items_summary: payload.items_summary || null,
          channel: 'POS',
        });
      } catch (e) { }

      // Check if lead exists, update value if lead exists
      try {
        const { data: leadMatch } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (leadMatch) {
          await supabase.from('leads').update({
            lead_value: newSpent,
            notes: `POS Purchase added: ${payload.items_summary || ''}`,
            updated_at: new Date().toISOString(),
          }).eq('id', leadMatch.id);
        }
      } catch (e) { }

    } else {
      // 2. Create new customer
      const isHighValue = payload.total_amount >= 50000;
      const safeShopUuid = getSafeUuid(shopId, DEFAULT_SHOP_UUID);

      const { data: newCust } = await supabase
        .from('customers')
        .insert({
          shop_id: safeShopUuid,
          first_name: firstName,
          last_name: lastName,
          phone: cleanPhone,
          email: payload.customer_email || null,
          city: payload.customer_address || null,
          customer_type: 'Regular',
          total_orders: 1,
          total_purchases: 1,
          total_spent: payload.total_amount,
          lifetime_value: payload.total_amount,
          average_order_value: payload.total_amount,
          last_purchase_date: new Date().toISOString(),
          is_high_value: isHighValue,
          customer_source: 'POS',
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      const customerId = newCust?.id;

      try {
        await supabase.from('pos_customer_purchases').insert({
          shop_id: shopId,
          customer_id: customerId,
          customer_phone: cleanPhone,
          customer_name: payload.customer_name,
          customer_email: payload.customer_email || null,
          customer_address: payload.customer_address || null,
          order_amount: payload.total_amount,
          items_summary: payload.items_summary || null,
          channel: 'POS',
        });
      } catch (e) { }

      // Auto-create initial Lead in CRM leads table
      try {
        await supabase.from('leads').insert({
          shop_id: safeShopUuid,
          first_name: firstName,
          last_name: lastName,
          phone: cleanPhone,
          email: payload.customer_email || null,
          lead_source: 'POS Purchase',
          lead_status: 'New',
          lead_value: payload.total_amount,
          notes: `Created from POS purchase: ${payload.items_summary || 'Order completed'}`,
        });
      } catch (e) { }
    }
  } catch (err) {
    console.warn('syncPosCheckoutToCrm notice:', err);
  }
}

// -----------------------------------------------------------------------------
// INITIAL DEMO DATA FOR FALLBACK
// -----------------------------------------------------------------------------
const DEMO_LEADS: ApiLead[] = [];
const DEMO_CUSTOMERS: ApiCustomer[] = [];

const DEMO_TASKS: ApiTask[] = [];
const DEMO_CALLING: ApiCallingData[] = [];

// Helper to format lead row from Supabase
function formatLeadRow(row: any, fallbackOwner?: string): ApiLead {
  const defaultOwner = fallbackOwner || 'admin@nexus.com';
  return {
    id: row.id,
    shopId: row.shop_id,
    createdById: row.created_by_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || defaultOwner,
    createdByEmail: row.created_by_email || defaultOwner,
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
function formatCustomerRow(row: any, fallbackOwner?: string): ApiCustomer {
  const type = row.customer_type || 'Regular';
  const defaultOwner = fallbackOwner || 'admin@nexus.com';
  return {
    id: row.id,
    shopId: row.shop_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || defaultOwner,
    createdByEmail: row.created_by_email || defaultOwner,
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
function formatTaskRow(row: any, fallbackOwner?: string): ApiTask {
  const st = row.status || row.task_type || 'Not Started';
  const defaultOwner = fallbackOwner || 'admin@nexus.com';
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    taskStatus: st,
    status: st,
    priority: row.priority || 'Medium',
    dueDate: row.due_date || new Date().toISOString(),
    assignedToUserId: row.assigned_to_user_id,
    ownerAdminEmail: row.owner_admin_email || row.created_by_email || defaultOwner,
    createdByEmail: row.created_by_email || defaultOwner,
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
    assignedToUserId: row.assigned_to_user_id || row.assignedToUserId,
    assignedToName: row.assigned_to_name || row.assignedToName,
    assignedToEmail: row.assigned_to_email || row.assignedToEmail,
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

// -----------------------------------------------------------------------------
// CALLING DATA SYNC HELPERS
// -----------------------------------------------------------------------------
function getCallingLeadsAsApiLeads(ownerAdminEmail: string, isSuperAdmin: boolean = false, hasExplicitAccess: boolean = false): ApiLead[] {
  try {
    const raw = localStorage.getItem('nexus_crm_leads_from_calls_v2');
    if (!raw) return [];
    const callingLeads: any[] = JSON.parse(raw);
    if (!Array.isArray(callingLeads)) return [];

    const filtered = callingLeads.filter((l) => {
      const leadAdmin = (l.adminEmail || l.ownerAdminEmail || '').toLowerCase().trim();
      const isSuperLead = !leadAdmin || leadAdmin === 'admin@nexus.com' || leadAdmin === 'superadmin@nexus.com';

      if (isSuperAdmin) return isSuperLead;
      if (hasExplicitAccess) return true;
      if (isSuperLead) return false;
      return leadAdmin === ownerAdminEmail;
    });

    return filtered.map((l) => {
      const rawName = (l.name || 'Calling Lead').replace(/\s*\(\d+\)$/, '').trim();
      const parts = rawName.split(' ');
      const firstName = parts[0] || 'Calling';
      const lastName = parts.slice(1).join(' ') || 'Lead';

      let leadStatus = 'New';
      if (l.status === 'Trial') leadStatus = 'Qualified';
      else if (l.status === 'Sales') leadStatus = 'Won';
      else if (l.status === 'Denied') leadStatus = 'Lost';
      else if (l.status === 'Renewal') leadStatus = 'Won';
      else if (l.status === 'Lead') leadStatus = 'Contacted';
      else leadStatus = 'New';

      const leadValue = l.saleAmount || (l.status === 'Trial' ? 25000 : l.status === 'Sales' || l.status === 'Renewal' ? 50000 : 15000);

      return {
        id: `call-lead-${l.id}`,
        shopId: 'shop-1',
        ownerAdminEmail: ownerAdminEmail,
        createdByEmail: l.agentName ? `${l.agentName.toLowerCase().replace(/[^a-z0-9]/g, '')}@nexus.com` : 'admin@nexus.com',
        firstName,
        lastName,
        email: `${(l.phone || '').replace(/[^0-9]/g, '')}@client.com`,
        phone: l.phone || '',
        companyName: `Agent: ${l.agentName || 'Sales Agent'}`,
        leadSource: l.source || 'Calling Data',
        leadStatus,
        leadValue,
        priority: l.status === 'Trial' || l.status === 'Sales' ? 'High' : 'Medium',
        notes: l.notes || `Created via calling system by ${l.agentName || 'Agent'}`,
        createdAt: l.createdDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  } catch (e) {
    return [];
  }
}

function getCallingSalesAsApiCustomers(ownerAdminEmail: string, isSuperAdmin: boolean = false, hasExplicitAccess: boolean = false): ApiCustomer[] {
  try {
    const raw = localStorage.getItem('nexus_crm_leads_from_calls_v2');
    if (!raw) return [];
    const callingLeads: any[] = JSON.parse(raw);
    if (!Array.isArray(callingLeads)) return [];

    const filtered = callingLeads.filter((l) => {
      if (l.status !== 'Sales' && l.status !== 'Renewal') return false;
      const leadAdmin = (l.adminEmail || l.ownerAdminEmail || '').toLowerCase().trim();
      const isSuperLead = !leadAdmin || leadAdmin === 'admin@nexus.com' || leadAdmin === 'superadmin@nexus.com';

      if (isSuperAdmin) return isSuperLead;
      if (hasExplicitAccess) return true;
      if (isSuperLead) return false;
      return leadAdmin === ownerAdminEmail;
    });

    return filtered.map((l) => {
      const rawName = (l.name || 'Sales Customer').replace(/\s*\(\d+\)$/, '').trim();
      const parts = rawName.split(' ');
      const firstName = parts[0] || 'Sales';
      const lastName = parts.slice(1).join(' ') || 'Customer';

      return {
        id: `call-cust-${l.id}`,
        shopId: 'shop-1',
        ownerAdminEmail: ownerAdminEmail,
        createdByEmail: l.agentName ? `${l.agentName.toLowerCase().replace(/[^a-z0-9]/g, '')}@nexus.com` : 'admin@nexus.com',
        firstName,
        lastName,
        email: `${(l.phone || '').replace(/[^0-9]/g, '')}@client.com`,
        phone: l.phone || '',
        companyName: `Agent: ${l.agentName || 'Sales Agent'}`,
        city: 'Karachi',
        customerType: l.status === 'Renewal' ? 'VIP' : 'Regular',
        tags: ['Calling Converted', l.status === 'Renewal' ? 'Renewal' : 'Sale Won'],
        totalOrders: 1,
        totalSpent: l.saleAmount || 50000,
        createdAt: l.saleDate || l.createdDate || new Date().toISOString(),
      };
    });
  } catch (e) {
    return [];
  }
}


// -----------------------------------------------------------------------------
// LEADS HOOK
// -----------------------------------------------------------------------------
export function useLeads() {
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role).toLowerCase().trim();
  const localKey = `nexus_crm_leads_${ownerAdminEmail}`;
  const isSuperAdmin = currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || profile?.role === 'super_admin';
  const allAdmins = getAdmins();
  const currentAdminProfile = allAdmins.find(a => (a.email || '').toLowerCase().trim() === currentUserEmail);
  const hasExplicitAccess = isSuperAdmin || (currentAdminProfile?.grant_super_admin_data_access === true);
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const filterByWorkspace = useCallback((items: ApiLead[]): ApiLead[] => {
    if (isSuperAdminWorkspace) return items;
    return items.filter((item) => {
      const itemOwner = (item.ownerAdminEmail || item.createdByEmail || '').toLowerCase().trim();
      return !itemOwner || itemOwner === ownerAdminEmail || itemOwner === 'admin@nexus.com';
    });
  }, [ownerAdminEmail, isSuperAdminWorkspace]);

  const [leads, setLeads] = useState<ApiLead[]>(() => {
    const cached = getLocalCache<ApiLead[]>(localKey, []);
    const initialFallback = isSuperAdminWorkspace ? DEMO_LEADS : [];
    const base = cached.length > 0 ? cached : initialFallback;
    const scoped = filterByWorkspace(base);
    const callingLeads = getCallingLeadsAsApiLeads(ownerAdminEmail, isSuperAdmin, hasExplicitAccess);
    const existingPhones = new Set(scoped.map((l) => (l.phone || '').replace(/[^0-9]/g, '')));
    const uniqueCalling = callingLeads.filter((cl) => {
      const p = (cl.phone || '').replace(/[^0-9]/g, '');
      return !p || !existingPhones.has(p);
    });
    return [...scoped, ...uniqueCalling];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    let baseLeads: ApiLead[] = [];
    try {
      const { data, error: sbErr } = await supabase
        .from('leads')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(data) && data.length > 0) {
        const formatted = data.map((r) => formatLeadRow(r, ownerAdminEmail));
        baseLeads = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_LEADS : []);
      } else {
        baseLeads = getLocalCache<ApiLead[]>(localKey, isSuperAdminWorkspace ? DEMO_LEADS : []);
      }
    } catch (err: any) {
      baseLeads = getLocalCache<ApiLead[]>(localKey, isSuperAdminWorkspace ? DEMO_LEADS : []);
    }

    const scoped = filterByWorkspace(baseLeads);
    const callingLeads = getCallingLeadsAsApiLeads(ownerAdminEmail, isSuperAdmin, hasExplicitAccess);
    const existingPhones = new Set(scoped.map((l) => (l.phone || '').replace(/[^0-9]/g, '')));
    const uniqueCalling = callingLeads.filter((cl) => {
      const p = (cl.phone || '').replace(/[^0-9]/g, '');
      return !p || !existingPhones.has(p);
    });

    const mergedAll = [...scoped, ...uniqueCalling];
    setLeads(mergedAll);
    if (mergedAll.length > 0) {
      setLocalCache(localKey, mergedAll);
    }
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace, filterByWorkspace, ownerAdminEmail, isSuperAdmin, hasExplicitAccess]);

  useEffect(() => {
    fetchLeads();
    const handleSync = () => fetchLeads();
    window.addEventListener('nexus_crm_calling_data_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('nexus_crm_calling_data_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchLeads]);

  const createLead = async (payload: CreateLeadPayload) => {
    let newLead: ApiLead | null = null;
    const rawShopId = (user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id;
    const rawUserId = user?.id || profile?.id;
    const shopId = (rawShopId && String(rawShopId).length === 36) ? rawShopId : null;
    const userId = (rawUserId && String(rawUserId).length === 36) ? rawUserId : null;

    try {
      const insertPayload: any = {
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
      };

      if (shopId) insertPayload.shop_id = shopId;
      if (userId) {
        insertPayload.created_by_id = userId;
        insertPayload.assigned_to_user_id = userId;
      }

      const { data, error: sbErr } = await supabase
        .from('leads')
        .insert(insertPayload)
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
      if (getSafeUuid(id, '') === id) {
        await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      }
    } catch { }
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      if (getSafeUuid(id, '') === id) {
        await supabase.from('leads').update({ lead_status: status, updated_at: new Date().toISOString() }).eq('id', id);
      }
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
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role).toLowerCase().trim();
  const localKey = `nexus_crm_customers_${ownerAdminEmail}`;
  const isSuperAdmin = currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || profile?.role === 'super_admin';
  const allAdmins = getAdmins();
  const currentAdminProfile = allAdmins.find(a => (a.email || '').toLowerCase().trim() === currentUserEmail);
  const hasExplicitAccess = isSuperAdmin || (currentAdminProfile?.grant_super_admin_data_access === true);
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const filterByWorkspace = useCallback((items: ApiCustomer[]): ApiCustomer[] => {
    if (isSuperAdminWorkspace) return items;
    return items.filter((item) => {
      const itemOwner = (item.ownerAdminEmail || item.createdByEmail || '').toLowerCase().trim();
      return !itemOwner || itemOwner === ownerAdminEmail || itemOwner === 'admin@nexus.com';
    });
  }, [ownerAdminEmail, isSuperAdminWorkspace]);

  const [customers, setCustomers] = useState<ApiCustomer[]>(() => {
    const cached = getLocalCache<ApiCustomer[]>(localKey, []);
    const initialFallback = isSuperAdminWorkspace ? DEMO_CUSTOMERS : [];
    const base = cached.length > 0 ? cached : initialFallback;
    const scoped = filterByWorkspace(base);
    const callingCust = getCallingSalesAsApiCustomers(ownerAdminEmail, isSuperAdmin, hasExplicitAccess);
    const existingPhones = new Set(scoped.map((c) => (c.phone || '').replace(/[^0-9]/g, '')));
    const uniqueCalling = callingCust.filter((cc) => {
      const p = (cc.phone || '').replace(/[^0-9]/g, '');
      return !p || !existingPhones.has(p);
    });
    return [...scoped, ...uniqueCalling];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    let baseCustomers: ApiCustomer[] = [];
    try {
      const { data, error: sbErr } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(data) && data.length > 0) {
        const formatted = data.map((r) => formatCustomerRow(r, ownerAdminEmail));
        baseCustomers = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_CUSTOMERS : []);
      } else {
        baseCustomers = getLocalCache<ApiCustomer[]>(localKey, isSuperAdminWorkspace ? DEMO_CUSTOMERS : []);
      }
    } catch (err: any) {
      baseCustomers = getLocalCache<ApiCustomer[]>(localKey, isSuperAdminWorkspace ? DEMO_CUSTOMERS : []);
    }

    const scoped = filterByWorkspace(baseCustomers);
    const callingCustomers = getCallingSalesAsApiCustomers(ownerAdminEmail, isSuperAdmin, hasExplicitAccess);
    const existingPhones = new Set(scoped.map((c) => (c.phone || '').replace(/[^0-9]/g, '')));
    const uniqueCalling = callingCustomers.filter((cc) => {
      const p = (cc.phone || '').replace(/[^0-9]/g, '');
      return !p || !existingPhones.has(p);
    });

    const mergedAll = [...scoped, ...uniqueCalling];
    setCustomers(mergedAll);
    if (mergedAll.length > 0) {
      setLocalCache(localKey, mergedAll);
    }
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace, filterByWorkspace, ownerAdminEmail, isSuperAdmin, hasExplicitAccess]);

  useEffect(() => {
    fetchCustomers();
    const handleSync = () => fetchCustomers();
    window.addEventListener('nexus_crm_calling_data_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('nexus_crm_calling_data_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchCustomers]);

  const createCustomer = async (payload: CreateCustomerPayload) => {
    let newCustomer: ApiCustomer | null = null;
    const rawShopId = (user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id;
    const rawUserId = user?.id || profile?.id;
    const shopId = (rawShopId && String(rawShopId).length === 36) ? rawShopId : null;
    const userId = (rawUserId && String(rawUserId).length === 36) ? rawUserId : null;

    try {
      const insertPayload: any = {
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        company_name: payload.companyName || null,
        city: payload.city || null,
        customer_type: payload.customerType || 'Regular',
        notes: payload.notes || null,
      };

      if (shopId) insertPayload.shop_id = shopId;
      if (userId) insertPayload.created_by_id = userId;

      const { data, error: sbErr } = await supabase
        .from('customers')
        .insert(insertPayload)
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
      if (getSafeUuid(id, '') === id) {
        await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      }
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
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role).toLowerCase().trim();
  const localKey = `nexus_crm_tasks_${ownerAdminEmail}`;
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const filterByWorkspace = useCallback((items: ApiTask[]): ApiTask[] => {
    if (isSuperAdminWorkspace) return items;
    return items.filter((item) => {
      const itemOwner = (item.ownerAdminEmail || item.createdByEmail || '').toLowerCase().trim();
      return !itemOwner || itemOwner === ownerAdminEmail || itemOwner === 'admin@nexus.com';
    });
  }, [ownerAdminEmail, isSuperAdminWorkspace]);

  const [tasks, setTasks] = useState<ApiTask[]>(() => {
    const cached = getLocalCache<ApiTask[]>(localKey, []);
    const initialFallback = isSuperAdminWorkspace ? DEMO_TASKS : [];
    const merged = cached.length > 0 ? cached : initialFallback;
    return filterByWorkspace(merged);
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
        const formatted = data.map((r) => formatTaskRow(r, ownerAdminEmail));
        const merged = mergeWithLocal(formatted, localKey, isSuperAdminWorkspace ? DEMO_TASKS : []);
        const scoped = filterByWorkspace(merged);
        setTasks(scoped);
        if (scoped.length > 0) {
          setLocalCache(localKey, scoped);
        }
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('fetchTasks notice:', err);
    }

    const cached = getLocalCache<ApiTask[]>(localKey, isSuperAdminWorkspace ? DEMO_TASKS : []);
    const scoped = filterByWorkspace(cached);
    setTasks(scoped);
    if (scoped.length > 0) {
      setLocalCache(localKey, scoped);
    }
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace, filterByWorkspace, ownerAdminEmail]);

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
      if (getSafeUuid(id, '') === id) {
        await supabase.from('tasks').update({ status: 'Completed', completion_date: new Date().toISOString() }).eq('id', id);
      }
    } catch { }
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, taskStatus: 'Completed', status: 'Completed' } : t));
      setLocalCache(localKey, updated);
      return updated;
    });
  };

  const deleteTask = async (id: string) => {
    try {
      if (getSafeUuid(id, '') === id) {
        await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      }
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
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role).toLowerCase().trim();
  const localKey = `nexus_crm_calling_${ownerAdminEmail}`;
  const isSuperAdminWorkspace = ownerAdminEmail === 'admin@nexus.com';

  const filterByWorkspace = useCallback((items: ApiCallingData[]): ApiCallingData[] => {
    return items.filter((item) => {
      const itemOwner = (item.ownerAdminEmail || item.createdByEmail || 'admin@nexus.com').toLowerCase().trim();
      return itemOwner === ownerAdminEmail;
    });
  }, [ownerAdminEmail]);

  const [callingData, setCallingData] = useState<ApiCallingData[]>(() => {
    const cached = getLocalCache<ApiCallingData[]>(localKey, []);
    const initialFallback = isSuperAdminWorkspace ? DEMO_CALLING : [];
    const merged = cached.length > 0 ? cached : initialFallback;
    return filterByWorkspace(merged);
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
        const scoped = filterByWorkspace(merged);
        setCallingData(scoped);
        setLocalCache(localKey, scoped);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('fetchCallingData notice:', err);
    }

    const cached = getLocalCache<ApiCallingData[]>(localKey, isSuperAdminWorkspace ? DEMO_CALLING : []);
    const scoped = filterByWorkspace(cached);
    setCallingData(scoped);
    setLocalCache(localKey, scoped);
    setLoading(false);
  }, [localKey, isSuperAdminWorkspace, filterByWorkspace]);

  useEffect(() => { fetchCallingData(); }, [fetchCallingData]);

  const addNumber = async (payload: {
    phoneNumber: string;
    contactName?: string;
    notes?: string;
    assignedToUserId?: string;
    assignedToName?: string;
    assignedToEmail?: string;
  }) => {
    let newCall: ApiCallingData | null = null;
    const shopId = getSafeUuid((user?.user_metadata as any)?.shop_id || (profile as any)?.shop_id, DEFAULT_SHOP_UUID);
    const userId = getSafeUuid(user?.id || profile?.id, DEFAULT_USER_UUID);
    const initialStatus = payload.assignedToUserId ? 'Assigned' : 'Available';

    try {
      const { data, error: sbErr } = await supabase
        .from('calling_data')
        .insert({
          shop_id: shopId,
          created_by_id: userId,
          phone_number: payload.phoneNumber.trim(),
          status: initialStatus,
          assigned_to_user_id: payload.assignedToUserId || null,
          assigned_to_name: payload.assignedToName || null,
          assigned_to_email: payload.assignedToEmail || null,
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
        status: initialStatus,
        assignedToUserId: payload.assignedToUserId,
        assignedToName: payload.assignedToName,
        assignedToEmail: payload.assignedToEmail,
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

  const assignNumber = async (id: string, assignedTo: { id: string; name: string; email?: string } | null) => {
    const updatedStatus = assignedTo ? 'Assigned' : 'Available';
    const assignedUserId = assignedTo?.id || null;
    const assignedName = assignedTo?.name || null;
    const assignedEmail = assignedTo?.email || null;

    try {
      await supabase
        .from('calling_data')
        .update({
          status: updatedStatus,
          assigned_to_user_id: assignedUserId,
          assigned_to_name: assignedName,
          assigned_to_email: assignedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch { }

    setCallingData((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: updatedStatus,
            assignedToUserId: assignedUserId || undefined,
            assignedToName: assignedName || undefined,
            assignedToEmail: assignedEmail || undefined,
          };
        }
        return c;
      });
      setLocalCache(localKey, updated);
      return updated;
    });
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

  return { callingData, loading, error, addNumber, assignNumber, logCall, refetch: fetchCallingData };
}
