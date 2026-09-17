import type { CallingNumberStatus, CallStatus, LeadStatus } from '../types';

interface StatusBadgeProps {
  status: CallingNumberStatus | CallStatus | LeadStatus | string;
  variant?: 'calling' | 'callLog' | 'lead' | 'trial' | 'renewal';
  remainingMonths?: number;
  daysUntilRenewal?: number;
}

export function StatusBadge({ status, variant = 'lead', remainingMonths, daysUntilRenewal }: StatusBadgeProps) {
  let color = 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300';

  if (variant === 'calling') {
    switch (status) {
      case 'Available':
      case 'Unassigned':
        color = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
        break;
      case 'Allocated':
      case 'Assigned':
        color = 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
        break;
      case 'Used':
        color = 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
        break;
      case 'Expired':
        color = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
        break;
      default:
        color = 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300';
    }
  } else if (variant === 'callLog') {
    switch (status) {
      case 'Connected':
        color = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
        break;
      case 'Interested':
        color = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400';
        break;
      case 'Callback Later':
        color = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
        break;
      case 'Not Interested':
      case 'Invalid':
        color = 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
        break;
      case 'Busy':
      case 'No Response':
        color = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
        break;
    }
  } else if (variant === 'lead') {
    switch (status) {
      case 'New':
        color = 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400';
        break;
      case 'Trial':
        color = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400';
        break;
      case 'Sales':
        color = 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400';
        break;
      case 'Denied':
        color = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400';
        break;
      case 'Renewal':
        color = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400';
        break;
      case 'Lead':
        color = 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400';
        break;
    }
  } else if (variant === 'trial' && remainingMonths !== undefined) {
    if (remainingMonths > 6) {
      color = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400';
    } else if (remainingMonths > 2) {
      color = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400';
    } else {
      color = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400';
    }
  } else if (variant === 'renewal' && daysUntilRenewal !== undefined) {
    if (daysUntilRenewal > 60) {
      color = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400';
    } else if (daysUntilRenewal > 15) {
      color = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400';
    } else {
      color = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400';
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide shadow-2xs ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  );
}
