import { useState, useEffect } from 'react';
import { Users, CheckSquare, Square, Layers, Sparkles, UserCheck, UserPlus, Plus, ShieldCheck } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { addAdmin, getRolePresetPermissions } from '@/shared/lib/adminStore';
import { AddTeamMemberModal } from '@/modules/Admin/AddTeamMemberModal';
import type { SalesAgent } from '../types';

interface AllocateModalProps {
  open: boolean;
  onClose: () => void;
  agents: SalesAgent[];
  availableCount: number;
  onAllocate: (selectedAgentIds: string[], countPerAgent: number) => void;
}

export function AllocateModal({ open, onClose, agents, availableCount, onAllocate }: AllocateModalProps) {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [countPerAgent, setCountPerAgent] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Quick Add Member Inline state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'sales' | 'staff'>('sales');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  // Full Team Management modal state
  const [fullModalOpen, setFullModalOpen] = useState(false);

  // Sync selected agents & sensible default count when modal opens or agents change
  useEffect(() => {
    if (open && agents.length > 0) {
      if (selectedAgentIds.length === 0) {
        setSelectedAgentIds([agents[0].id]);
      }
      setCountPerAgent(1);
    }
  }, [open, agents]);

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const selectOnlyAgent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAgentIds([id]);
  };

  const toggleAll = () => {
    if (selectedAgentIds.length === agents.length) {
      setSelectedAgentIds([]);
    } else {
      setSelectedAgentIds(agents.map((a) => a.id));
    }
  };

  const handleCreateQuickMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError(null);

    if (!newName.trim() || !newEmail.trim()) {
      setQuickAddError('Please enter full name and email.');
      return;
    }

    setAddingMember(true);
    try {
      const created = await addAdmin({
        full_name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        password: '123456',
        permissions: getRolePresetPermissions(newRole),
      });

      // Dispatch global event so useCallingDataStore & stores update
      window.dispatchEvent(new Event('nexus_admins_changed'));

      // Automatically select the new member
      setSelectedAgentIds([created.id]);
      setNewName('');
      setNewEmail('');
      setShowQuickAdd(false);
    } catch (err: any) {
      setQuickAddError(err.message || 'Failed to add team member.');
    } finally {
      setAddingMember(false);
    }
  };

  const totalRequired = selectedAgentIds.length * countPerAgent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAgentIds.length === 0 || countPerAgent <= 0) return;

    setSaving(true);
    setTimeout(() => {
      onAllocate(selectedAgentIds, countPerAgent);
      setSaving(false);
      onClose();
    }, 300);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Allocate Calling Numbers to Agents"
        subtitle="Assign available numbers to specific team members or distribute in quantities."
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Pool Summary Box */}
          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
              <span>Available Unallocated Numbers in Pool:</span>
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                {availableCount} Numbers
              </span>
            </div>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
              Total to be assigned now: <strong className="font-mono text-sm font-bold">{totalRequired}</strong> number(s)
              {selectedAgentIds.length === 1 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  (Single Agent Assignment)
                </span>
              )}
            </p>
          </div>

          {/* Quantity per agent & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
                <Layers className="h-3.5 w-3.5 text-brand-500" /> Quantity per Agent
              </label>
              <span className="text-[11px] text-ink-400">Quick presets below:</span>
            </div>

            <input
              type="number"
              min="1"
              max={availableCount > 0 ? availableCount : 1000}
              value={countPerAgent}
              onChange={(e) => setCountPerAgent(Math.max(1, Number(e.target.value)))}
              className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 font-mono font-bold focus:border-brand-400 focus:bg-white focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
              required
            />

            {/* Quick Preset Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1, 5, 10, 25, 50, availableCount].map((qty, idx) => {
                if (qty <= 0) return null;
                const isSelected = countPerAgent === qty;
                const isMax = idx === 5;
                return (
                  <button
                    key={`preset-${qty}-${idx}`}
                    type="button"
                    onClick={() => setCountPerAgent(qty)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${isSelected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                      : 'bg-ink-50 text-ink-700 border-ink-200 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-300 dark:border-ink-700'
                      }`}
                  >
                    {isMax ? `Max (${availableCount})` : `${qty} ${qty === 1 ? 'Number' : 'Nums'}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agent Checkboxes & Add Agent Header */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
                <Users className="h-3.5 w-3.5 text-brand-500" /> Select Sales / Staff Person
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 px-2 py-1 rounded-lg transition-colors border border-brand-200 dark:border-brand-500/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showQuickAdd ? 'Cancel Quick Add' : 'Add Team Member'}
                </button>

                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {selectedAgentIds.length === agents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Quick Add Team Member Inline Form */}
            {showQuickAdd && (
              <div className="mb-3 p-3.5 rounded-xl bg-brand-50/70 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-brand-600" /> Add New Sales / Staff Person
                  </span>
                  <button
                    type="button"
                    onClick={() => setFullModalOpen(true)}
                    className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300 flex items-center gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" /> Advanced Permissions Modal
                  </button>
                </div>

                {quickAddError && (
                  <p className="mb-2 text-xs font-semibold text-red-600 dark:text-red-400">{quickAddError}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Ali Raza)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 rounded-lg border border-brand-200 bg-white px-2.5 text-xs text-ink-800 focus:outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (e.g. ali@nexus.com)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-8 rounded-lg border border-brand-200 bg-white px-2.5 text-xs text-ink-800 focus:outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                    required
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="h-8 rounded-lg border border-brand-200 bg-white px-2 text-xs font-semibold text-ink-800 focus:outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                  >
                    <option value="sales">Sales Member</option>
                    <option value="staff">Staff Member</option>
                  </select>
                </div>

                <div className="mt-2.5 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateQuickMember}
                    disabled={addingMember}
                    className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    {addingMember ? 'Adding...' : 'Save & Select Member'}
                  </Button>
                </div>
              </div>
            )}

            {/* Agent Checkbox List */}
            <div className="space-y-2 max-h-56 overflow-y-auto rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-700 dark:bg-ink-900">
              {agents.map((ag) => {
                const isChecked = selectedAgentIds.includes(ag.id);
                return (
                  <div
                    key={ag.id}
                    onClick={() => toggleAgent(ag.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors ${isChecked
                      ? 'bg-brand-50/80 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30'
                      : 'hover:bg-ink-50 dark:hover:bg-ink-800/50 border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-brand-600 dark:text-brand-400">
                        {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-ink-400" />}
                      </button>
                      <div>
                        <p className="text-xs font-bold text-ink-900 dark:text-ink-100">{ag.name}</p>
                        <p className="text-[11px] text-ink-400">{ag.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => selectOnlyAgent(ag.id, e)}
                        className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-300"
                        title="Assign only to this person"
                      >
                        <UserCheck className="h-3 w-3 inline mr-1" />
                        Only This Person
                      </button>
                      <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                        Allocating {countPerAgent}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || selectedAgentIds.length === 0}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {saving ? 'Allocating...' : `Assign ${totalRequired} Number(s)`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Advanced Add Team Member Modal */}
      <AddTeamMemberModal
        isOpen={fullModalOpen}
        onClose={() => {
          setFullModalOpen(false);
          window.dispatchEvent(new Event('nexus_admins_changed'));
        }}
        defaultRole="sales"
      />
    </>
  );
}
