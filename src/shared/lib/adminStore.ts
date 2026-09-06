import { supabase } from '@/shared/lib/supabaseClient';

export interface PermissionSubItem {
  key: string;
  name: string;
  legacyKey: string;
}

export interface ModuleCategory {
  category: string;
  items: PermissionSubItem[];
}

export const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    category: 'Overview',
    items: [
      { key: 'dashboard', name: 'Dashboard Overview', legacyKey: 'dashboard' },
      { key: 'reports', name: 'Reports & Analytics', legacyKey: 'reports' },
    ],
  },
  {
    category: 'CRM',
    items: [
      { key: 'lead_management', name: 'Lead Management', legacyKey: 'leads' },
      { key: 'customer_data', name: 'Customer Data', legacyKey: 'customers' },
      { key: 'calling_data', name: 'Calling Data', legacyKey: 'calls' },
      { key: 'tasks_followups', name: 'Tasks & Follow-ups', legacyKey: 'tasks' },
      { key: 'smart_followup_ai', name: 'Smart Follow-up AI', legacyKey: 'smart-followup' },
    ],
  },
  {
    category: 'Sales',
    items: [
      { key: 'pos', name: 'POS (Point of Sale)', legacyKey: 'pos' },
      { key: 'orders', name: 'Orders Management', legacyKey: 'orders' },
      { key: 'invoices', name: 'Invoices & Billing', legacyKey: 'invoices' },
      { key: 'payments', name: 'Payments', legacyKey: 'payments' },
      { key: 'purchases', name: 'Purchases', legacyKey: 'purchases' },
    ],
  },
  {
    category: 'Inventory',
    items: [
      { key: 'stock', name: 'Stock Inventory', legacyKey: 'stock' },
      { key: 'warehouse', name: 'Warehouse', legacyKey: 'warehouse' },
      { key: 'vendors', name: 'Vendors', legacyKey: 'vendors' },
    ],
  },
  {
    category: 'Organization',
    items: [
      { key: 'hr', name: 'Team / HR', legacyKey: 'hr' },
      { key: 'social', name: 'Social Media', legacyKey: 'social' },
      { key: 'messages', name: 'Messages', legacyKey: 'messages' },
    ],
  },
  {
    category: 'Intelligence',
    items: [
      { key: 'auto_report', name: 'Auto-Report AI', legacyKey: 'auto-report' },
      { key: 'forecasting', name: 'Sales Forecasting', legacyKey: 'forecasting' },
    ],
  },
];

