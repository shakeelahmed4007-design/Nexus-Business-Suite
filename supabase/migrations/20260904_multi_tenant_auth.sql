-- Multi-Tenant Auth & RLS Schema for Ledger & CRM App

-- Safe Cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.shops CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 1. Create custom enum type for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'shop_admin', 'staff');

-- 2. Create `shops` (tenants) table
CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'suspended')),
    module_access JSONB DEFAULT '[]'::jsonb, -- List of allowed module keys (out of 49)
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create `profiles` table extending auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role public.user_role NOT NULL DEFAULT 'staff',
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE, -- Nullable for Super Admin
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR RLS POLICIES (SECURITY DEFINER + search_path TO PREVENT RECURSION)
------------------------------------------

-- Helper function to check if the authenticated user is a Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN (v_role = 'super_admin'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to get the current authenticated user's shop_id
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT shop_id INTO v_shop_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN v_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

--------------------------------------------------------------------------------
-- RLS POLICIES FOR `shops`
--------------------------------------------------------------------------------
CREATE POLICY "Super Admins full access to shops" ON public.shops FOR ALL USING (public.is_super_admin());
CREATE POLICY "Shop Admins access own shop" ON public.shops FOR SELECT USING (id = public.get_user_shop_id());
CREATE POLICY "Shop Admins update own shop" ON public.shops FOR UPDATE USING (id = public.get_user_shop_id()) WITH CHECK (id = public.get_user_shop_id());
CREATE POLICY "Staff read own shop" ON public.shops FOR SELECT USING (id = public.get_user_shop_id());

--------------------------------------------------------------------------------
-- RLS POLICIES FOR `profiles` (WITHOUT RECURSIVE RLS CALLS)
--------------------------------------------------------------------------------
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Super Admins full access to profiles" ON public.profiles FOR ALL USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Shop Admins read shop profiles" ON public.profiles FOR SELECT USING (shop_id = public.get_user_shop_id());
CREATE POLICY "Shop Admins insert shop profiles" ON public.profiles FOR INSERT WITH CHECK (shop_id = public.get_user_shop_id());
CREATE POLICY "Shop Admins update shop profiles" ON public.profiles FOR UPDATE USING (shop_id = public.get_user_shop_id()) WITH CHECK (shop_id = public.get_user_shop_id());
CREATE POLICY "Shop Admins delete shop profiles" ON public.profiles FOR DELETE USING (shop_id = public.get_user_shop_id());

--------------------------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP (ROBUST & FAILSAFE)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_shop_id UUID;
  v_shop_str TEXT;
BEGIN
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'staff'::public.user_role;
  END;

  v_shop_str := new.raw_user_meta_data->>'shop_id';
  IF v_shop_str IS NOT NULL AND v_shop_str <> '' THEN
    BEGIN
      v_shop_id := v_shop_str::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_shop_id := NULL;
    END;
  ELSE
    v_shop_id := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, shop_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(v_role, 'staff'::public.user_role),
    v_shop_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    shop_id = EXCLUDED.shop_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
