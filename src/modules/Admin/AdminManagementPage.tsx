import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
  Users,
  Key,
  Mail,
  User,
  ShieldAlert,
  CheckSquare,
  Square,
  ChevronDown,
  Edit2,
  Check,
  FolderTree,
  ArrowLeft,
  X,
  PlusCircle,
  Pencil,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import {
  getAdmins,
  syncAdminsFromSupabase,
  addAdmin,
  updateAdminPermissions,
  toggleAdminDataAccess,
  deleteAdmin,
  MODULE_CATEGORIES,
  getNestedCrudPermissions,
  countAllowedPermissions,
  TOTAL_SUB_ITEMS_COUNT,
  NestedCrudPermissions,
  ActionPermissions,
  AdminUser,
} from '@/shared/lib/adminStore';

export function AdminManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>(
    tabParam === 'manage' ? 'manage' : 'add'
  );

  useEffect(() => {
    if (tabParam === 'manage') {
      setActiveTab('manage');
    } else if (tabParam === 'add') {
      setActiveTab('add');
    }
  }, [tabParam]);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<'admin' | 'shop_admin'>('admin');
  
  // Nested CRUD permissions state
  const [permissions, setPermissions] = useState<NestedCrudPermissions>(getNestedCrudPermissions(false));

  // Accordion open/collapse states for module categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Overview: true,
    CRM: true,
    Sales: true,
    Inventory: true,
    Organization: true,
    Intelligence: true,
  });

  // Edit access state for an existing admin
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<NestedCrudPermissions>(getNestedCrudPermissions(false));
  const [editingExpanded, setEditingExpanded] = useState<Record<string, boolean>>({
    Overview: true,
    CRM: true,
    Sales: true,
    Inventory: true,
    Organization: true,
    Intelligence: true,
  });

  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setAdminsList(getAdmins());
    syncAdminsFromSupabase().then((list) => setAdminsList(list));
  }, []);

  const refreshList = () => {
    setAdminsList(getAdmins());
    syncAdminsFromSupabase().then((list) => setAdminsList(list));
  };

  const handleToggleStatus = (adminId: string) => {
    const nextState = toggleAdminDataAccess(adminId);
    refreshList();
    setSuccessMsg(nextState ? 'Admin account activated successfully.' : 'Admin account deactivated successfully.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Global Select All / Deselect All
  const handleGlobalSelectAll = (checked: boolean) => {
    setPermissions(getNestedCrudPermissions(checked));
  };

  // Module-Level Select All for a specific category
  const handleCategorySelectAll = (categoryName: string, checked: boolean) => {
    setPermissions((prev) => {
      const updatedCat = { ...(prev[categoryName] || {}) };
      const catDef = MODULE_CATEGORIES.find((c) => c.category === categoryName);
      if (catDef) {
        catDef.items.forEach((item) => {
          updatedCat[item.key] = {
            access: checked,
            can_create: checked,
            can_edit: checked,
            can_delete: checked,
          };
        });
      }
      return {
        ...prev,
        [categoryName]: updatedCat,
      };
    });
  };

  // Toggle single action flag for a sub-item
  const handleToggleAction = (
    categoryName: string,
    itemKey: string,
    action: keyof ActionPermissions
  ) => {
    setPermissions((prev) => {
      const catObj = prev[categoryName] || {};
      const currentItem: ActionPermissions = catObj[itemKey] || {
        access: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };

      const newActionVal = !currentItem[action];
      let updatedItem = { ...currentItem, [action]: newActionVal };

      // If turning on create/edit/delete, ensure view access is also true
      if (action !== 'access' && newActionVal) {
        updatedItem.access = true;
      }
      // If turning off view access, turn off create/edit/delete as well
      if (action === 'access' && !newActionVal) {
        updatedItem.can_create = false;
        updatedItem.can_edit = false;
        updatedItem.can_delete = false;
      }

      return {
        ...prev,
        [categoryName]: {
          ...catObj,
          [itemKey]: updatedItem,
        },
      };
    });
  };

  // Accordion toggle
  const toggleCategoryExpand = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Please enter both name and email.');
      return;
    }

    try {
      const selectedCount = countAllowedPermissions(permissions);
      const created = await addAdmin({
        full_name: fullName,
        email: email,
        password: password,
        role: role,
        permissions: permissions,
      });

      setSuccessMsg(
        `Admin "${created.full_name}" created & synced to Supabase successfully! (${selectedCount} / ${TOTAL_SUB_ITEMS_COUNT} sub-pages allowed with CRUD permissions)`
      );

      setFullName('');
      setEmail('');
      setPassword('123456');
      setPermissions(getNestedCrudPermissions(false));
      refreshList();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create admin.');
    }
  };

  const handleOpenEditAccess = (adm: AdminUser) => {
    setEditingAdmin(adm);
    setEditingPermissions(adm.permissions || getNestedCrudPermissions(false));
  };

  const handleSaveEditPermissions = () => {
    if (!editingAdmin) return;
    updateAdminPermissions(editingAdmin.id, editingPermissions);
    setEditingAdmin(null);
    refreshList();
    setSuccessMsg(`Permissions updated for ${editingAdmin.full_name}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this admin account?')) {
      await deleteAdmin(id);
      refreshList();
    }
  };

  const totalSelectedCount = countAllowedPermissions(permissions);
  const isGlobalAllSelected = totalSelectedCount === TOTAL_SUB_ITEMS_COUNT;

  return (
    <div className="space-y-6">
      {/* Dynamic Page Header depending on active mode */}
      {activeTab === 'add' ? (
        <PageHeader
          title="Add New Admin Account"
          subtitle="Create a new system or shop admin and assign custom CRUD module access permissions."
        >
          <button
            onClick={() => {
              setActiveTab('manage');
              setSearchParams({ tab: 'manage' });
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-all hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
            <span>Manage Access ({adminsList.length})</span>
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </PageHeader>
      ) : (
        <PageHeader
          title="Super Admin Access Control"
          subtitle="Manage active & deactive admin accounts, view allowed permissions, and edit CRUD access."
        >
          <button
            onClick={() => {
              setActiveTab('add');
              setSearchParams({ tab: 'add' });
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add New Admin</span>
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </PageHeader>
      )}

      {/* Main Container */}
      <div className="space-y-6">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

          {activeTab === 'add' ? (
            <form onSubmit={handleCreateAdmin} className="space-y-6">
              {/* Basic Info */}
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-ink-50">
                  <User className="h-4 w-4 text-brand-500" /> Basic Account Credentials
                </h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                      Admin Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ali Ahmed"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-sm text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                      Email Address (Login ID)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="email"
                        required
                        placeholder="admin2@nexus.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-sm text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                      Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-sm text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                      Admin Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 px-3.5 text-sm text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                    >
                      <option value="admin">System Admin</option>
                      <option value="shop_admin">Shop Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Module-Based Grouped Accordion Hierarchy Selector Card */}
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ink-200 pb-4 dark:border-ink-800">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-ink-100">
                      <FolderTree className="h-4.5 w-4.5 text-brand-500" />
                      Action-Level (CRUD) Permissions Matrix
                    </h3>
                    <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                      Configure View, Create, Edit, and Delete access per module.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGlobalSelectAll(!isGlobalAllSelected)}
                    className="flex items-center gap-2 shrink-0 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300"
                  >
                    {isGlobalAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-brand-600" />
                    ) : (
                      <Square className="h-4 w-4 text-ink-400" />
                    )}
                    <span>{isGlobalAllSelected ? 'Deselect All' : 'Select All / Full Access'}</span>
                  </button>
                </div>

                {/* Accordions List */}
                <div className="space-y-4">
                  {MODULE_CATEGORIES.map((moduleCat) => {
                    const catName = moduleCat.category;
                    const isExpanded = Boolean(expandedCategories[catName]);
                    const catObject = permissions[catName] || {};
                    const selectedInCatCount = moduleCat.items.filter((item) =>
                      Boolean(catObject[item.key]?.access)
                    ).length;
                    const isCatAllSelected = selectedInCatCount === moduleCat.items.length;

                    return (
                      <div
                        key={catName}
                        className="overflow-hidden rounded-2xl border border-ink-200 bg-ink-50/40 transition-all dark:border-ink-800 dark:bg-ink-950/40"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between bg-ink-100/60 px-5 py-3.5 dark:bg-ink-900/60">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(catName)}
                            className="flex items-center gap-3 text-left text-sm font-bold text-ink-900 dark:text-ink-100"
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-ink-500 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                            <span>{catName} Module</span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-600 shadow-sm dark:bg-ink-800 dark:text-ink-300">
                              {selectedInCatCount} / {moduleCat.items.length} Allowed
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCategorySelectAll(catName, !isCatAllSelected)}
                            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
                          >
                            {isCatAllSelected ? (
                              <CheckSquare className="h-4 w-4 text-brand-600" />
                            ) : (
                              <Square className="h-4 w-4 text-ink-400" />
                            )}
                            <span>Select All {catName} (Full CRUD)</span>
                          </button>
                        </div>

                        {/* Sub-pages CRUD Matrix */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="space-y-3 p-4 border-t border-ink-200 dark:border-ink-800">
                                {moduleCat.items.map((subItem) => {
                                  const flags: ActionPermissions = catObject[subItem.key] || {
                                    access: false,
                                    can_create: false,
                                    can_edit: false,
                                    can_delete: false,
                                  };

                                  return (
                                    <div
                                      key={subItem.key}
                                      className={`flex flex-col gap-2.5 rounded-xl border p-3.5 transition-all sm:flex-row sm:items-center sm:justify-between ${
                                        flags.access
                                          ? 'border-brand-500/40 bg-white dark:border-brand-500/30 dark:bg-ink-900'
                                          : 'border-ink-200 bg-white/70 text-ink-500 dark:border-ink-800/80 dark:bg-ink-950/60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={flags.access}
                                          onChange={() => handleToggleAction(catName, subItem.key, 'access')}
                                          className="h-4 w-4 accent-brand-600 rounded cursor-pointer"
                                        />
                                        <div>
                                          <span className="font-semibold text-xs text-ink-900 dark:text-ink-100">
                                            {subItem.name}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Action Level Controls (Create, Edit, Delete) */}
                                      <div className="flex flex-wrap items-center gap-3 pl-7 sm:pl-0">
                                        <label
                                          onClick={() => handleToggleAction(catName, subItem.key, 'can_create')}
                                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                            flags.can_create
                                              ? 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                                              : 'border-ink-200 text-ink-400 hover:border-ink-300 dark:border-ink-800'
                                          }`}
                                        >
                                          <PlusCircle className="h-3.5 w-3.5" />
                                          <span>Create</span>
                                        </label>

                                        <label
                                          onClick={() => handleToggleAction(catName, subItem.key, 'can_edit')}
                                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                            flags.can_edit
                                              ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                              : 'border-ink-200 text-ink-400 hover:border-ink-300 dark:border-ink-800'
                                          }`}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                          <span>Edit</span>
                                        </label>

                                        <label
                                          onClick={() => handleToggleAction(catName, subItem.key, 'can_delete')}
                                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                            flags.can_delete
                                              ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                              : 'border-ink-200 text-ink-400 hover:border-ink-300 dark:border-ink-800'
                                          }`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span>Delete</span>
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
                  <span>
                    Total Allowed Sub-Pages: {totalSelectedCount} of {TOTAL_SUB_ITEMS_COUNT}
                  </span>
                  {totalSelectedCount === 0 && (
                    <span className="text-amber-600 font-semibold dark:text-amber-400">
                      Default: All pages will be empty for this admin until permissions are selected.
                    </span>
                  )}
                </div>
              </div>

              {/* Error and Success Notifications at Form Bottom */}
              {errorMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm animate-pulse">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/')}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Create Admin Account
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Summary KPI Cards for Active & Deactive Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
                  <div>
                    <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">Total Admin Accounts</p>
                    <p className="mt-1 text-2xl font-black text-ink-900 dark:text-ink-50">{adminsList.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-brand-500/40" />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Active Admins</p>
                    <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300">
                      {adminsList.filter((a) => a.has_data_access).length}
                    </p>
                  </div>
                  <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30">
                  <div>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Deactive Admins</p>
                    <p className="mt-1 text-2xl font-black text-rose-800 dark:text-rose-300">
                      {adminsList.filter((a) => !a.has_data_access).length}
                    </p>
                  </div>
                  <div className="h-4 w-4 rounded-full bg-rose-500 shadow-sm"></div>
                </div>
              </div>

              {/* Mobile Card List View (Visible on small screens < 640px) */}
              <div className="space-y-3 sm:hidden">
                {adminsList.map((adm) => {
                  const isSuper = adm.email.toLowerCase() === 'admin@nexus.com' || adm.email.toLowerCase() === 'superadmin@nexus.com';
                  const allowedCount = isSuper
                    ? TOTAL_SUB_ITEMS_COUNT
                    : countAllowedPermissions(adm.permissions);

                  return (
                    <div
                      key={adm.id}
                      className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm space-y-3 dark:border-ink-800 dark:bg-ink-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-ink-900 dark:text-ink-50">{adm.full_name}</p>
                          <p className="text-xs text-ink-400 break-all">{adm.email}</p>
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-700 uppercase dark:bg-ink-800 dark:text-ink-300">
                          {isSuper ? 'Super Admin' : adm.role}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-ink-100 py-2.5 dark:border-ink-800">
                        {/* Status Badge */}
                        <div>
                          <p className="text-[10px] font-semibold text-ink-400 uppercase mb-1">Status</p>
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> ACTIVE (Protected)
                            </span>
                          ) : adm.has_data_access ? (
                            <button
                              onClick={() => handleToggleStatus(adm.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> ACTIVE
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(adm.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            >
                              <span className="h-2 w-2 rounded-full bg-rose-500"></span> DEACTIVE
                            </button>
                          )}
                        </div>

                        {/* Permissions Badge */}
                        <div>
                          <p className="text-[10px] font-semibold text-ink-400 uppercase mb-1">Permissions</p>
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <Unlock className="h-3 w-3" /> Protected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                              <FolderTree className="h-3 w-3" /> {allowedCount} Pages
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isSuper && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleToggleStatus(adm.id)}
                            className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors text-center ${
                              adm.has_data_access
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                          >
                            {adm.has_data_access ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleOpenEditAccess(adm)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-brand-50 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit Access
                          </button>
                          <button
                            onClick={() => handleDelete(adm.id)}
                            className="rounded-xl p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                            title="Delete Admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Admins Table (Hidden on small screens, touch scrollable on medium screens) */}
              <div className="hidden sm:block w-full max-w-full overflow-x-auto scrollbar-thin touch-scrolling rounded-2xl border border-ink-200 dark:border-ink-800">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-ink-50 text-ink-500 uppercase font-semibold border-b border-ink-200 dark:bg-ink-950 dark:border-ink-800 dark:text-ink-400">
                    <tr>
                      <th className="px-5 py-3.5">Admin Name & Email</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5">Module Permissions Allowed</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {adminsList.map((adm) => {
                      const isSuper = adm.email.toLowerCase() === 'admin@nexus.com' || adm.email.toLowerCase() === 'superadmin@nexus.com';
                      const allowedCount = isSuper
                        ? TOTAL_SUB_ITEMS_COUNT
                        : countAllowedPermissions(adm.permissions);

                      return (
                        <tr key={adm.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                          <td className="px-5 py-4">
                            <div className="font-bold text-sm text-ink-900 dark:text-ink-100">
                              {adm.full_name}
                            </div>
                            <div className="text-xs text-ink-400">{adm.email}</div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-md bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 uppercase dark:bg-ink-800 dark:text-ink-300">
                              {isSuper ? 'Super Admin' : adm.role}
                            </span>
                          </td>

                          {/* Account Active / Deactive Status Badge */}
                          <td className="px-5 py-4">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> ACTIVE (Protected)
                              </span>
                            ) : adm.has_data_access ? (
                              <button
                                onClick={() => handleToggleStatus(adm.id)}
                                className="group inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
                                title="Click to Deactivate Admin"
                              >
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> ACTIVE
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(adm.id)}
                                className="group inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-all cursor-pointer"
                                title="Click to Activate Admin"
                              >
                                <span className="h-2 w-2 rounded-full bg-rose-500"></span> DEACTIVE
                              </button>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <Unlock className="h-3.5 w-3.5" /> Full Super Access (Protected)
                              </span>
                            ) : allowedCount === TOTAL_SUB_ITEMS_COUNT ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <Unlock className="h-3.5 w-3.5" /> Full Access ({allowedCount}/{TOTAL_SUB_ITEMS_COUNT})
                              </span>
                            ) : allowedCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                                <FolderTree className="h-3.5 w-3.5" /> {allowedCount} Pages Allowed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <Lock className="h-3.5 w-3.5" /> No Access (0 Pages Allowed)
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {isSuper ? (
                              <span className="text-xs text-ink-400 italic">Protected</span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleToggleStatus(adm.id)}
                                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                    adm.has_data_access
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  }`}
                                >
                                  {adm.has_data_access ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleOpenEditAccess(adm)}
                                  className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                                >
                                  <Edit2 className="h-3.5 w-3.5" /> Edit Access
                                </button>
                                <button
                                  onClick={() => handleDelete(adm.id)}
                                  className="rounded-xl p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                                  title="Delete Admin"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* Edit Granular Access Drawer / Modal */}
      <AnimatePresence>
        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAdmin(null)}
              className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="flex items-center justify-between border-b border-ink-200 pb-4 dark:border-ink-800">
                <div>
                  <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">
                    Edit Module CRUD Permissions: {editingAdmin.full_name}
                  </h3>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    ({editingAdmin.email}) — Select View, Create, Edit, and Delete permissions
                  </p>
                </div>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-4 scrollbar-thin space-y-4">
                {MODULE_CATEGORIES.map((moduleCat) => {
                  const catName = moduleCat.category;
                  const isExpanded = Boolean(editingExpanded[catName]);
                  const catObject = editingPermissions[catName] || {};

                  return (
                    <div
                      key={catName}
                      className="overflow-hidden rounded-xl border border-ink-200 bg-white transition-shadow dark:border-ink-800 dark:bg-ink-950"
                    >
                      <div className="flex items-center justify-between bg-ink-50/70 px-4 py-3 dark:bg-ink-900/70">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingExpanded((prev) => ({
                              ...prev,
                              [catName]: !prev[catName],
                            }))
                          }
                          className="flex items-center gap-2.5 text-left text-xs font-bold text-ink-900 dark:text-ink-100"
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-ink-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                          <span>{catName} Module</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-2.5 p-3 border-t border-ink-100 dark:border-ink-800">
                          {moduleCat.items.map((subItem) => {
                            const flags: ActionPermissions = catObject[subItem.key] || {
                              access: false,
                              can_create: false,
                              can_edit: false,
                              can_delete: false,
                            };

                            const handleEditActionToggle = (action: keyof ActionPermissions) => {
                              setEditingPermissions((prev) => {
                                const subCatObj = prev[catName] || {};
                                const curItem: ActionPermissions = subCatObj[subItem.key] || {
                                  access: false,
                                  can_create: false,
                                  can_edit: false,
                                  can_delete: false,
                                };
                                const newActionVal = !curItem[action];
                                let updatedItem = { ...curItem, [action]: newActionVal };
                                if (action !== 'access' && newActionVal) updatedItem.access = true;
                                if (action === 'access' && !newActionVal) {
                                  updatedItem.can_create = false;
                                  updatedItem.can_edit = false;
                                  updatedItem.can_delete = false;
                                }
                                return {
                                  ...prev,
                                  [catName]: {
                                    ...subCatObj,
                                    [subItem.key]: updatedItem,
                                  },
                                };
                              });
                            };

                            return (
                              <div
                                key={subItem.key}
                                className="flex flex-col gap-2 rounded-xl border border-ink-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-ink-800"
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={flags.access}
                                    onChange={() => handleEditActionToggle('access')}
                                    className="h-4 w-4 accent-brand-600 rounded cursor-pointer"
                                  />
                                  <span className="font-semibold text-xs text-ink-900 dark:text-ink-100">
                                    {subItem.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <label
                                    onClick={() => handleEditActionToggle('can_create')}
                                    className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                                      flags.can_create
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                                        : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                    }`}
                                  >
                                    Create
                                  </label>
                                  <label
                                    onClick={() => handleEditActionToggle('can_edit')}
                                    className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                                      flags.can_edit
                                        ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                        : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                    }`}
                                  >
                                    Edit
                                  </label>
                                  <label
                                    onClick={() => handleEditActionToggle('can_delete')}
                                    className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                                      flags.can_delete
                                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                        : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                    }`}
                                  >
                                    Delete
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 border-t border-ink-200 pt-3 dark:border-ink-800">
                <Button variant="secondary" onClick={() => setEditingAdmin(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditPermissions} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Save Access Permissions
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