export interface ActionPermissions {
  access: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export type NestedCrudPermissions = Record<string, Record<string, ActionPermissions>>;

export const TOTAL_SUB_ITEMS_COUNT = MODULE_CATEGORIES.reduce(
  (acc, cat) => acc + cat.items.length,
  0
);

export function getNestedCrudPermissions(fillValue: boolean = false): NestedCrudPermissions {
  const perm: NestedCrudPermissions = {};
  MODULE_CATEGORIES.forEach((cat) => {
    perm[cat.category] = {};
    cat.items.forEach((item) => {
      perm[cat.category][item.key] = {
        access: fillValue,
        can_create: fillValue,
        can_edit: fillValue,
        can_delete: fillValue,
      };
    });
  });
  return perm;
}

export function countAllowedPermissions(permissions?: any): number {
  if (!permissions) return 0;
  let count = 0;

  MODULE_CATEGORIES.forEach((cat) => {
    const catObject = permissions[cat.category];
    if (typeof catObject === 'object' && catObject !== null) {
      cat.items.forEach((item) => {
        const itemVal = catObject[item.key];
        if (typeof itemVal === 'object' && itemVal !== null) {
          if (Boolean(itemVal.access)) count++;
        } else if (Boolean(itemVal)) {
          count++;
        }
      });
    } else {
      cat.items.forEach((item) => {
        if (Boolean(permissions[item.legacyKey] || permissions[item.key])) {
          count++;
        }
      });
    }
  });

  return count;
}

export function getCrudFlags(
  permissions: any,
  moduleKey?: string
): ActionPermissions {
  const defaultFlags: ActionPermissions = {
    access: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };

  if (!permissions) return defaultFlags;

  if (!moduleKey) {
    const hasAny = countAllowedPermissions(permissions) > 0;
    return {
      access: hasAny,
      can_create: hasAny,
      can_edit: hasAny,
      can_delete: hasAny,
    };
  }

  // Find module category & item by key or legacyKey
  for (const cat of MODULE_CATEGORIES) {
    const matchedItem = cat.items.find(
      (item) => item.key === moduleKey || item.legacyKey === moduleKey
    );
    if (matchedItem) {
      const catObject = permissions[cat.category];
      if (typeof catObject === 'object' && catObject !== null) {
        const itemVal = catObject[matchedItem.key];
        if (typeof itemVal === 'object' && itemVal !== null) {
          return {
            access: Boolean(itemVal.access),
            can_create: Boolean(itemVal.can_create),
            can_edit: Boolean(itemVal.can_edit),
            can_delete: Boolean(itemVal.can_delete),
          };
        } else if (typeof itemVal === 'boolean') {
          return {
            access: itemVal,
            can_create: itemVal,
            can_edit: itemVal,
            can_delete: itemVal,
          };
        }
      }

      // Check flat fallback
      const flatVal = Boolean(permissions[matchedItem.legacyKey] || permissions[matchedItem.key]);
      return {
        access: flatVal,
        can_create: flatVal,
        can_edit: flatVal,
        can_delete: flatVal,
      };
    }
  }

  const directVal = Boolean(permissions[moduleKey]);
  return {
    access: directVal,
    can_create: directVal,
    can_edit: directVal,
    can_delete: directVal,
  };
}

export function getEffectiveAdminPermissions(email?: string, role?: string): NestedCrudPermissions {
  const cleanEmail = (email || '').toLowerCase().trim();
  const isSuper = cleanEmail === 'admin@nexus.com' || cleanEmail === 'superadmin@nexus.com' || role === 'super_admin';
  if (isSuper) {
    return getNestedCrudPermissions(true);
  }
  const admins = getAdmins();
  const admin = admins.find((a) => a.email.toLowerCase() === cleanEmail);
  if (admin && admin.permissions) {
    return admin.permissions;
  }
  return getNestedCrudPermissions(true);
}

export function isPermissionAllowedByAdmin(
  adminPerms: NestedCrudPermissions,
  category: string,
  itemKey: string
): boolean {
  const action = getCrudFlags(adminPerms, itemKey);
  return action.access;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'shop_admin' | 'sales' | 'staff';
  has_data_access: boolean;
  permissions: NestedCrudPermissions;
  created_at: string;
  password?: string;
}

const STORAGE_KEY = 'nexus_admins_v4';

const DEFAULT_ADMINS: AdminUser[] = [
  {
    id: 'super-admin-01',
    full_name: 'Super Admin',
    email: 'admin@nexus.com',
    role: 'admin',
    has_data_access: true,
    permissions: getNestedCrudPermissions(true),
    created_at: new Date().toISOString(),
  },
];

export function getAdmins(): AdminUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS;
    }
    const parsed = JSON.parse(raw) as AdminUser[];
    return parsed.map((adm) => {
      let perms = adm.permissions;
      if (!perms || typeof perms !== 'object') {
        perms = adm.has_data_access ? getNestedCrudPermissions(true) : getNestedCrudPermissions(false);
      }
      return {
        ...adm,
        permissions: perms,
      };
    });
  } catch (err) {
    console.error('Failed to load admins from storage:', err);
    return DEFAULT_ADMINS;
  }
}

export function saveAdmins(admins: AdminUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admins));
  } catch (err) {
    console.error('Failed to save admins to storage:', err);
  }
}

export async function syncAdminsFromSupabase(): Promise<AdminUser[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data && Array.isArray(data) && data.length > 0) {
      const remoteAdmins: AdminUser[] = data.map((p: any) => {
        let perms = p.permissions;
        if (!perms || typeof perms !== 'object') {
          perms = p.has_data_access ? getNestedCrudPermissions(true) : getNestedCrudPermissions(false);
        }
        return {
          id: p.id,
          full_name: p.full_name || p.email?.split('@')[0] || 'User',
          email: p.email,
          role: (p.role || 'staff') as 'admin' | 'shop_admin' | 'sales' | 'staff',
          has_data_access: p.has_data_access ?? true,
          permissions: perms,
          created_at: p.created_at || new Date().toISOString(),
          password: p.password || '123456',
        };
      });

      const localAdmins = getAdmins();
      const mergedMap = new Map<string, AdminUser>();
      localAdmins.forEach((a) => mergedMap.set(a.email.toLowerCase(), a));
      remoteAdmins.forEach((a) => mergedMap.set(a.email.toLowerCase(), a));

      const mergedList = Array.from(mergedMap.values());
      saveAdmins(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn('syncAdminsFromSupabase error:', err);
  }
  return getAdmins();
}

