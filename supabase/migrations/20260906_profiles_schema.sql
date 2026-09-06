-- Migration: Update profiles table for Cloud Sync of permissions & roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_data_access BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- Change role column to TEXT so custom roles like 'sales' or 'admin' pass without enum restriction
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;

-- Enable Row Level Security (RLS) policies for full cloud sync
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to profiles" ON public.profiles;
CREATE POLICY "Public full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
