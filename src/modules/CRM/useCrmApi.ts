/**
 * Centralized hook for CRM features (Leads, Customers, Tasks, Calling Data)
 * Connects to Node.js backend when available, and gracefully falls back to local state
 * if backend is offline or unreachable (e.g. deployed without backend endpoint).
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------
export interface ApiLead {
  id: string;
  shopId: string;
  createdById: string;
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
  shopId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  city?: string;
  customerType?: string;
  tags?: string[];
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
  notes?: string;
  expiresAt?: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: { total: number; page: number; pages: number };
}

// -----------------------------------------------------------------------------
// LOCAL STORAGE HELPERS (Fallback mode when backend is unreachable)
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
  } catch {}
}

// -----------------------------------------------------------------------------
// INITIAL DEMO DATA FOR OFFLINE / DEPLOYMENT DEMO
// -----------------------------------------------------------------------------
const DEMO_LEADS: ApiLead[] = [
  {
    id: 'lead-demo-1',
    shopId: 'shop-1',
    createdById: 'user-1',
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
    createdAt: new Date().toISOString(),
  },
];

// -----------------------------------------------------------------------------
// LEADS HOOK
// -----------------------------------------------------------------------------
export function useLeads() {
  const [leads, setLeads] = useState<ApiLead[]>(() => getLocalCache('nexus_crm_leads', DEMO_LEADS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiLead[]>>('/api/crm/leads');
      if (Array.isArray(res.data)) {
        setLeads(res.data);
        setLocalCache('nexus_crm_leads', res.data);
      }
    } catch (err: any) {
      // Fallback silently to local cache if network/backend failed
      const cached = getLocalCache<ApiLead[]>('nexus_crm_leads', DEMO_LEADS);
      setLeads(cached);
      if (!err.message?.includes('Failed to fetch') && !err.message?.includes('NetworkError')) {
        setError(err.message || 'Failed to load leads');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const createLead = async (payload: CreateLeadPayload) => {
    try {
      const res = await apiClient.post<ApiResponse<ApiLead>>('/api/crm/leads', payload);
      await fetchLeads();
      return res.data;
    } catch (err: any) {
      // Local fallback lead creation
      const newLead: ApiLead = {
        id: `lead-local-${Date.now()}`,
        shopId: 'shop-1',
        createdById: 'local-user',
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
      };
      const updated = [newLead, ...leads];
      setLeads(updated);
      setLocalCache('nexus_crm_leads', updated);
      return newLead;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await apiClient.delete(`/api/crm/leads/${id}`);
    } catch {}
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    setLocalCache('nexus_crm_leads', updated);
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/api/crm/leads/${id}/status`, { newStatus: status });
    } catch {}
    const updated = leads.map((l) => (l.id === id ? { ...l, leadStatus: status } : l));
    setLeads(updated);
    setLocalCache('nexus_crm_leads', updated);
  };

  return { leads, loading, error, createLead, deleteLead, updateLeadStatus, refetch: fetchLeads };
}

// -----------------------------------------------------------------------------
// CUSTOMERS HOOK
// -----------------------------------------------------------------------------
export function useCustomers() {
  const [customers, setCustomers] = useState<ApiCustomer[]>(() => getLocalCache('nexus_crm_customers', DEMO_CUSTOMERS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiCustomer[]>>('/api/crm/customers');
      if (Array.isArray(res.data)) {
        setCustomers(res.data);
        setLocalCache('nexus_crm_customers', res.data);
      }
    } catch (err: any) {
      const cached = getLocalCache<ApiCustomer[]>('nexus_crm_customers', DEMO_CUSTOMERS);
      setCustomers(cached);
      if (!err.message?.includes('Failed to fetch') && !err.message?.includes('NetworkError')) {
        setError(err.message || 'Failed to load customers');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const createCustomer = async (payload: CreateCustomerPayload) => {
    try {
      const res = await apiClient.post<ApiResponse<ApiCustomer>>('/api/crm/customers', payload);
      await fetchCustomers();
      return res.data;
    } catch (err: any) {
      const newCustomer: ApiCustomer = {
        id: `cust-local-${Date.now()}`,
        shopId: 'shop-1',
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        companyName: payload.companyName,
        city: payload.city,
        customerType: payload.customerType || 'Individual',
        createdAt: new Date().toISOString(),
      };
      const updated = [newCustomer, ...customers];
      setCustomers(updated);
      setLocalCache('nexus_crm_customers', updated);
      return newCustomer;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await apiClient.delete(`/api/crm/customers/${id}`);
    } catch {}
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    setLocalCache('nexus_crm_customers', updated);
  };

  return { customers, loading, error, createCustomer, deleteCustomer, refetch: fetchCustomers };
}

// -----------------------------------------------------------------------------
// TASKS HOOK
// -----------------------------------------------------------------------------
export function useTasks() {
  const [tasks, setTasks] = useState<ApiTask[]>(() => getLocalCache('nexus_crm_tasks', DEMO_TASKS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiTask[]>>('/api/crm/tasks');
      if (Array.isArray(res.data)) {
        setTasks(res.data);
        setLocalCache('nexus_crm_tasks', res.data);
      }
    } catch (err: any) {
      const cached = getLocalCache<ApiTask[]>('nexus_crm_tasks', DEMO_TASKS);
      setTasks(cached);
      if (!err.message?.includes('Failed to fetch') && !err.message?.includes('NetworkError')) {
        setError(err.message || 'Failed to load tasks');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (payload: CreateTaskPayload) => {
    try {
      const res = await apiClient.post<ApiResponse<ApiTask>>('/api/crm/tasks', payload);
      await fetchTasks();
      return res.data;
    } catch (err: any) {
      const newTask: ApiTask = {
        id: `task-local-${Date.now()}`,
        title: payload.title,
        description: payload.description,
        taskStatus: payload.taskStatus || 'Not Started',
        priority: payload.priority || 'Medium',
        dueDate: payload.dueDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newTask, ...tasks];
      setTasks(updated);
      setLocalCache('nexus_crm_tasks', updated);
      return newTask;
    }
  };

  const completeTask = async (id: string) => {
    try {
      await apiClient.put(`/api/crm/tasks/${id}/complete`, {});
    } catch {}
    const updated = tasks.map((t) => (t.id === id ? { ...t, taskStatus: 'Completed', status: 'Completed' } : t));
    setTasks(updated);
    setLocalCache('nexus_crm_tasks', updated);
  };

  const deleteTask = async (id: string) => {
    try {
      await apiClient.delete(`/api/crm/tasks/${id}`);
    } catch {}
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    setLocalCache('nexus_crm_tasks', updated);
  };

  return { tasks, loading, error, createTask, completeTask, deleteTask, refetch: fetchTasks };
}

// -----------------------------------------------------------------------------
// CALLING DATA HOOK
// -----------------------------------------------------------------------------
export function useCallingData() {
  const [callingData, setCallingData] = useState<ApiCallingData[]>(() => getLocalCache('nexus_crm_calling', DEMO_CALLING));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCallingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiCallingData[]>>('/api/crm/calling-data');
      if (Array.isArray(res.data)) {
        setCallingData(res.data);
        setLocalCache('nexus_crm_calling', res.data);
      }
    } catch (err: any) {
      const cached = getLocalCache<ApiCallingData[]>('nexus_crm_calling', DEMO_CALLING);
      setCallingData(cached);
      if (!err.message?.includes('Failed to fetch') && !err.message?.includes('NetworkError')) {
        setError(err.message || 'Failed to load calling data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCallingData(); }, [fetchCallingData]);

  const addNumber = async (payload: { phoneNumber: string; contactName?: string; notes?: string }) => {
    try {
      const res = await apiClient.post<ApiResponse<ApiCallingData>>('/api/crm/calling-data', payload);
      await fetchCallingData();
      return res.data;
    } catch (err: any) {
      const newCall: ApiCallingData = {
        id: `call-local-${Date.now()}`,
        phoneNumber: payload.phoneNumber,
        contactName: payload.contactName,
        status: 'Available',
        notes: payload.notes,
        createdAt: new Date().toISOString(),
      };
      const updated = [newCall, ...callingData];
      setCallingData(updated);
      setLocalCache('nexus_crm_calling', updated);
      return newCall;
    }
  };

  const logCall = async (id: string, notes: string, outcome: string) => {
    try {
      await apiClient.post(`/api/crm/calling-data/${id}/log-call`, { notes, outcome });
    } catch {}
    const updated = callingData.map((c) => (c.id === id ? { ...c, status: 'Called' } : c));
    setCallingData(updated);
    setLocalCache('nexus_crm_calling', updated);
  };

  return { callingData, loading, error, addNumber, logCall, refetch: fetchCallingData };
}
