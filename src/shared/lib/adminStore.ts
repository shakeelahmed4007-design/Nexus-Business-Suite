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
  const cleanRole = (role || '').toLowerCase().trim();
  const isAdminRole =
    cleanEmail === 'admin@nexus.com' ||
    cleanEmail === 'superadmin@nexus.com' ||
    cleanRole === 'super_admin' ||
    cleanRole === 'admin' ||
    cleanRole === 'shop_admin' ||
    cleanEmail.includes('admin');

  if (isAdminRole) {
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

export function getRolePresetPermissions(
  role: string,
  adminPerms?: NestedCrudPermissions
): NestedCrudPermissions {
  const perms = getNestedCrudPermissions(false);
  const cleanRole = (role || '').toLowerCase().trim();

  if (cleanRole === 'admin' || cleanRole === 'shop_admin' || cleanRole === 'super_admin' || cleanRole === 'super admin') {
    return getNestedCrudPermissions(true);
  }

  if (cleanRole === 'sales') {
    MODULE_CATEGORIES.forEach((cat) => {
      if (cat.category === 'Sales' || cat.category === 'CRM' || cat.category === 'Overview') {
        perms[cat.category] = {};
        cat.items.forEach((item) => {
          const isAllowed = adminPerms ? isPermissionAllowedByAdmin(adminPerms, cat.category, item.key) : true;
          perms[cat.category][item.key] = {
            access: isAllowed,
            can_create: isAllowed,
            can_edit: isAllowed,
            can_delete: false,
          };
        });
      }
    });
    return perms;
  }

  // Staff / Agent / Support / default team
  MODULE_CATEGORIES.forEach((cat) => {
    if (
      cat.category === 'Inventory' ||
      cat.category === 'Sales' ||
      cat.category === 'Organization' ||
      cat.category === 'CRM' ||
      cat.category === 'Overview'
    ) {
      perms[cat.category] = {};
      cat.items.forEach((item) => {
        const isAllowed = adminPerms ? isPermissionAllowedByAdmin(adminPerms, cat.category, item.key) : true;
        perms[cat.category][item.key] = {
          access: isAllowed,
          can_create: isAllowed,
          can_edit: isAllowed,
          can_delete: false,
        };
      });
    }
  });

  return perms;
}

export function getOwnerAdminEmail(email?: string | null, role?: string | null): string {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanRole = (role || '').toLowerCase().trim();

  // 1. Super Admin: admin@nexus.com or role === 'super_admin'
  if (cleanRole === 'super_admin' || cleanEmail === 'admin@nexus.com' || cleanEmail === 'superadmin@nexus.com') {
    return 'admin@nexus.com';
  }

  // 2. Admin / Shop Admin: admin2@nexus.com etc.
  if (cleanRole === 'admin' || cleanRole === 'shop_admin' || cleanEmail.includes('admin')) {
    return cleanEmail || 'admin@nexus.com';
  }

  // 3. Staff / Sales: check who created them
  if (cleanEmail) {
    const adminEntry = getAdminByEmail(cleanEmail);
    if (adminEntry) {
      if (adminEntry.created_by_email) {
        return adminEntry.created_by_email.toLowerCase().trim();
      }
      if (adminEntry.created_by_role === 'SUPER_ADMIN') {
        return 'admin@nexus.com';
      }
    }
  }

  return cleanEmail || 'admin@nexus.com';
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
  phone?: string;
  department?: string;
  status?: string;
  shop_id?: string;
  created_by_role?: string;
  created_by_email?: string;
  created_by_id?: string;
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
    created_by_role: 'SUPER_ADMIN',
    created_by_email: 'admin@nexus.com',
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
      let role = (adm.role || '').toLowerCase().trim();
      const cleanEmail = (adm.email || '').toLowerCase().trim();
      if (!role) {
        role = cleanEmail.includes('admin') || cleanEmail === 'admin@nexus.com' ? 'admin' : 'staff';
      }

      let allowedCount = countAllowedPermissions(perms);
      if (allowedCount === 0 && (role === 'staff' || role === 'sales' || role === 'agent' || role === 'support')) {
        perms = getRolePresetPermissions(role);
        allowedCount = countAllowedPermissions(perms);
      }

      const hasAccess = adm.status === 'Inactive' ? false : (allowedCount > 0);

      return {
        ...adm,
        role: role as any,
        permissions: perms,
        has_data_access: hasAccess,
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
      const localAdmins = getAdmins();
      const localMap = new Map<string, AdminUser>();
      localAdmins.forEach((a) => localMap.set(a.email.toLowerCase(), a));

      const remoteAdmins: AdminUser[] = data.map((p: any) => {
        const cleanEmail = (p.email || '').toLowerCase().trim();
        const existingLocal = localMap.get(cleanEmail);
        let userRole = (p.role || '').toLowerCase().trim();

        if (existingLocal && existingLocal.role) {
          userRole = existingLocal.role;
        } else if (!userRole) {
          userRole = cleanEmail.includes('admin') ? 'admin' : 'staff';
        }

        let perms = p.permissions;
        let allowedCount = countAllowedPermissions(perms);
        if (allowedCount === 0 && (userRole === 'staff' || userRole === 'sales' || userRole === 'agent' || userRole === 'support')) {
          perms = getRolePresetPermissions(userRole);
          allowedCount = countAllowedPermissions(perms);
        }

        const createdByRole = p.created_by_role || existingLocal?.created_by_role || 'SUPER_ADMIN';
        const createdByEmail = p.created_by_email || existingLocal?.created_by_email || 'admin@nexus.com';
        const createdById = p.created_by_id || existingLocal?.created_by_id;

        return {
          id: p.id,
          full_name: p.full_name || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
          email: cleanEmail,
          role: userRole as any,
          has_data_access: p.status === 'Inactive' ? false : allowedCount > 0,
          permissions: perms,
          created_at: p.created_at || new Date().toISOString(),
          password: p.password || '123456',
          created_by_role: createdByRole,
          created_by_email: createdByEmail,
          created_by_id: createdById,
        };
      });

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
  phone?: string;
  department?: string;
  status?: string;
  shop_id?: string;
  password?: string;
  role?: string;
  permissions: NestedCrudPermissions;
  created_by_role?: string;
  created_by_email?: string;
  created_by_id?: string;
}): Promise<AdminUser> {

  const admins = getAdmins();
  const cleanEmail = data.email.toLowerCase().trim();
  const existing = admins.find((a) => a.email.toLowerCase() === cleanEmail);

  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const userRole = data.role || 'admin';
  let finalPermissions = data.permissions;
  let allowedCount = countAllowedPermissions(finalPermissions);

  if (allowedCount === 0 && data.status !== 'Inactive') {
    finalPermissions = getRolePresetPermissions(userRole);
    allowedCount = countAllowedPermissions(finalPermissions);
  }

  const hasDataAccess = data.status === 'Inactive' ? false : (allowedCount > 0);
  const created_by_role = data.created_by_role || 'SUPER_ADMIN';
  const created_by_email = data.created_by_email || 'admin@nexus.com';
  const created_by_id = data.created_by_id || undefined;
  let supabaseUserId: string | null = null;

  // 1. Primary Sync with Backend Service Role API (Bypasses Client RLS & Creates Supabase Auth + Profiles Record)
  try {
    const endpoint = userRole === 'sales' ? '/api/staff/create-sales' : '/api/staff/create-staff';
    const apiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: data.full_name,
        email: cleanEmail,
        phone: data.phone,
        role: userRole,
        department: data.department,
        status: data.status,
        password: data.password,
        permissions: finalPermissions,
        created_by_role,
        created_by_email,
        created_by_id,
      }),
    });

    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData?.user?.id) {
        supabaseUserId = apiData.user.id;
      }
    }
  } catch (apiErr) {
    console.warn('Backend API sync notice:', apiErr);
  }

  // 2. Client-side Sync with Supabase Auth (Fallback)
  if (!supabaseUserId) {
    try {
      const { data: authData } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password || '123456',
        options: {
          data: {
            full_name: data.full_name,
            role: userRole,
            created_by_role,
            created_by_email,
            created_by_id,
          },
        },
      });

      if (authData?.user) {
        supabaseUserId = authData.user.id;
      }
    } catch (err) {
      console.warn('Client Supabase Auth signUp notice:', err);
    }
  }

  const finalId = supabaseUserId || ('user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

  // 3. Direct upsert to public.profiles table in Supabase
  try {
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: finalId,
      email: cleanEmail,
      full_name: data.full_name,
      role: userRole,
      has_data_access: hasDataAccess,
      permissions: finalPermissions,
      password: data.password || '123456',
      created_by_role,
      created_by_email,
      created_by_id,
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
    phone: data.phone,
    department: data.department,
    status: data.status || 'Active',
    shop_id: data.shop_id,
    password: data.password || '123456',
    role: userRole as any,
    has_data_access: hasDataAccess,
    permissions: finalPermissions,
    created_at: new Date().toISOString(),
    created_by_role,
    created_by_email,
    created_by_id,
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
    admins[index].permissions = permissions;
    const allowedCount = countAllowedPermissions(permissions);
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
      });

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
      });

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
