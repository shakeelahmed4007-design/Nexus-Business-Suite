import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UserPlus,
  Briefcase,
  UserCheck,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import {
  addAdmin,
  MODULE_CATEGORIES,
  getNestedCrudPermissions,
  NestedCrudPermissions,
  getEffectiveAdminPermissions,
  isPermissionAllowedByAdmin,
} from '@/shared/lib/adminStore';

interface QuickAddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'sales' | 'staff';
}

export function QuickAddTeamModal({ isOpen, onClose, role }: QuickAddTeamModalProps) {
  const { user, profile } = useAuth();
  const adminPerms = getEffectiveAdminPermissions(user?.email, profile?.role);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPassword('123456');
      setPhone('');
      setDesignation(role === 'sales' ? 'Sales Representative' : 'Staff Member');
      setError(null);
      setSuccess(null);
      setIsSubmitting(false);
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  const isSales = role === 'sales';

  // Helper to generate default preset permissions per role, filtered by Admin's own permissions
  const generatePresetPermissions = (): NestedCrudPermissions => {
    const perms = getNestedCrudPermissions(false);
    if (isSales) {
      MODULE_CATEGORIES.forEach((cat) => {
        if (cat.category === 'Sales' || cat.category === 'CRM' || cat.category === 'Overview') {
          perms[cat.category] = {};
          cat.items.forEach((item) => {
            const isAllowed = isPermissionAllowedByAdmin(adminPerms, cat.category, item.key);
            perms[cat.category][item.key] = {
              access: isAllowed,
              can_create: isAllowed,
              can_edit: isAllowed,
              can_delete: false,
            };
          });
        }
      });
    } else {
      MODULE_CATEGORIES.forEach((cat) => {
        if (
          cat.category === 'Inventory' ||
          cat.category === 'Sales' ||
          cat.category === 'Organization' ||
          cat.category === 'Overview'
        ) {
          perms[cat.category] = {};
          cat.items.forEach((item) => {
            const isAllowed = isPermissionAllowedByAdmin(adminPerms, cat.category, item.key);
            perms[cat.category][item.key] = {
              access: isAllowed,
              can_create: isAllowed,
              can_edit: isAllowed,
              can_delete: false,
            };
          });
        }
      });
    }
    return perms;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError('Please enter the full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
      const currentRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
      const isSuperAdmin = currentRole === 'super_admin' || (currentUserEmail !== '' && (currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || currentUserEmail.includes('superadmin')));
      const createdByRole = isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';

      const defaultPerms = generatePresetPermissions();
      await addAdmin({
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
        role: role,
        permissions: defaultPerms,
        created_by_role: createdByRole,
        created_by_email: currentUserEmail,
        created_by_id: user?.id,
      });

      setSuccess(
        `${isSales ? 'Sales' : 'Staff'} member account for "${fullName.trim()}" created & synced to Supabase!`
      );

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to create team member account.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 shadow-2xl dark:border-ink-800 dark:bg-ink-900"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  isSales
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}
              >
                {isSales ? <Briefcase className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-900 dark:text-ink-50">
                  {isSales ? 'Add Sales Team Member' : 'Add Staff Team Member'}
                </h3>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Enter details to create a new {isSales ? 'Sales Executive' : 'Staff'} account.
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

          {/* Quick Role Access Info Banner */}
          <div
            className={`mt-4 flex items-center gap-2.5 rounded-xl border p-3 text-xs ${
              isSales
                ? 'border-brand-200 bg-brand-50/60 text-brand-800 dark:border-brand-900/40 dark:bg-brand-950/40 dark:text-brand-300'
                : 'border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              <strong>Access Info:</strong> This account will automatically get default permissions for{' '}
              {isSales ? 'Sales & CRM' : 'Inventory, Sales & Operations'} modules.
            </span>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  required
                  placeholder={isSales ? 'e.g. Ali Ahmed' : 'e.g. Hassan Raza'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                />
              </div>
            </div>

            {/* Email Address & Password */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    required
                    placeholder={isSales ? 'ali@nexus.com' : 'hassan@nexus.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number & Designation */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  {isSales ? 'Sales Role / Title' : 'Department / Role'}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder={isSales ? 'e.g. Senior Sales Agent' : 'e.g. Warehouse Lead'}
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-ink-100 dark:border-ink-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-all hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                  isSales
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 shadow-brand-500/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-500/20'
                }`}
              >
                {isSales ? <Briefcase className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                <span>{isSales ? 'Create Sales Member' : 'Create Staff Member'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
