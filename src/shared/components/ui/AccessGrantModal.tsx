import React, { useState } from 'react';
import { Shield, UserCheck, Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface AccessGrantModalProps {
  open: boolean;
  onClose: () => void;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  currentOwnerName?: string;
}

export function AccessGrantModal({
  open,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  currentOwnerName,
}: AccessGrantModalProps) {
  const [targetType, setTargetType] = useState<'user' | 'role'>('role');
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'shop_admin' | 'staff'>('shop_admin');
  const [targetUserId, setTargetUserId] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'write' | 'full'>('read');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const payload = {
        resourceType,
        resourceId,
        grantedToUserId: targetType === 'user' ? targetUserId.trim() : undefined,
        grantedToRole: targetType === 'role' ? selectedRole : undefined,
        permissionLevel,
      };

      const res = await fetch('/api/access-permissions/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          type: 'success',
          text: `Access granted successfully to ${targetType === 'role' ? selectedRole : targetUserId}!`,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to grant access' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Network error while granting access' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900 border border-ink-100 dark:border-ink-800">
        <div className="flex items-center justify-between pb-4 border-b border-ink-100 dark:border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-ink-900 dark:text-white">Grant Access Permission</h3>
              <p className="text-xs text-ink-400 capitalize">{resourceType}: {resourceName || resourceId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleGrant} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">
              Grant Access To:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('role')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-medium transition-all ${
                  targetType === 'role'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-ink-50 text-ink-600 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-300'
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Entire Role
              </button>
              <button
                type="button"
                onClick={() => setTargetType('user')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-medium transition-all ${
                  targetType === 'user'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-ink-50 text-ink-600 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-300'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" /> Specific User ID
              </button>
            </div>
          </div>

          {targetType === 'role' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
                Select Target Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full rounded-xl border border-ink-200 bg-ink-50 p-2.5 text-xs text-ink-900 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              >
                <option value="super_admin">Super Admin</option>
                <option value="shop_admin">Shop Admin</option>
                <option value="staff">Sales & Staff</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
                Target User ID or Email:
              </label>
              <input
                type="text"
                placeholder="Enter User ID or Email"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
                className="w-full rounded-xl border border-ink-200 bg-ink-50 p-2.5 text-xs text-ink-900 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
              Permission Level:
            </label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value as any)}
              className="w-full rounded-xl border border-ink-200 bg-ink-50 p-2.5 text-xs text-ink-900 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            >
              <option value="read">Read Only (View Data)</option>
              <option value="write">Read & Write (Edit Data)</option>
              <option value="full">Full Control (Manage & Delete)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-700 disabled:opacity-50"
            >
              <Shield className="h-3.5 w-3.5" />
              {loading ? 'Granting Access...' : 'Confirm Access Grant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
