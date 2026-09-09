import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserCheck,
  Briefcase,
  Trash2,
  Lock,
  ShieldAlert,
  CheckCircle2,
  X,
  ChevronDown,
  Edit2,
  Check,
  FolderTree,
  ArrowLeft,
  CheckSquare,
  Square,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { useAuth } from '@/shared/context/AuthContext';
import { AddStaffModal } from './AddStaffModal';
import { AddSalesModal } from './AddSalesModal';
import {
  getAdmins,
  syncAdminsFromSupabase,
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
  getEffectiveAdminPermissions,
  isPermissionAllowedByAdmin,
} from '@/shared/lib/adminStore';

export function TeamManagementPage() {
  const { user, profile } = useAuth();
  const adminPerms = getEffectiveAdminPermissions(user?.email, profile?.role);
  const navigate = useNavigate();

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

  // Data list state
  const [teamList, setTeamList] = useState<AdminUser[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Granular Access Modal state
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

  useEffect(() => {
    refreshList();
  }, []);

  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const currentRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  const isSuperAdmin = currentRole === 'super_admin' || (currentUserEmail !== '' && (currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || currentUserEmail.includes('superadmin')));
  const ADMIN_ROLES = ['admin', 'shop_admin', 'super_admin', 'super admin'];

  const isMemberAllowedForCurrentUser = (u: AdminUser) => {
    if (!u) return false;
    const r = (u.role || '').toLowerCase().trim();
    if (ADMIN_ROLES.includes(r)) return false; // Never show admin accounts here

    const itemCreatorRole = (u.created_by_role || '').toUpperCase();
    const itemCreatorEmail = (u.created_by_email || '').toLowerCase().trim();
    const itemCreatorId = u.created_by_id;

    if (isSuperAdmin) {
      // 1. Super Admin level: Hide staff/sales created by regular Admins
      if (itemCreatorRole === 'ADMIN') return false;
      return true;
    } else {
      // 2. Admin level: Hide staff/sales created by Super Admin
      if (itemCreatorRole === 'SUPER_ADMIN') return false;
      if (itemCreatorEmail) {
        return itemCreatorEmail === currentUserEmail;
      }
      if (itemCreatorId && (user?.id || profile?.id)) {
        return itemCreatorId === (user?.id || profile?.id);
      }
      return true;
    }
  };

  const refreshList = () => {
    const all = getAdmins();
    const isolatedList = all.filter(isMemberAllowedForCurrentUser);
    setTeamList(isolatedList);
    syncAdminsFromSupabase().then((latest) => {
      setTeamList(latest.filter(isMemberAllowedForCurrentUser));
    });
  };

  const handleToggleStatus = (memberId: string) => {
    const nextState = toggleAdminDataAccess(memberId);
    refreshList();
    setSuccessMsg(nextState ? 'Team member account activated successfully.' : 'Team member account deactivated successfully.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDelete = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this team member account?')) {
      await deleteAdmin(memberId);
      refreshList();
      setSuccessMsg('Team member account deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
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

  const activeCount = teamList.filter((a) => a.has_data_access).length;
  const deactiveCount = teamList.filter((a) => !a.has_data_access).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Super Admin Team Access Control"
        subtitle="Manage active & deactive staff and sales team accounts, view allowed permissions, and edit CRUD access."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-500 transition-all cursor-pointer"
          >
            <UserCheck className="h-4 w-4" /> + Add New Staff
          </button>

          <button
            onClick={() => setIsSalesModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-500 transition-all cursor-pointer"
          >
            <Briefcase className="h-4 w-4" /> + Add New Sales
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-sm hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <div>
            <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">Total Team Accounts</p>
            <p className="mt-1.5 text-3xl font-black text-ink-900 dark:text-ink-50">{teamList.length}</p>
          </div>
          <Users className="h-9 w-9 text-brand-500/40" />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Active Members</p>
            <p className="mt-1.5 text-3xl font-black text-emerald-800 dark:text-emerald-300">{activeCount}</p>
          </div>
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30">
          <div>
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Deactive Members</p>
            <p className="mt-1.5 text-3xl font-black text-rose-800 dark:text-rose-300">{deactiveCount}</p>
          </div>
          <div className="h-4 w-4 rounded-full bg-rose-500 shadow-sm"></div>
        </div>
      </div>

      {/* Main Container Card */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 shadow-sm">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm animate-pulse">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Accounts Table */}
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin touch-scrolling rounded-2xl border border-ink-200 dark:border-ink-800">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-ink-50 text-ink-500 uppercase font-semibold border-b border-ink-200 dark:bg-ink-950 dark:border-ink-800 dark:text-ink-400">
                <tr>
                  <th className="px-5 py-3.5">MEMBER NAME & EMAIL</th>
                  <th className="px-5 py-3.5">ROLE</th>
                  <th className="px-5 py-3.5">ACCOUNT STATUS</th>
                  <th className="px-5 py-3.5">MODULE PERMISSIONS ALLOWED</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
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
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase ${u.role === 'sales'
                            ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {u.has_data_access ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            <span className="h-2 w-2 rounded-full bg-rose-500"></span> DEACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {allowedCount === TOTAL_SUB_ITEMS_COUNT ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <Lock className="h-3.5 w-3.5" /> Full Access ({TOTAL_SUB_ITEMS_COUNT}/{TOTAL_SUB_ITEMS_COUNT})
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
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer"
                          >
                            {u.has_data_access ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleOpenEditAccess(u)}
                            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit Access
                          </button>

                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1 text-ink-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
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
                    <td colSpan={5} className="py-12 text-center text-xs text-ink-400 font-medium">
                      No staff or sales members created yet. Click "+ Add New Staff" or "+ Add New Sales" above to add team members.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSuccess={() => {
          refreshList();
        }}
      />

      {/* Add Sales Modal */}
      <AddSalesModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onSuccess={() => {
          refreshList();
        }}
      />

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
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const totalAllowed = countAllowedPermissions(editingPermissions);
                      const isAll = totalAllowed === TOTAL_SUB_ITEMS_COUNT;
                      const next = getNestedCrudPermissions(!isAll);
                      setEditingPermissions(next);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300 cursor-pointer"
                  >
                    {countAllowedPermissions(editingPermissions) === TOTAL_SUB_ITEMS_COUNT ? (
                      <CheckSquare className="h-4 w-4 text-brand-600" />
                    ) : (
                      <Square className="h-4 w-4 text-ink-400" />
                    )}
                    <span>
                      {countAllowedPermissions(editingPermissions) === TOTAL_SUB_ITEMS_COUNT
                        ? 'Deselect All'
                        : 'Select All (Full Access)'}
                    </span>
                  </button>

                  <button
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-4 scrollbar-thin space-y-4">
                {MODULE_CATEGORIES.map((moduleCat) => {
                  const catName = moduleCat.category;
                  const isExpanded = Boolean(editingExpanded[catName]);
                  const catObject = editingPermissions[catName] || {};

                  const selectedInCatCount = moduleCat.items.filter((item) =>
                    Boolean(catObject[item.key]?.access)
                  ).length;
                  const isCatAllSelected = selectedInCatCount === moduleCat.items.length && moduleCat.items.length > 0;

                  const handleCategorySelectAll = (categoryName: string, checked: boolean) => {
                    setEditingPermissions((prev) => {
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

                  return (
                    <div
                      key={catName}
                      className="overflow-hidden rounded-xl border border-ink-200 bg-white transition-shadow dark:border-ink-800 dark:bg-ink-950"
                    >
                      <div className="flex items-center justify-between bg-ink-50/70 px-4 py-3 dark:bg-ink-900/70">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isCatAllSelected}
                            onChange={(e) => handleCategorySelectAll(catName, e.target.checked)}
                            className="h-4 w-4 accent-brand-600 rounded cursor-pointer"
                            title={`Select/Deselect all sub-pages in ${catName} Module`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingExpanded((prev) => ({
                                ...prev,
                                [catName]: !prev[catName],
                              }))
                            }
                            className="flex items-center gap-2 text-left text-xs font-bold text-ink-900 dark:text-ink-100 cursor-pointer"
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-ink-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                            <span>{catName} Module</span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-ink-600 shadow-sm dark:bg-ink-800 dark:text-ink-300">
                              {selectedInCatCount} / {moduleCat.items.length} Allowed
                            </span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCategorySelectAll(catName, !isCatAllSelected)}
                          className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-sm hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 cursor-pointer"
                        >
                          {isCatAllSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-brand-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-ink-400" />
                          )}
                          <span>{isCatAllSelected ? 'Deselect Module' : `Select All ${catName}`}</span>
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
                                    className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${flags.can_create
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                                        : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                      }`}
                                  >
                                    Create
                                  </label>
                                  <label
                                    onClick={() => handleEditActionToggle('can_edit')}
                                    className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${flags.can_edit
                                        ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                        : 'border-ink-200 text-ink-400 dark:border-ink-800'
                                      }`}
                                  >
                                    Edit
                                  </label>
                                  <label
                                    onClick={() => handleEditActionToggle('can_delete')}
                                    className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${flags.can_delete
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
