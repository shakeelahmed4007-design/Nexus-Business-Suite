import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={collapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'}>
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main key={location.pathname} className="animate-fade-in p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
