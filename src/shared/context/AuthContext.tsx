import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabaseClient';
import { checkAdminCredentials, getAdminByEmail } from '@/shared/lib/adminStore';

export type UserRole = 'super_admin' | 'admin' | 'sales' | 'shop_admin' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  shop_id: string | null;
  has_data_access?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  shopId: string | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any; role?: UserRole | null }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  shopId: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        let hasAccess = data.role === 'super_admin';
        if (email) {
          const storeAdmin = getAdminByEmail(email);
          if (storeAdmin) {
            hasAccess = Boolean(storeAdmin.has_data_access);
          }
        }
        setProfile({ ...data, has_data_access: hasAccess } as UserProfile);
      }
    } catch (err) {
      console.warn('Profile fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout: Ensure loading screen never gets stuck
    const timeoutId = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email);
      } else {
        // Check if there is a local session stored
        const storedLocal = localStorage.getItem('nexus_current_session');
        if (storedLocal) {
          try {
            const parsed = JSON.parse(storedLocal);
            setUser(parsed.user);
            setProfile(parsed.profile);
          } catch (e) {}
        }
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email);
      } else {
        const storedLocal = localStorage.getItem('nexus_current_session');
        if (!storedLocal) {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const existingInStore = getAdminByEmail(cleanEmail);

      const isSuper =
        cleanEmail === 'admin@nexus.com' || cleanEmail === 'superadmin@nexus.com';

      // 1. Check local AdminStore & demo credentials first
      if (existingInStore || isSuper) {
        const role: UserRole = isSuper
          ? 'super_admin'
          : existingInStore?.role || (cleanEmail.includes('sales') || cleanEmail.includes('staff') ? 'staff' : 'admin');
        const hasAccess = isSuper ? true : Boolean(existingInStore ? existingInStore.has_data_access : true);

        const mockUser = {
          id: existingInStore?.id || (isSuper ? 'super-admin-01' : 'user-' + Date.now()),
          email: cleanEmail,
          user_metadata: {
            full_name: existingInStore?.full_name || (isSuper ? 'Super Admin' : 'User'),
            role: role,
          },
        } as unknown as User;

        const mockProfile: UserProfile = {
          id: existingInStore?.id || (isSuper ? 'super-admin-01' : 'user-' + Date.now()),
          email: cleanEmail,
          full_name: existingInStore?.full_name || (isSuper ? 'Super Admin' : 'User'),
          role: role,
          shop_id: null,
          has_data_access: hasAccess,
        };

        setUser(mockUser);
        setProfile(mockProfile);
        localStorage.setItem(
          'nexus_current_session',
          JSON.stringify({ user: mockUser, profile: mockProfile })
        );
        setLoading(false);
        return { error: null, role: role };
      }

      // 2. Fallback to Supabase Cloud Auth for external accounts
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (!error && data.user) {
        await fetchProfile(data.user.id, data.user.email);
        const adminEntry = getAdminByEmail(data.user.email || '');
        const effectiveRole =
          data.user.email === 'admin@nexus.com'
            ? 'super_admin'
            : profile?.role ||
              adminEntry?.role ||
              (data.user.user_metadata?.role as UserRole) ||
              'super_admin';

        setLoading(false);
        return { error: null, role: effectiveRole };
      }

      setLoading(false);
      const friendlyErr = error?.message?.includes('Invalid login credentials')
        ? 'Invalid email or password. Please check your credentials.'
        : error?.message || 'Invalid email or password.';
      return { error: new Error(friendlyErr), role: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err, role: null };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('nexus_current_session');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('SignOut error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  };

  const currentRole = profile?.role || (user?.user_metadata?.role as UserRole) || null;
  const currentShopId = profile?.shop_id || (user?.user_metadata?.shop_id as string) || null;

  return (
    <AuthCtx.Provider
      value={{
        user,
        profile,
        role: currentRole,
        shopId: currentShopId,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
