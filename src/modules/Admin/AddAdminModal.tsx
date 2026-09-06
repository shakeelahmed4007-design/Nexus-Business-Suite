import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
} from 'lucide-react';
import {
  getAdmins,
  addAdmin,
  updateAdminPermissions,
  deleteAdmin,
  MODULE_CATEGORIES,
  getNestedCrudPermissions,
  countAllowedPermissions,
  TOTAL_SUB_ITEMS_COUNT,
  NestedCrudPermissions,
  AdminUser,
} from '@/shared/lib/adminStore';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'add' | 'manage';
}

export function AddAdminModal({ isOpen, onClose, initialTab = 'add' }: AddAdminModalProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>(initialTab);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<'admin' | 'shop_admin'>('admin');
  
  // Nested permissions state
  const [permissions, setPermissions] = useState<NestedCrudPermissions>(getNestedCrudPermissions(false));

  // Accordion open/collapse states for module categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Overview: true,
    CRM: true,
    Sales: true,
    Inventory: false,
    Organization: false,
    Intelligence: false,
  });

  // Edit modal / popover state for an existing admin
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
    if (isOpen) {
      setAdminsList(getAdmins());
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setPermissions(getNestedCrudPermissions(false));
    }
  }, [isOpen, initialTab]);

  const refreshList = () => {
    setAdminsList(getAdmins());
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
          updatedCat[item.key] = checked;
        });
      }
      return {
        ...prev,
        [categoryName]: updatedCat,
      };
    });
  };

  // Toggle single sub-item
  const handleToggleItem = (categoryName: string, itemKey: string) => {
    setPermissions((prev) => {
      const currentVal = Boolean(prev[categoryName]?.[itemKey]);
      return {
        ...prev,
        [categoryName]: {
          ...(prev[categoryName] || {}),
          [itemKey]: !currentVal,
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
        `Admin "${created.full_name}" created & synced to Supabase successfully! (${selectedCount} / ${TOTAL_SUB_ITEMS_COUNT} sub-pages allowed)`
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm"
        />

        {/* Modal dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/50 px-6 py-4 dark:border-ink-800 dark:bg-ink-950/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-900 dark:text-ink-50">
                  Super Admin Management
                </h2>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Add new admins with module-based grouped permission accordions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-ink-100 px-6 dark:border-ink-800">
            <button
              onClick={() => {
                setActiveTab('add');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition-colors ${
                activeTab === 'add'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Add New Admin
            </button>
            <button
              onClick={() => {
                setActiveTab('manage');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition-colors ${
                activeTab === 'manage'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
              }`}
            >
              <Users className="h-4 w-4" />
              Admins & Access Control ({adminsList.length})
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-thin">
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === 'add' ? (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
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
                        className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
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
                        className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
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
                        className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                      Admin Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                    >
                      <option value="admin">System Admin</option>
                      <option value="shop_admin">Shop Admin</option>
                    </select>
                  </div>
                </div>

                {/* Module-Based Grouped Accordion Hierarchy Selector */}
                <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4 dark:border-ink-800 dark:bg-ink-950/70">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-200 pb-3 dark:border-ink-800">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold text-ink-900 dark:text-ink-100">
                        <FolderTree className="h-4 w-4 text-brand-500" />
                        Select Data Access / Page Permissions (Grouped Accordion Hierarchy)
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
                        Select which modules and data pages this admin is allowed to view and manage.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGlobalSelectAll(!isGlobalAllSelected)}
                      className="flex items-center gap-1.5 shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300"
                    >
                      {isGlobalAllSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-brand-600" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-ink-400" />
                      )}
                      <span>{isGlobalAllSelected ? 'Deselect All' : 'Select All / Full Access'}</span>
                    </button>
                  </div>

                  {/* Accordions by Module Category */}
                  <div className="space-y-3">
                    {MODULE_CATEGORIES.map((moduleCat) => {
                      const catName = moduleCat.category;
                      const isExpanded = Boolean(expandedCategories[catName]);
                      
                      const catObject = permissions[catName] || {};
                      const selectedInCatCount = moduleCat.items.filter(
                        (item) => Boolean(catObject[item.key])
                      ).length;

                      const isCatAllSelected = selectedInCatCount === moduleCat.items.length;

                      return (
                        <div
                          key={catName}
                          className="overflow-hidden rounded-xl border border-ink-200 bg-white transition-shadow dark:border-ink-800 dark:bg-ink-900"
                        >
                          {/* Accordion Header */}
                          <div className="flex items-center justify-between bg-ink-50/70 px-4 py-3 dark:bg-ink-950/60">
                            <button
                              type="button"
                              onClick={() => toggleCategoryExpand(catName)}
                              className="flex items-center gap-2.5 text-left text-xs font-bold text-ink-900 dark:text-ink-100"
                            >
                              <ChevronDown
                                className={`h-4 w-4 text-ink-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                              <span>{catName} Module</span>
                              <span className="rounded-full bg-ink-200/70 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                                {selectedInCatCount} / {moduleCat.items.length} Allowed
                              </span>
                            </button>

                            {/* Module-Level Select All */}
                            <button
                              type="button"
                              onClick={() => handleCategorySelectAll(catName, !isCatAllSelected)}
                              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-200/50 dark:text-ink-300 dark:hover:bg-ink-800"
                            >
                              {isCatAllSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 text-brand-600" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-ink-400" />
                              )}
                              <span>Select All {catName}</span>
                            </button>
                          </div>

                          {/* Accordion Collapsible Content */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3 border-t border-ink-100 dark:border-ink-800">
                                  {moduleCat.items.map((subItem) => {
                                    const checked = Boolean(catObject[subItem.key]);
                                    return (
                                      <label
                                        key={subItem.key}
                                        onClick={() => handleToggleItem(catName, subItem.key)}
                                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all ${
                                          checked
                                            ? 'border-brand-500 bg-brand-50/60 text-brand-900 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-200'
                                            : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-400'
                                        }`}
                                      >
                                        <span className="truncate pr-2 font-semibold">
                                          {subItem.name}
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => {}}
                                          className="h-4 w-4 accent-brand-600 rounded"
                                        />
                                      </label>
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

                  <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500 dark:text-ink-400">
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

                {successMsg && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm animate-pulse">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-500"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Admin Account
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-ink-200 dark:border-ink-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ink-50 text-ink-500 uppercase font-semibold border-b border-ink-200 dark:bg-ink-950 dark:border-ink-800 dark:text-ink-400">
                      <tr>
                        <th className="px-4 py-3">Admin</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Module Permissions</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                      {adminsList.map((adm) => {
                        const isSuper = adm.email.toLowerCase() === 'admin@nexus.com';
                        const allowedCount = isSuper
                          ? TOTAL_SUB_ITEMS_COUNT
                          : countAllowedPermissions(adm.permissions);

                        return (
                          <tr key={adm.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-ink-900 dark:text-ink-100">
                                {adm.full_name}
                              </div>
                              <div className="text-[11px] text-ink-400">{adm.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-700 uppercase dark:bg-ink-800 dark:text-ink-300">
                                {isSuper ? 'Super Admin' : adm.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {isSuper ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <Unlock className="h-3.5 w-3.5" /> Full Super Access (Protected)
                                </span>
                              ) : allowedCount === TOTAL_SUB_ITEMS_COUNT ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <Unlock className="h-3.5 w-3.5" /> Full Access ({allowedCount}/{TOTAL_SUB_ITEMS_COUNT})
                                </span>
                              ) : allowedCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                                  <FolderTree className="h-3.5 w-3.5" /> {allowedCount} Pages Allowed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Lock className="h-3.5 w-3.5" /> No Access (0 Pages Allowed)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isSuper ? (
                                <span className="text-[10px] text-ink-400 italic">Protected</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditAccess(adm)}
                                    className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" /> Edit Access
                                  </button>
                                  <button
                                    onClick={() => handleDelete(adm.id)}
                                    className="rounded-lg p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
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

          {/* Edit Granular Access Sub-Modal Drawer */}
          <AnimatePresence>
            {editingAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute inset-0 z-50 flex flex-col bg-white p-6 dark:bg-ink-900"
              >
                <div className="flex items-center justify-between border-b border-ink-200 pb-4 dark:border-ink-800">
                  <div>
                    <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">
                      Edit Module Permissions: {editingAdmin.full_name}
                    </h3>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      ({editingAdmin.email}) — Select allowed module categories and sub-pages
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingAdmin(null)}
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 scrollbar-thin space-y-3">
                  <div className="flex items-center justify-between border-b border-ink-200 pb-3 dark:border-ink-800">
                    <span className="text-xs font-semibold text-ink-600 dark:text-ink-300">
                      Allowed Sub-Pages:{' '}
                      {countAllowedPermissions(editingPermissions)} / {TOTAL_SUB_ITEMS_COUNT}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const count = countAllowedPermissions(editingPermissions);
                        if (count === TOTAL_SUB_ITEMS_COUNT) {
                          setEditingPermissions(getNestedCrudPermissions(false));
                        } else {
                          setEditingPermissions(getNestedCrudPermissions(true));
                        }
                      }}
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {countAllowedPermissions(editingPermissions) === TOTAL_SUB_ITEMS_COUNT
                        ? 'Deselect All'
                        : 'Select All / Full Access'}
                    </button>
                  </div>

                  {MODULE_CATEGORIES.map((moduleCat) => {
                    const catName = moduleCat.category;
                    const isExpanded = Boolean(editingExpanded[catName]);
                    const catObject = editingPermissions[catName] || {};
                    const selectedInCatCount = moduleCat.items.filter((item) =>
                      Boolean(catObject[item.key])
                    ).length;

                    const isCatAllSelected = selectedInCatCount === moduleCat.items.length;

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
                            <span className="rounded-full bg-ink-200/70 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                              {selectedInCatCount} / {moduleCat.items.length} Allowed
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPermissions((prev) => {
                                const updatedCat = { ...(prev[catName] || {}) };
                                moduleCat.items.forEach((item) => {
                                  updatedCat[item.key] = !isCatAllSelected;
                                });
                                return {
                                  ...prev,
                                  [catName]: updatedCat,
                                };
                              });
                            }}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-200/50 dark:text-ink-300 dark:hover:bg-ink-800"
                          >
                            {isCatAllSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-brand-600" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-ink-400" />
                            )}
                            <span>Select All {catName}</span>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3 border-t border-ink-100 dark:border-ink-800">
                            {moduleCat.items.map((subItem) => {
                              const checked = Boolean(catObject[subItem.key]);
                              return (
                                <label
                                  key={subItem.key}
                                  onClick={() =>
                                    setEditingPermissions((prev) => ({
                                      ...prev,
                                      [catName]: {
                                        ...(prev[catName] || {}),
                                        [subItem.key]: !checked,
                                      },
                                    }))
                                  }
                                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all ${
                                    checked
                                      ? 'border-brand-500 bg-brand-50/60 text-brand-900 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-200'
                                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-400'
                                  }`}
                                >
                                  <span className="truncate pr-2 font-semibold">
                                    {subItem.name}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {}}
                                    className="h-4 w-4 accent-brand-600 rounded"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 border-t border-ink-200 pt-3 dark:border-ink-800">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditPermissions}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-brand-500"
                  >
                    <Check className="h-4 w-4" /> Save Access Permissions
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
