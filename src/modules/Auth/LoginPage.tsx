import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { Lock, Mail, AlertCircle, Hexagon, Eye, EyeOff, UserCheck } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: authError, role: userRole } = await signIn(email, password);

    if (authError) {
      setError(authError.message || 'Invalid login credentials');
      setIsSubmitting(false);
    } else {
      if (userRole === 'sales' || userRole === 'staff') {
        navigate('/sales');
      } else {
        navigate('/');
      }
    }
  };

  const handleQuickSuperAdmin = () => {
    setEmail('admin@nexus.com');
    setPassword('123456');
  };

  return (
    <div className="relative min-h-screen w-full bg-ink-950 text-ink-100 flex items-center justify-center p-4 overflow-hidden">
      {/* Background ambient lighting matching project theme */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />

      <div className="relative z-10 max-w-md w-full space-y-8 bg-ink-900/90 backdrop-blur-xl p-8 rounded-2xl border border-ink-800 shadow-card-lg">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl text-white shadow-glow mb-1">
            <Hexagon className="w-7 h-7 text-white" fill="white" fillOpacity={0.2} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-50">Nexus Ledger & CRM</h2>
          <p className="text-sm text-ink-400">Sign in to access your multi-tenant workspace</p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 text-sm text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nexus.com"
                className="w-full pl-10 pr-4 py-2.5 bg-ink-950/80 border border-ink-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-ink-100 placeholder-ink-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-ink-950/80 border border-ink-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-ink-100 placeholder-ink-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 focus:outline-none p-1 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm shadow-brand-600/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-3 text-center border-t border-ink-800/80">
          <button
            onClick={handleQuickSuperAdmin}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center justify-center gap-1.5 mx-auto font-medium transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" /> Quick fill Super Admin (admin@nexus.com)
          </button>
        </div>
      </div>
    </div>
  );
}
