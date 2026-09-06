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
  PlusCircle,
  Pencil,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
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
  ActionPermissions,
  AdminUser,
  getEffectiveAdminPermissions,
  isPermissionAllowedByAdmin,
} from '@/shared/lib/adminStore';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'sales' | 'staff';
  initialTab?: 'add' | 'manage';
}

export function AddTeamMemberModal({
  isOpen,
  onClose,
  defaultRole = 'sales',
  initialTab = 'add',
}: AddTeamMemberModalProps) {
  const { user, profile } = useAuth();
  const adminPerms = getEffectiveAdminPermissions(user?.email, profile?.role);

  // Filter module categories & sub-items to ONLY show those allowed for the current logged-in Admin
  const visibleCategories = MODULE_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => isPermissionAllowedByAdmin(adminPerms, cat.category, item.key)),
  })).filter((cat) => cat.items.length > 0);

  const [activeTab, setActiveTab] = useState<'add' | 'manage'>(initialTab);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<'sales' | 'staff'>(defaultRole);

  // Nested CRUD permissions state
  const [permissions, setPermissions] = useState<NestedCrudPermissions>(getNestedCrudPermissions(false));

  // Accordion open/collapse states
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Overview: true,
    CRM: true,
    Sales: true,
    Inventory: true,
    Organization: false,
    Intelligence: false,
  });

  // Edit drawer state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<NestedCrudPermissions>(getNestedCrudPermissions(false));
  const [editingExpanded, setEditingExpanded] = useState<Record<string, boolean>>({
    Overview: true,
    CRM: true,
    Sales: true,
    Inventory: true,
    Organization: true,
    Intelligence: true,
  });

  const [teamList, setTeamList] = useState<AdminUser[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const all = getAdmins();
      // Filter list to team members (sales or staff) or all non-superadmin
      setTeamList(all.filter((u) => u.role === 'sales' || u.role === 'staff'));
      setActiveTab(initialTab);
      setRole(defaultRole);
      setErrorMsg(null);
      setSuccessMsg(null);
      setPermissions(getNestedCrudPermissions(false));
    }
  }, [isOpen, initialTab, defaultRole]);

  const refreshList = () => {
    const all = getAdmins();
    setTeamList(all.filter((u) => u.role === 'sales' || u.role === 'staff'));
  };

  // Pre-fill default recommended permissions based on role (Sales vs Staff), filtered by Admin's own permissions
  const applyPresetPermissions = (targetRole: 'sales' | 'staff') => {
    const newPerms = getNestedCrudPermissions(false);
    if (targetRole === 'sales') {
      MODULE_CATEGORIES.forEach((cat) => {
        if (cat.category === 'Sales' || cat.category === 'CRM' || cat.category === 'Overview') {
          newPerms[cat.category] = {};
          cat.items.forEach((item) => {
            const isAllowed = isPermissionAllowedByAdmin(adminPerms, cat.category, item.key);
            newPerms[cat.category][item.key] = {
              access: isAllowed,
              can_create: isAllowed,
              can_edit: isAllowed,
              can_delete: false,
            };
          });
        }
      });
    } else if (targetRole === 'staff') {
      MODULE_CATEGORIES.forEach((cat) => {
        if (cat.category === 'Inventory' || cat.category === 'Sales' || cat.category === 'Overview' || cat.category === 'Organization') {
          newPerms[cat.category] = {};
          cat.items.forEach((item) => {
            const isAllowed = isPermissionAllowedByAdmin(adminPerms, cat.category, item.key);
            newPerms[cat.category][item.key] = {
              access: isAllowed,
              can_create: isAllowed,
              can_edit: false,
              can_delete: false,
            };
          });
        }
      });
    }
    setPermissions(newPerms);
  };

  // Global Select All / Deselect All (Only for items allowed for current Admin)
  const handleGlobalSelectAll = (checked: boolean) => {
    setPermissions((prev) => {
      const next = getNestedCrudPermissions(false);
      if (!checked) return next;
      MODULE_CATEGORIES.forEach((cat) => {
        next[cat.category] = {};
        cat.items.forEach((item) => {
          const isAllowed = isPermissionAllowedByAdmin(adminPerms, cat.category, item.key);
          next[cat.category][item.key] = {
            access: isAllowed,
            can_create: isAllowed,
            can_edit: isAllowed,
            can_delete: isAllowed,
          };
        });
      });
      return next;
    });
  };

  // Category Level Select All (Only for items allowed for current Admin)
  const handleCategorySelectAll = (categoryName: string, checked: boolean) => {
    setPermissions((prev) => {
      const updatedCat = { ...(prev[categoryName] || {}) };
      const catDef = MODULE_CATEGORIES.find((c) => c.category === categoryName);
      if (catDef) {
        catDef.items.forEach((item) => {
          const isAllowed = isPermissionAllowedByAdmin(adminPerms, categoryName, item.key);
          const val = checked && isAllowed;
          updatedCat[item.key] = {
            access: val,
            can_create: val,
            can_edit: val,
            can_delete: val,
          };
        });
      }
      return {
        ...prev,
        [categoryName]: updatedCat,
      };
    });
  };

  // Toggle Action (Prevents toggling if item is not allowed for Admin)
  const handleToggleAction = (
    categoryName: string,
    itemKey: string,
    action: keyof ActionPermissions
  ) => {
    const isAllowed = isPermissionAllowedByAdmin(adminPerms, categoryName, itemKey);
    if (!isAllowed) return; // Prevent toggle!

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

      if (action !== 'access' && newActionVal) {
        updatedItem.access = true;
      }
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

  const toggleCategoryExpand = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
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

      const roleLabel = role === 'sales' ? 'Sales Member' : 'Staff Member';
      setSuccessMsg(
        `${roleLabel} "${created.full_name}" added & synced to Supabase! (${selectedCount} / ${TOTAL_SUB_ITEMS_COUNT} sub-pages allowed)`
      );

      setFullName('');
      setEmail('');
      setPassword('123456');
      setPermissions(getNestedCrudPermissions(false));
      refreshList();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add team member.');
    }
  };

  const handleOpenEditAccess = (u: AdminUser) => {
    setEditingUser(u);
    setEditingPermissions(u.permissions || getNestedCrudPermissions(false));
  };

  const handleSaveEditPermissions = () => {
    if (!editingUser) return;
    updateAdminPermissions(editingUser.id, editingPermissions);
    setEditingUser(null);
    refreshList();
    setSuccessMsg(`Permissions updated for ${editingUser.full_name}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
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

        {/* Modal Dialog */}
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
                {role === 'sales' ? <Briefcase className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-900 dark:text-ink-50">
                  {role === 'sales' ? 'Add Sales Team Member' : 'Add Staff Member'}
                </h2>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Create new team accounts and assign granular module permissions
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
              Add Member
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
              Team Accounts ({teamList.length})
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
              <form onSubmit={handleCreateTeamMember} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        required
                        placeholder={role === 'sales' ? 'e.g. Hassan Sales Rep' : 'e.g. Usman Staff Member'}
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
                        placeholder={role === 'sales' ? 'sales@nexus.com' : 'staff@nexus.com'}
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
                      Team Role Type
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'sales' | 'staff')}
                      className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-semibold"
                    >
                      <option value="sales">Sales Executive / Sales Representative</option>
                      <option value="staff">Staff Member / Operations Staff</option>
                    </select>
                  </div>
                </div>

                {/* Preset Permissions Quick Action */}
                <div className="flex items-center justify-between rounded-xl bg-brand-50/70 p-3 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800">
                  <div className="text-xs">
                    <span className="font-bold text-brand-900 dark:text-brand-200">Quick Permission Presets:</span>
                    <span className="ml-1 text-ink-500 dark:text-ink-400">Apply standard permissions matrix for this role</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetPermissions('sales')}
                      className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-sm border border-brand-200 hover:bg-brand-100 dark:bg-ink-900 dark:text-brand-300 dark:border-brand-800"
                    >
                      Apply Sales Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetPermissions('staff')}
                      className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-sm border border-ink-200 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:border-ink-700"
                    >
                      Apply Staff Preset
                    </button>
                  </div>
                </div>

                {/* Module-Based Grouped Accordions for CRUD Permissions */}
                <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4 dark:border-ink-800 dark:bg-ink-950/70">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-200 pb-3 dark:border-ink-800">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold text-ink-900 dark:text-ink-100">
                        <FolderTree className="h-4 w-4 text-brand-500" />
                        Select Data Access & Action (CRUD) Permissions
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
                        Specify exactly which modules this team member can view, create, edit, or delete.
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

                  {/* Accordions */}
                  <div className="space-y-3">
                    {visibleCategories.map((moduleCat) => {
                      const catName = moduleCat.category;
                      const isExpanded = Boolean(expandedCategories[catName]);
                      const catObject = permissions[catName] || {};
                      const selectedInCatCount = moduleCat.items.filter(
                        (item) => Boolean(catObject[item.key]?.access)
                      ).length;
                      const isCatAllSelected = selectedInCatCount === moduleCat.items.length;

                      return (
                        <div
                          key={catName}
                          className="overflow-hidden rounded-xl border border-ink-200 bg-white transition-shadow dark:border-ink-800 dark:bg-ink-900"
                        >
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

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="space-y-2.5 p-3 border-t border-ink-100 dark:border-ink-800">
                                  {moduleCat.items.map((subItem) => {
                                    const isAllowedForAdmin = isPermissionAllowedByAdmin(adminPerms, catName, subItem.key);
                                    const flags: ActionPermissions = catObject[subItem.key] || {
                                      access: false,
                                      can_create: false,
                                      can_edit: false,
                                      can_delete: false,
                                    };

                                    return (
                                      <div
                                        key={subItem.key}
                                        className={`flex flex-col gap-2 rounded-xl border p-2.5 transition-all sm:flex-row sm:items-center sm:justify-between ${
                                          !isAllowedForAdmin
                                            ? 'border-ink-200/60 bg-ink-100/40 opacity-60 dark:border-ink-800 dark:bg-ink-950/40'
                                            : flags.access
                                            ? 'border-brand-500/40 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/10'
                                            : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <input
                                            type="checkbox"
                                            disabled={!isAllowedForAdmin}
                                            checked={flags.access && isAllowedForAdmin}
                                            onChange={() => handleToggleAction(catName, subItem.key, 'access')}
                                            className={`h-4 w-4 accent-brand-600 rounded ${isAllowedForAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                          />
                                          <span className="font-semibold text-xs text-ink-900 dark:text-ink-100">
                                            {subItem.name}
                                          </span>
                                          {!isAllowedForAdmin && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-ink-200/80 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-400">
                                              <Lock className="h-3 w-3 text-amber-500" /> Admin Restricted
                                            </span>
                                          )}
                                        </div>

                                        {isAllowedForAdmin ? (
                                          <div className="flex flex-wrap items-center gap-2 pl-6 sm:pl-0">
                                            <label
                                              onClick={() => handleToggleAction(catName, subItem.key, 'can_create')}
                                              className={`flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                                                flags.can_create
                                                  ? 'border-brand-400 bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300'
                                                  : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                              }`}
                                            >
                                              <PlusCircle className="h-3 w-3" /> Create
                                            </label>

                                            <label
                                              onClick={() => handleToggleAction(catName, subItem.key, 'can_edit')}
                                              className={`flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                                                flags.can_edit
                                                  ? 'border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                                                  : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                              }`}
                                            >
                                              <Pencil className="h-3 w-3" /> Edit
                                            </label>

                                            <label
                                              onClick={() => handleToggleAction(catName, subItem.key, 'can_delete')}
                                              className={`flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                                                flags.can_delete
                                                  ? 'border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                                                  : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                              }`}
                                            >
                                              <Trash2 className="h-3 w-3" /> Delete
                                            </label>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] font-medium text-ink-400 italic">
                                            Not included in your Admin permissions
                                          </span>
                                        )}
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
                </div>

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
                    Save & Create Account
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ink-50 text-ink-500 uppercase font-semibold border-b border-ink-200 dark:bg-ink-950 dark:border-ink-800 dark:text-ink-400">
                      <tr>
                        <th className="px-4 py-3">Member Name & Email</th>
                        <th className="px-4 py-3">Role Type</th>
                        <th className="px-4 py-3">Page Access</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                      {teamList.map((u) => {
                        const allowedCount = countAllowedPermissions(u.permissions);

                        return (
                          <tr key={u.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-ink-900 dark:text-ink-100">
                                {u.full_name}
                              </div>
                              <div className="text-[11px] text-ink-400">{u.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  u.role === 'sales'
                                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                {u.role === 'sales' ? 'Sales Member' : 'Staff Member'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {allowedCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                                  <FolderTree className="h-3.5 w-3.5" /> {allowedCount} Pages Allowed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Lock className="h-3.5 w-3.5" /> No Access
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditAccess(u)}
                                  className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                                >
                                  <Edit2 className="h-3.5 w-3.5" /> Edit Access
                                </button>
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  className="rounded-lg p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                                  title="Delete Account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {teamList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-ink-400">
                            No sales or staff members created yet. Use the "Add Member" tab to add team accounts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Edit Drawer for Team Member */}
          <AnimatePresence>
            {editingUser && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute inset-0 z-50 flex flex-col bg-white p-6 dark:bg-ink-900"
              >
                <div className="flex items-center justify-between border-b border-ink-200 pb-4 dark:border-ink-800">
                  <div>
                    <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">
                      Edit Access Permissions: {editingUser.full_name}
                    </h3>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      ({editingUser.email}) — Adjust allowed module pages and CRUD action capabilities
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 scrollbar-thin space-y-3">
                  {visibleCategories.map((moduleCat) => {
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
                                  className="flex flex-col gap-2 rounded-xl border border-ink-200 p-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-ink-800"
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
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditPermissions}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-brand-500"
                  >
                    <Check className="h-4 w-4" /> Save Permissions
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
