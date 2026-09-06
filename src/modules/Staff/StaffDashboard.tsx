import { useAuth } from '@/shared/context/AuthContext';
import { UserCheck, LogOut } from 'lucide-react';

export function StaffDashboard() {
  const { profile, shopId, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-2">
          <UserCheck className="w-8 h-8" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">Staff Agent Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">Welcome, {profile?.full_name || profile?.email}</p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl text-left border border-slate-800 space-y-2 text-xs text-slate-300">
          <div><span className="text-slate-500 font-medium">Role:</span> <span className="text-emerald-400 font-semibold uppercase">{profile?.role}</span></div>
          <div><span className="text-slate-500 font-medium">Shop ID:</span> <span className="font-mono text-slate-300">{shopId || 'N/A'}</span></div>
          <div><span className="text-slate-500 font-medium">Access Control:</span> <span className="text-emerald-400 font-medium">RBAC & RLS Restricted</span></div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <p className="text-sm text-slate-400 mb-4">Staff Agent Module Dashboard coming soon!</p>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
