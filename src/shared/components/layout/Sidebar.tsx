import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Hexagon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { navGroups, navItems } from '@/shared/config/nav';
import { useTheme } from '@/shared/context/ThemeContext';
import { useAuth } from '@/shared/context/AuthContext';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { getCrudFlags } from '@/shared/lib/adminStore';

type SidebarProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { theme } = useTheme();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 264 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={clsx(
          'fixed left-0 top-0 z-50 hidden h-full flex-col border-r border-ink-200 bg-white lg:flex',
        )}
      >
        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 flex h-full w-[264px] flex-col border-r border-ink-200 bg-white lg:hidden"
          >
            <SidebarContent collapsed={false} setCollapsed={() => { }} onNavClick={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  collapsed,
  setCollapsed,
  onNavClick,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onNavClick?: () => void;
}) {
  const { role } = useAuth();
  const { isSuperAdmin, permissions } = useDataAccess();

  const moduleKeyMap: Record<string, string> = {
    '/': 'dashboard',
    '/reports': 'reports',
    '/leads': 'lead_management',
    '/customers': 'customer_data',
    '/calls': 'calling_data',
    '/tasks': 'tasks_followups',
    '/smart-followup': 'smart_followup_ai',
    '/pos': 'pos',
    '/orders': 'orders',
    '/invoices': 'invoices',
    '/payments': 'payments',
    '/purchases': 'purchases',
    '/stock': 'stock',
    '/warehouse': 'warehouse',
    '/vendors': 'vendors',
    '/hr': 'hr',
    '/social': 'social',
    '/messages': 'messages',
    '/auto-report': 'auto_report',
    '/forecasting': 'forecasting',
  };

  // Filter sidebar menu items dynamically based on current admin permissions
  const filteredNavItems = navItems.filter((n) => {
    if (isSuperAdmin) return true;
    if (n.path === '/admin-management') return isSuperAdmin;
    const key = moduleKeyMap[n.path];
    if (!key) return true;
    const flags = getCrudFlags(permissions, key);
    return flags.access;
  });

  // Display parent module headers ONLY if at least one sub-page under that module is allowed
  const filteredNavGroups = Array.from(new Set(filteredNavItems.map((n) => n.group)));

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-ink-200 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow">
          <Hexagon className="h-5 w-5 text-white" fill="white" fillOpacity={0.2} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-ink-900">Nexus</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-ink-500">Business Suite</p>
          </div>
        )}
      </div>

      {/* Dynamic Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {filteredNavGroups.length > 0 ? (
          filteredNavGroups.map((group) => (
            <div key={group} className="mb-4">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{group}</p>
              )}
              <div className="space-y-0.5">
                {filteredNavItems
                  .filter((n) => n.group === group)
                  .map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onNavClick}
                      className={({ isActive }) =>
                        clsx(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                          isActive
                            ? 'bg-brand-50 font-semibold text-brand-600'
                            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                          collapsed && 'justify-center',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div
                              layoutId="active-nav"
                              className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600"
                            />
                          )}
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <div className="px-3 py-6 text-center text-xs text-ink-400">
            No active menu permissions granted.
          </div>
        )}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="hidden border-t border-ink-200 p-3 lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ChevronLeft className={clsx('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );
}
