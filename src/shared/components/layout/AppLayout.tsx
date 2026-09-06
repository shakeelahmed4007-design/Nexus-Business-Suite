import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-ink-50 dark:bg-ink-950">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={collapsed ? 'w-full lg:pl-[72px] transition-all duration-300' : 'w-full lg:pl-[264px] transition-all duration-300'}>
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main key={location.pathname} className="w-full animate-fade-in p-3 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
