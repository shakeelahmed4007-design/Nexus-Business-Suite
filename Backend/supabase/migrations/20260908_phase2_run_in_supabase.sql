-- ============================================================
-- PHASE 2 CRM TABLES - Run this in Supabase SQL Editor
-- This is a safe idempotent version (IF NOT EXISTS everywhere)
-- ============================================================

-- 1. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  lead_source VARCHAR(50) CHECK (lead_source IN (''Website'', ''Cold Call'', ''Referral'', ''Social Media'', ''Manual Entry'', ''CSV Import'')),
  lead_status VARCHAR(50) CHECK (lead_status IN (''New'', ''Contacted'', ''Qualified'', ''Negotiating'', ''Lost'', ''Won'')),
  lead_value DECIMAL(15,2),
  priority VARCHAR(20) CHECK (priority IN (''Low'', ''Medium'', ''High'', ''Critical'')),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  customer_type VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  total_order_value DECIMAL(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  customer_status VARCHAR(50) DEFAULT ''Active'',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT ''Follow-up'',
  linked_entity VARCHAR(50),
  linked_entity_value UUID,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority VARCHAR(20) DEFAULT ''Medium'',
  status VARCHAR(50) CHECK (status IN (''Not Started'', ''In Progress'', ''Completed'', ''Overdue'', ''Cancelled'')) DEFAULT ''Not Started'',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_date TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  remind_before_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. CALLING DATA TABLE
CREATE TABLE IF NOT EXISTS public.calling_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  source VARCHAR(100),
  data_type VARCHAR(50),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) CHECK (status IN (''Available'', ''Assigned'', ''Used'', ''Expired'', ''Invalid'', ''Called'')) DEFAULT ''Available'',
  usage_count INTEGER DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  linked_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. CALL HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calling_data_id UUID NOT NULL REFERENCES public.calling_data(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_duration_seconds INTEGER DEFAULT 0,
  call_status VARCHAR(50),
  call_notes TEXT,
  linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  call_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50),
  entity_id UUID,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: service_role bypasses RLS automatically.
-- These allow authenticated users to access their own shop data.

-- LEADS policies
DROP POLICY IF EXISTS "leads_shop_access" ON public.leads;
CREATE POLICY "leads_shop_access" ON public.leads
  FOR ALL USING (
    shop_id = public.get_user_shop_id() OR public.is_super_admin()
  );

-- CUSTOMERS policies
DROP POLICY IF EXISTS "customers_shop_access" ON public.customers;
CREATE POLICY "customers_shop_access" ON public.customers
  FOR ALL USING (
    shop_id = public.get_user_shop_id() OR public.is_super_admin()
  );

-- TASKS policies
DROP POLICY IF EXISTS "tasks_shop_access" ON public.tasks;
CREATE POLICY "tasks_shop_access" ON public.tasks
  FOR ALL USING (
    shop_id = public.get_user_shop_id() OR public.is_super_admin()
  );

-- CALLING DATA policies
DROP POLICY IF EXISTS "calling_data_shop_access" ON public.calling_data;
CREATE POLICY "calling_data_shop_access" ON public.calling_data
  FOR ALL USING (
    shop_id = public.get_user_shop_id() OR public.is_super_admin()
  );

-- CALL HISTORY policies
DROP POLICY IF EXISTS "call_history_access" ON public.call_history;
CREATE POLICY "call_history_access" ON public.call_history
  FOR ALL USING (
    agent_user_id = auth.uid() OR public.is_super_admin()
  );

-- ACTIVITY LOGS policies
DROP POLICY IF EXISTS "activity_logs_shop_access" ON public.activity_logs;
CREATE POLICY "activity_logs_shop_access" ON public.activity_logs
  FOR ALL USING (
    shop_id = public.get_user_shop_id() OR public.is_super_admin()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_shop ON public.leads(shop_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads(created_by_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_shop ON public.tasks(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_calling_shop ON public.calling_data(shop_id, status);

-- Fix customer check constraints to allow VIP, Regular, Wholesale, Retail, etc.
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_status_check;

