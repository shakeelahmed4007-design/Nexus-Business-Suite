import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { addAdmin, getRolePresetPermissions } from '@/shared/lib/adminStore';
import {
  Lock,
  Mail,
  AlertCircle,
  Hexagon,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  UserPlus,
  LogIn,
} from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'sales' | 'staff'>('admin');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
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
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      await addAdmin({
        full_name: fullName.trim(),
        email: cleanEmail,
        password,
        role,
        permissions: getRolePresetPermissions(role),
      });

      // Auto sign in after sign up
      const { error: signErr, role: userRole } = await signIn(cleanEmail, password);
      if (signErr) {
        setSuccessMsg('Account created successfully! Please sign in.');
        setMode('login');
      } else {
        if (userRole === 'sales' || userRole === 'staff') {
          navigate('/sales');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    // Simulate sending password reset instructions
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg(`Password reset instructions have been sent to ${email.trim()}.`);
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full bg-white text-ink-900 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Light blue soft ambient accents matching project theme */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-50/40 blur-3xl" />

      {/* Main Container Card */}
      <div className="relative z-10 max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-ink-200/80 shadow-2xl shadow-brand-900/5">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl text-white shadow-lg shadow-brand-500/25 mb-1">
            <Hexagon className="w-7 h-7 text-white" fill="white" fillOpacity={0.25} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Nexus Ledger & CRM</h2>
          <p className="text-xs text-ink-500 font-medium">
            {mode === 'login' && 'Sign in to access your business management workspace'}
            {mode === 'signup' && 'Create your account to start managing your workspace'}
            {mode === 'forgot' && 'Reset your account password quickly and securely'}
          </p>
        </div>


        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-center gap-2.5 p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* ======================= 1. LOGIN MODE ======================= */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexus.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 focus:outline-none p-1 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Account</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-ink-500">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ======================= 2. SIGN UP MODE ======================= */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
              >
                <option value="admin">Administrator (Shop Admin)</option>
                <option value="sales">Sales Agent</option>
                <option value="staff">Staff Member</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full pl-9 pr-3 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Confirm</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className="w-full pl-9 pr-3 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create My Account</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-ink-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ======================= 3. FORGOT PASSWORD MODE ======================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="rounded-xl bg-blue-50/80 p-3.5 border border-blue-200/80 text-xs text-blue-900">
              <p className="flex items-center gap-1.5 font-bold mb-1">
                <KeyRound className="w-4 h-4 text-brand-600" /> Password Recovery
              </p>
              <p className="text-blue-700 leading-relaxed">
                Enter your registered email address below. We'll send instructions to reset your account password.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-ink-50/70 border border-ink-200 rounded-xl text-xs text-ink-900 font-medium placeholder-ink-400 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Sending instructions...' : 'Send Reset Instructions'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2 px-3 bg-ink-50 hover:bg-ink-100 border border-ink-200 rounded-xl text-xs text-ink-700 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
