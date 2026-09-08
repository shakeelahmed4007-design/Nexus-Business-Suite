import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UserCheck,
  Mail,
  Phone,
  User,
  Building2,
  Activity,
  Key,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { addAdmin, NestedCrudPermissions, getNestedCrudPermissions } from '@/shared/lib/adminStore';
import { validateMemberViaApi, MemberValidationResult } from '@/shared/lib/memberValidationService';
import { useAuth } from '@/shared/context/AuthContext';

export interface StaffMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'Staff' | 'Agent' | 'Support';
  department: 'Sales' | 'Support' | 'Inventory' | 'Operations';
  shopAssignments: string[];
  status: 'Active' | 'Inactive';
  password?: string;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
  const { user, profile } = useAuth();
  const currentUserEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const currentRole = (profile?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  const isSuperAdmin = currentRole === 'super_admin' || (currentUserEmail !== '' && (currentUserEmail === 'admin@nexus.com' || currentUserEmail === 'superadmin@nexus.com' || currentUserEmail.includes('superadmin')));
  const createdByRole = isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Staff' | 'Agent' | 'Support'>('Staff');
  const [department, setDepartment] = useState<'Sales' | 'Support' | 'Inventory' | 'Operations'>('Operations');
  const [shopAssignments, setShopAssignments] = useState<string[]>(['shop-001']);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [password, setPassword] = useState('Nexus#2026!Staff');

  // UI State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Validation State
  const [validationResult, setValidationResult] = useState<MemberValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Reset form on modal open
  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setRole('Staff');
      setDepartment('Operations');
      setShopAssignments(['shop-001']);
      setStatus('Active');
      setPassword(generateStrongPassword());
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Real-time AI validation effect
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsValidating(true);
      const fullName = `${firstName} ${lastName}`.trim();
      const res = await validateMemberViaApi({
        full_name: fullName,
        email,
        phone,
        role,
        department,
        status,
        shop_id: shopAssignments.join(', '),
        password,
      });
      setValidationResult(res);
      setIsValidating(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [firstName, lastName, email, phone, role, department, shopAssignments, status, password, isOpen]);

  function generateStrongPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let pass = 'Nexus#';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + '!2026';
  }

  const handleAutoGeneratePassword = () => {
    const newPass = generateStrongPassword();
    setPassword(newPass);
  };

  const handleApplyAISuggestions = () => {
    if (!validationResult) return;

    if (validationResult.aiRecommendations?.departmentMatch) {
      const matched = validationResult.aiRecommendations.departmentMatch;
      if (['Sales', 'Support', 'Inventory', 'Operations'].includes(matched)) {
        setDepartment(matched as any);
      }
    }

    const passSuggestion = validationResult.suggestions.find((s: string) => s.includes('Recommended strong password:'));

    if (passSuggestion) {
      const match = passSuggestion.match(/'([^']+)'/);
      if (match && match[1]) {
        setPassword(match[1]);
      }
    }

    if (email && !email.includes('@mtnexusglobal.com')) {
      const namePart = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '.') || 'staff';
      setEmail(`${namePart}@mtnexusglobal.com`);
    }

    setSuccessMsg('Applied AI suggestions for Department, Email Domain & Password!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const fullName = `${firstName} ${lastName}`.trim();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('Please enter First Name, Last Name, and Email.');
      return;
    }

    if (validationResult && !validationResult.isValid) {
      setErrorMsg(`Cannot save: ${validationResult.validationErrors.join(' | ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Try sending to Express Backend Endpoint /api/staff/create-staff
      const res = await fetch('/api/staff/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          role,
          department,
          shopAssignments,
          status,
          password,
          created_by_role: createdByRole,
          created_by_email: currentUserEmail,
          created_by_id: user?.id,
        }),
      });

      if (!res.ok) {
        // Fallback to local adminStore addAdmin
        const defaultStaffPerms: NestedCrudPermissions = getNestedCrudPermissions(false);
        await addAdmin({
          full_name: fullName,
          email,
          phone,
          department,
          status,
          shop_id: shopAssignments.join(','),
          password,
          role: role.toLowerCase(),
          permissions: defaultStaffPerms,
          created_by_role: createdByRole,
          created_by_email: currentUserEmail,
          created_by_id: user?.id,
        });
      }

      setSuccessMsg(`Staff Member "${fullName}" created successfully!`);
      setIsSubmitting(false);

      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create staff member.');
      setIsSubmitting(false);
    }
  };

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
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/50 px-6 py-4 dark:border-ink-800 dark:bg-ink-950/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">
                  Add New Staff Member
                </h2>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  Super Admin Console — Create operational staff, agents, & support accounts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto scrollbar-thin">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* AI Member Validation Live Assistant Card */}
            {validationResult && (
              <div className={`rounded-xl border p-3.5 text-xs transition-all ${validationResult.isValid
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/30'
                  : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/30'
                }`}>
                <div className="flex items-center justify-between border-b border-ink-200/60 pb-2.5 dark:border-ink-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600 animate-pulse" />
                    <span className="font-bold text-ink-900 dark:text-ink-50">
                      Nexus AI Staff Member Validator
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${validationResult.isValid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                      {validationResult.isValid ? 'VALID' : 'ATTENTION'}
                    </span>
                  </div>
                  {validationResult.suggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyAISuggestions}
                      className="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-500"
                    >
                      Apply AI Suggestions
                    </button>
                  )}
                </div>

                {validationResult.validationErrors.length > 0 && (
                  <div className="mt-2 text-rose-600 dark:text-rose-300 font-medium">
                    ❌ Errors: {validationResult.validationErrors.join(', ')}
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="mt-1 text-amber-700 dark:text-amber-300 font-medium">
                    ⚠️ Warnings: {validationResult.warnings.join(', ')}
                  </div>
                )}

                {validationResult.suggestions.length > 0 && (
                  <div className="mt-1 text-brand-700 dark:text-brand-300 font-medium">
                    💡 Suggestions: {validationResult.suggestions.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Usman"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Khan"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    required
                    placeholder="usman@nexusglobal.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="+923001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                  />
                </div>
              </div>
            </div>

            {/* Role & Department */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Staff Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-semibold"
                >
                  <option value="Staff">Staff</option>
                  <option value="Agent">Agent</option>
                  <option value="Support">Support</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-3 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-semibold"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Support">Support</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>
            </div>


            {/* Status & Password */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
                  Account Status
                </label>
                <div className="relative">
                  <Activity className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-3 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePassword}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    <RefreshCw className="h-3 w-3" /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-xs text-ink-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-ink-100 dark:border-ink-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2 text-xs font-semibold text-white shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                {isSubmitting ? 'Creating Staff Account...' : 'Create Staff Member'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
