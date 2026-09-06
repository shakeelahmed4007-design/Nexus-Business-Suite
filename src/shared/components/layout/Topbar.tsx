import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Settings,
  User,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useAuth } from '@/shared/context/AuthContext';

type TopbarProps = {
  onMenuClick: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, profile, role, signOut } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || user?.email || 'User';
  const displayEmail = profile?.email || user?.email || '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/80 px-4 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/80">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Search anything..."
          className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-4 text-sm text-ink-700 placeholder-ink-400 transition-all focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:focus:bg-ink-900"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-lg p-2 text-ink-500 transition-all hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-ink-950" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card-lg dark:border-ink-800 dark:bg-ink-900"
              >
                <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-ink-800">
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Notifications</p>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">3 new</span>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.map((n, i) => (
                    <div key={i} className="flex gap-3 border-b border-ink-100 px-4 py-3 transition-colors last:border-0 hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/40">
                      <div className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.color)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{n.title}</p>
                        <p className="truncate text-xs text-ink-500 dark:text-ink-400">{n.desc}</p>
                        <p className="mt-1 text-[11px] text-ink-400">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={() => alert('Opening Settings...')} className="rounded-lg p-2 text-ink-500 transition-all hover:bg-ink-100 dark:hover:bg-ink-800">
          <Settings className="h-5 w-5" />
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-ink-800 dark:text-ink-100">{displayName}</p>
              <p className="text-[10px] text-ink-500 uppercase font-medium dark:text-ink-400">{role || 'User'}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card-lg dark:border-ink-800 dark:bg-ink-900"
              >
                <div className="border-b border-ink-200 px-4 py-3 dark:border-ink-800">
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{displayName}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{displayEmail}</p>
                </div>
                {[
                  { icon: User, label: 'My Profile' },
                  { icon: Settings, label: 'Settings' },
                  { icon: HelpCircle, label: 'Help & Support' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-600 transition-colors hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800/50"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-ink-200 dark:border-ink-800">
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

const notifications = [
  { title: 'Low stock alert', desc: 'Wireless Headphones below threshold (12 units)', time: '5 min ago', color: 'bg-rose-500' },
  { title: 'New lead assigned', desc: 'Sara Ahmed from inquiry form — Hot lead', time: '1 hour ago', color: 'bg-brand-500' },
  { title: 'Payment received', desc: 'Invoice INV-2043 paid — PKR 45,000', time: '3 hours ago', color: 'bg-emerald-500' },
];