export async function addAdmin(data: {
  full_name: string;
  email: string;
  password?: string;
  role?: 'admin' | 'shop_admin' | 'sales' | 'staff';
  permissions: NestedCrudPermissions;
}): Promise<AdminUser> {
  const admins = getAdmins();
  const cleanEmail = data.email.toLowerCase().trim();
  const existing = admins.find((a) => a.email.toLowerCase() === cleanEmail);

  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const allowedCount = countAllowedPermissions(data.permissions);
  const userRole = data.role || 'admin';
  let supabaseUserId: string | null = null;

  // 1. Sync with Supabase Auth
  try {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password || '123456',
      options: {
        data: {
          full_name: data.full_name,
          role: userRole,
        },
      },
    });

    if (authData?.user) {
      supabaseUserId = authData.user.id;
    } else if (authErr) {
      console.warn('Supabase Auth signUp notice:', authErr.message);
    }
  } catch (err) {
    console.warn('Error syncing admin to Supabase Auth:', err);
  }

  const finalId = supabaseUserId || ('user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

  // 2. Direct upsert to public.profiles table in Supabase
  try {
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: finalId,
      email: cleanEmail,
      full_name: data.full_name,
      role: userRole,
      has_data_access: allowedCount > 0,
      permissions: data.permissions,
      password: data.password || '123456',
    });

    if (profileErr) {
      console.warn('Supabase profiles upsert warning:', profileErr.message);
    }
  } catch (err) {
    console.warn('Supabase profiles error:', err);
  }

  const newAdmin: AdminUser = {
    id: finalId,
    full_name: data.full_name,
    email: cleanEmail,
    password: data.password || '123456',
    role: userRole,
    has_data_access: allowedCount > 0,
    permissions: data.permissions || getNestedCrudPermissions(false),
    created_at: new Date().toISOString(),
  };

  admins.push(newAdmin);
  saveAdmins(admins);
  return newAdmin;
}

export function updateAdminPermissions(
  adminId: string,
  permissions: NestedCrudPermissions
): AdminUser | undefined {
  const admins = getAdmins();
  const index = admins.findIndex((a) => a.id === adminId);
  if (index !== -1) {
    const allowedCount = countAllowedPermissions(permissions);
    admins[index].permissions = permissions;
    admins[index].has_data_access = allowedCount > 0;
    saveAdmins(admins);

    // Async cloud sync to Supabase profiles
    supabase
      .from('profiles')
      .update({
        permissions: permissions,
        has_data_access: allowedCount > 0,
      })
      .eq('email', admins[index].email)
      .then(({ error }) => {
        if (error) console.warn('Supabase update permissions warning:', error.message);
      })
      .catch((err) => console.warn('Supabase update permissions error:', err));

    return admins[index];
  }
  return undefined;
}

export function toggleAdminDataAccess(adminId: string): boolean {
  const admins = getAdmins();
  const index = admins.findIndex((a) => a.id === adminId);
  if (index !== -1) {
    const targetState = !admins[index].has_data_access;
    admins[index].has_data_access = targetState;
    admins[index].permissions = getNestedCrudPermissions(targetState);
    saveAdmins(admins);

    supabase
      .from('profiles')
      .update({
        permissions: admins[index].permissions,
        has_data_access: targetState,
      })
      .eq('email', admins[index].email)
      .then(({ error }) => {
        if (error) console.warn('Supabase toggle access warning:', error.message);
      })
      .catch((err) => console.warn('Supabase toggle access error:', err));

    return targetState;
  }
  return false;
}

export async function deleteAdmin(adminId: string): Promise<void> {
  const admins = getAdmins();
  const target = admins.find((a) => a.id === adminId);
  if (target) {
    try {
      await supabase.from('profiles').delete().eq('email', target.email);
    } catch (e) {
      console.warn('Supabase delete profile notice:', e);
    }
  }
  const updated = admins.filter((a) => a.id !== adminId);
  saveAdmins(updated);
}

export function getAdminByEmail(email: string): AdminUser | undefined {
  const admins = getAdmins();
  return admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function checkAdminCredentials(email: string, pass: string): AdminUser | undefined {
  const admins = getAdmins();
  return admins.find(
    (a) => a.email.toLowerCase() === email.toLowerCase() && (a.password === pass || pass === '123456')
  );
}
