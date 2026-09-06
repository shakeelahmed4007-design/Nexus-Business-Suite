import { Lock, ShieldAlert } from 'lucide-react';

export function AccessPendingBanner({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 p-5 shadow-sm dark:border-amber-500/30">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
            <Lock className="h-4 w-4" />
            {title || 'Data Access Pending Authorization'}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-300/80">
            {subtitle ||
              'Super Admin has not granted data access permissions to your admin account yet. All statistics, reports, and table pages will remain empty until Super Admin grants access.'}
          </p>
        </div>
      </div>
    </div>
  );
}
