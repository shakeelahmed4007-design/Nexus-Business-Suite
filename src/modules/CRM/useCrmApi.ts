/**
 * CRM API hooks - connects frontend pages to the Express backend.
 * Backend response format: { success: true, data: ... } for all endpoints.
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
  taskStatus: string;  // mapped from DB 'status' by backend formatTask
  status?: string;     // raw DB status fallback
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

// Backend wraps all responses in { success: true, data: ... }
interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: { total: number; page: number; pages: number };
}

// -----------------------------------------------------------------------------
// LEADS HOOK
// -----------------------------------------------------------------------------
export function useLeads() {
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiLead[]>>('/api/crm/leads');
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const createLead = async (payload: CreateLeadPayload) => {
    const res = await apiClient.post<ApiResponse<ApiLead>>('/api/crm/leads', payload);
    await fetchLeads();
    return res.data;
  };

  const deleteLead = async (id: string) => {
    await apiClient.delete(`/api/crm/leads/${id}`);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLeadStatus = async (id: string, status: string) => {
    // Controller expects: { newStatus: string }
    await apiClient.put(`/api/crm/leads/${id}/status`, { newStatus: status });
    await fetchLeads();
  };

  return { leads, loading, error, createLead, deleteLead, updateLeadStatus, refetch: fetchLeads };
}

// -----------------------------------------------------------------------------
// CUSTOMERS HOOK
// -----------------------------------------------------------------------------
export function useCustomers() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiCustomer[]>>('/api/crm/customers');
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const createCustomer = async (payload: CreateCustomerPayload) => {
    const res = await apiClient.post<ApiResponse<ApiCustomer>>('/api/crm/customers', payload);
    await fetchCustomers();
    return res.data;
  };

  const deleteCustomer = async (id: string) => {
    await apiClient.delete(`/api/crm/customers/${id}`);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  return { customers, loading, error, createCustomer, deleteCustomer, refetch: fetchCustomers };
}

// -----------------------------------------------------------------------------
// TASKS HOOK
// -----------------------------------------------------------------------------
export function useTasks() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiTask[]>>('/api/crm/tasks');
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (payload: CreateTaskPayload) => {
    const res = await apiClient.post<ApiResponse<ApiTask>>('/api/crm/tasks', payload);
    await fetchTasks();
    return res.data;
  };

  const completeTask = async (id: string) => {
    await apiClient.put(`/api/crm/tasks/${id}/complete`, {});
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await apiClient.delete(`/api/crm/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, loading, error, createTask, completeTask, deleteTask, refetch: fetchTasks };
}

// -----------------------------------------------------------------------------
// CALLING DATA HOOK
// -----------------------------------------------------------------------------
export function useCallingData() {
  const [callingData, setCallingData] = useState<ApiCallingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCallingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<ApiCallingData[]>>('/api/crm/calling-data');
      setCallingData(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load calling data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCallingData(); }, [fetchCallingData]);

  const addNumber = async (payload: { phoneNumber: string; contactName?: string; notes?: string }) => {
    const res = await apiClient.post<ApiResponse<ApiCallingData>>('/api/crm/calling-data', payload);
    await fetchCallingData();
    return res.data;
  };

  const logCall = async (id: string, notes: string, outcome: string) => {
    await apiClient.post(`/api/crm/calling-data/${id}/log-call`, { notes, outcome });
    await fetchCallingData();
  };

  return { callingData, loading, error, addNumber, logCall, refetch: fetchCallingData };
}
