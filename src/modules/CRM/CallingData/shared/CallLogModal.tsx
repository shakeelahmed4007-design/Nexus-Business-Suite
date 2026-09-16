import { useState, useEffect } from 'react';
import { Phone, Clock, User, FileText, Calendar, Tag, CheckCircle2, AlertCircle, DollarSign, Crown } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import type { CallStatus, CallingNumber, DenialReason } from '../types';

const inputCls =
  'h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm text-ink-800 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100';

interface CallLogModalProps {
  open: boolean;
  onClose: () => void;
  targetNumber: CallingNumber | null;
  availableNumbers?: CallingNumber[];
  onSubmit: (payload: {
    callingNumberId: string;
    duration: number;
    callStatus: CallStatus;
    customerName?: string;
    notes: string;
    nextCallbackDate?: string;
    trialPeriod?: string;
    saleAmount?: number;
    denialReason?: DenialReason;
  }) => void;
}

export function CallLogModal({ open, onClose, targetNumber, availableNumbers = [], onSubmit }: CallLogModalProps) {
  const [selectedNumId, setSelectedNumId] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [callStatus, setCallStatus] = useState<CallStatus>('Connected');
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [nextCallbackDate, setNextCallbackDate] = useState<string>('');
  const [trialPeriod, setTrialPeriod] = useState<string>('12 months');
  const [saleAmount, setSaleAmount] = useState<number>(50000);
  const [denialReason, setDenialReason] = useState<DenialReason>('Budget');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (targetNumber) {
      setSelectedNumId(targetNumber.id);
    } else if (availableNumbers.length > 0) {
      setSelectedNumId(availableNumbers[0].id);
    }
    setCustomerName('');
    setNotes('');
    setDuration(90);
    setCallStatus('Connected');
    const tmrw = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setNextCallbackDate(tmrw);
  }, [targetNumber, availableNumbers]);

  const activeNumber = targetNumber || availableNumbers.find(n => n.id === selectedNumId) || availableNumbers[0];

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNumber || !notes.trim()) return;

    setSaving(true);
    setTimeout(() => {
      onSubmit({
        callingNumberId: activeNumber.id,
        duration: Number(duration) || 0,
        callStatus,
        customerName: customerName.trim() || undefined,
        notes: notes.trim(),
        nextCallbackDate: callStatus === 'Callback Later' ? nextCallbackDate : undefined,
        trialPeriod: callStatus === 'Interested' ? trialPeriod : undefined,
        saleAmount: (callStatus === 'Closed Sale' || callStatus === 'Connected') ? Number(saleAmount || 50000) : undefined,
        denialReason: callStatus === 'Not Interested' ? denialReason : undefined,
      });
      setSaving(false);
      onClose();
    }, 300);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Call & Update Status"
      subtitle={activeNumber ? `Log details for number ${activeNumber.phone}` : 'Select a number to log call'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Select phone number if not targetNumber */}
        {!targetNumber && availableNumbers.length > 0 && (
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
              <Phone className="h-3.5 w-3.5 text-brand-500" /> Select Calling Number
            </label>
            <select
              value={selectedNumId}
              onChange={(e) => setSelectedNumId(e.target.value)}
              className={inputCls}
            >
              {availableNumbers.slice(0, 50).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.phone} — {n.agentName || 'Agent'} ({n.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Phone Info Banner */}
        {activeNumber && (
          <div className="flex items-center justify-between rounded-xl bg-brand-50/80 p-3 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white font-semibold">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-ink-900 dark:text-ink-50">{activeNumber.phone}</p>
                <p className="text-xs text-ink-500">Allocated to: {activeNumber.agentName || 'Agent'}</p>
              </div>
            </div>
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
              Calls Made: {activeNumber.callCount}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Duration */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
              <Clock className="h-3.5 w-3.5 text-brand-500" /> Duration (seconds)
            </label>
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
              required
            />
          </div>

          {/* Call Status */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
              <Tag className="h-3.5 w-3.5 text-brand-500" /> Call Outcome / Action
            </label>
            <select
              value={callStatus}
              onChange={(e) => setCallStatus(e.target.value as CallStatus)}
              className={inputCls}
            >
              <option value="Connected">Connected (General Talk)</option>
              <option value="Closed Sale">💰 Closed Sale (Send to Sales & Customers)</option>
              <option value="Interested">🌟 Interested (Convert to Trial Lead)</option>
              <option value="Callback Later">⏰ Callback Later (Scheduled Lead)</option>
              <option value="Escalate to Admin">👑 Escalate / Send to Admin Pool</option>
              <option value="No Response">No Response</option>
              <option value="Busy">Busy</option>
              <option value="Not Interested">Not Interested (Denied)</option>
              <option value="Invalid">Invalid Number</option>
            </select>
          </div>
        </div>

        {/* Customer Name */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
            <User className="h-3.5 w-3.5 text-brand-500" /> Customer / Business Name
          </label>
          <input
            type="text"
            placeholder="e.g. Saeed Super Store (Ali Khan)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Conditional status inputs */}
        {callStatus === 'Closed Sale' && (
          <div className="animate-fade-in rounded-xl bg-emerald-50 p-3 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Closed Sale Deal Amount (PKR)
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={saleAmount}
              onChange={(e) => setSaleAmount(Number(e.target.value))}
              className={inputCls}
              required
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              ✅ Saving as <strong>Closed Sale</strong> will instantly add this deal to the <strong>Sales & Customers</strong> page, update your revenue dashboard, and log customer info!
            </p>
          </div>
        )}

        {callStatus === 'Escalate to Admin' && (
          <div className="animate-fade-in rounded-xl bg-amber-50 p-3 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Crown className="h-4 w-4 text-amber-600" /> Send Back / Return to Admin Pool
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              👑 This number will be returned to Admin's available pool so Admin can re-allocate it to another agent or take management action.
            </p>
          </div>
        )}

        {callStatus === 'Callback Later' && (
          <div className="animate-fade-in rounded-xl bg-amber-50/70 p-3 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Calendar className="h-3.5 w-3.5 text-amber-600" /> Scheduled Callback Date
            </label>
            <input
              type="date"
              value={nextCallbackDate}
              onChange={(e) => setNextCallbackDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>
        )}

        {callStatus === 'Interested' && (
          <div className="animate-fade-in rounded-xl bg-emerald-50/70 p-3 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Offered Trial Period
            </label>
            <select
              value={trialPeriod}
              onChange={(e) => setTrialPeriod(e.target.value)}
              className={inputCls}
            >
              <option value="6 months">6 Months Trial</option>
              <option value="12 months">12 Months Trial</option>
              <option value="18 months">18 Months Trial</option>
            </select>
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
              Saving as Interested automatically creates a Lead on the Trial page!
            </p>
          </div>
        )}

        {callStatus === 'Connected' && (
          <div className="animate-fade-in rounded-xl bg-indigo-50/70 p-3 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-300">
              Sale Value Amount (PKR) - Optional
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={saleAmount}
              onChange={(e) => setSaleAmount(Number(e.target.value))}
              className={inputCls}
            />
          </div>
        )}

        {callStatus === 'Not Interested' && (
          <div className="animate-fade-in rounded-xl bg-rose-50/70 p-3 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Reason for Denial
            </label>
            <select
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value as DenialReason)}
              className={inputCls}
            >
              <option value="Budget">High Budget / Price Issue</option>
              <option value="Not Interested">Not Interested in Product</option>
              <option value="Wrong Number">Wrong / Invalid Number</option>
              <option value="Competitor">Using Competitor</option>
              <option value="Other">Other Reasons</option>
            </select>
          </div>
        )}

        {/* Call Notes */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
            <FileText className="h-3.5 w-3.5 text-brand-500" /> Call Notes / Discussion Summary
          </label>
          <textarea
            rows={3}
            placeholder="Enter key outcome, questions asked, or next steps..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm text-ink-800 placeholder-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving || !activeNumber}>
            {saving ? 'Saving...' : callStatus === 'Closed Sale' ? '💰 Save & Move to Sales' : callStatus === 'Escalate to Admin' ? '👑 Return to Admin Pool' : 'Save Call Log'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
