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
  Briefcase,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { useAuth } from '@/shared/context/AuthContext';
import {
  getAdmins,
  syncAdminsFromSupabase,
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

export function TeamManagementPage() {
  const { user, profile } = useAuth();
  const adminPerms = getEffectiveAdminPermissions(user?.email, profile?.role);

  // Filter module categories & sub-items to ONLY show those allowed for the current logged-in Admin
  const visibleCategories = MODULE_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => isPermissionAllowedByAdmin(adminPerms, cat.category, item.key)),
  })).filter((cat) => cat.items.length > 0);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const roleParam = searchParams.get('role');

  const [activeTab, setActiveTab] = useState<'manage'>('manage');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<'sales' | 'staff'>(
    roleParam === 'staff' ? 'staff' : 'sales'
  );

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

  // Edit access state for an existing team member
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
    if (tabParam === 'manage') {
      setActiveTab('manage');
    } else if (tabParam === 'add') {
      setActiveTab('add');
    }

    if (roleParam === 'staff') {
      setRole('staff');
    } else if (roleParam === 'sales') {
      setRole('sales');
    }
  }, [tabParam, roleParam]);

  useEffect(() => {
    refreshList();
  }, []);

  const refreshList = () => {
    const all = getAdmins();
    setTeamList(all.filter((u) => u.role === 'sales' || u.role === 'staff'));
    syncAdminsFromSupabase().then((latest) => {
      setTeamList(latest.filter((u) => u.role === 'sales' || u.role === 'staff'));
    });
  };

  // Preset permissions helper  // Pre-fill default recommended permissions based on role (Sales vs Staff), filtered by Admin's own permissions
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
    setSuccessMsg(`Applied standard permission preset for ${targetRole === 'sales' ? 'Sales Executive' : 'Staff Member'}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
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

  // Module-Level Select All for a specific category
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

  // Toggle single action flag for a sub-item
  const handleToggleAction = (
    categoryName: string,
    itemKey: string,
    action: keyof ActionPermissions
  ) => {
    const isAllowed = isPermissionAllowedByAdmin(adminPerms, categoryName, itemKey);
    if (!isAllowed) return;

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

  // Accordion toggle
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

      const roleTitle = role === 'sales' ? 'Sales Member' : 'Staff Member';
      setSuccessMsg(
        `${roleTitle} "${created.full_name}" created & synced to Supabase successfully! (${selectedCount} / ${TOTAL_SUB_ITEMS_COUNT} sub-pages allowed with CRUD permissions)`
      );

      setFullName('');
      setEmail('');
      setPassword('123456');
      setPermissions(getNestedCrudPermissions(false));
      refreshList();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create team member.');
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
    if (window.confirm('Are you sure you want to remove this team member account?')) {
      await deleteAdmin(id);
      refreshList();
    }
  };

  const totalSelectedCount = countAllowedPermissions(permissions);
  const isGlobalAllSelected = totalSelectedCount === TOTAL_SUB_ITEMS_COUNT;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={role === 'sales' ? 'Sales & Team Access Management' : 'Staff & Team Access Management'}
        subtitle="Add sales representatives and staff members with granular CRUD permissions (View, Create, Edit, Delete) per module."
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </PageHeader>

      {/* Main Container Card */}
      <Card className="overflow-hidden p-0">
        {/* Navigation Header */}
        <div className="flex border-b border-ink-200 bg-ink-50/50 px-6 dark:border-ink-800 dark:bg-ink-950/50">
          <div className="flex items-center gap-2 border-b-2 border-brand-600 py-4 px-6 text-sm font-semibold text-brand-600 dark:border-brand-400 dark:text-brand-400">
            <Users className="h-4 w-4" />
            Team Accounts & Permissions ({teamList.length})
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Accounts Table */}
            <div className="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-50 text-ink-500 uppercase font-semibold border-b border-ink-200 dark:bg-ink-950 dark:border-ink-800 dark:text-ink-400">
                  <tr>
                    <th className="px-5 py-3.5">Member Name & Email</th>
                    <th className="px-5 py-3.5">Role Type</th>
                    <th className="px-5 py-3.5">Module Permissions Allowed</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {teamList.map((u) => {
                    const allowedCount = countAllowedPermissions(u.permissions);

                    return (
                      <tr key={u.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                        <td className="px-5 py-4">
                          <div className="font-bold text-sm text-ink-900 dark:text-ink-100">
                            {u.full_name}
                          </div>
                          <div className="text-xs text-ink-400">{u.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase ${
                              u.role === 'sales'
                                ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {u.role === 'sales' ? 'Sales Member' : 'Staff Member'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {allowedCount > 0 ? (
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditAccess(u)}
                              className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit Access
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="rounded-xl p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                              title="Delete Member"
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
                      <td colSpan={4} className="py-12 text-center text-xs text-ink-400">
                        No sales or staff members created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Granular Access Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
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
                    Edit CRUD Permissions: {editingUser.full_name}
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

              <div className="max-h-[60vh] overflow-y-auto py-4 scrollbar-thin space-y-4">
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
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
