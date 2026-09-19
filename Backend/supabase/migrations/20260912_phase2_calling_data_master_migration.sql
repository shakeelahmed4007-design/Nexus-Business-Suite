-- =============================================================================
-- MASTER MIGRATION: Phase 2 CRM - Calling Data Management System
-- Database: PostgreSQL (Supabase)
-- Includes: 6 Core Tables, Allocations, Triggers, Indexes, RLS Policies
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TABLE: calling_data_inventory (Raw Pool of Numbers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calling_data_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  source VARCHAR(100) DEFAULT 'CSV Import',
  data_type VARCHAR(50) DEFAULT 'Raw Data',
  status VARCHAR(50) DEFAULT 'Available',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_calling_data_inventory_admin_status ON public.calling_data_inventory (admin_user_id, status);
CREATE INDEX IF NOT EXISTS idx_calling_data_inventory_shop_status ON public.calling_data_inventory (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_calling_data_inventory_phone ON public.calling_data_inventory (phone_number);

CREATE OR REPLACE FUNCTION public.fn_update_calling_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calling_inventory_updated_at ON public.calling_data_inventory;
CREATE TRIGGER trg_calling_inventory_updated_at
  BEFORE UPDATE ON public.calling_data_inventory
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_calling_inventory_timestamp();

-- -----------------------------------------------------------------------------
-- 2. TABLE: call_logs (Every Call Logged)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  calling_data_inventory_id UUID REFERENCES public.calling_data_inventory(id) ON DELETE CASCADE,
  agent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  call_duration_seconds INTEGER DEFAULT 0,
  call_status VARCHAR(50) NOT NULL,
  call_notes TEXT,
  call_recording_url TEXT,
  call_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  linked_lead_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_inventory_time ON public.call_logs (calling_data_inventory_id, call_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_time ON public.call_logs (agent_user_id, call_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs (call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs (linked_lead_id);

-- -----------------------------------------------------------------------------
-- 3. TABLE: leads_from_call (Leads Created from Call Logs & External Sources)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads_from_call (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  call_log_id UUID REFERENCES public.call_logs(id) ON DELETE CASCADE,
  calling_data_inventory_id UUID REFERENCES public.calling_data_inventory(id) ON DELETE CASCADE,
  agent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'New',
  source VARCHAR(50) DEFAULT 'Calling',
  created_from_call BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'Medium',
  notes TEXT,

  -- Trial Specific
  trial_period VARCHAR(50),
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,

  -- Sales Specific
  sale_amount DECIMAL(15,2),
  sale_date TIMESTAMP WITH TIME ZONE,
  renewal_date TIMESTAMP WITH TIME ZONE,

  -- Denial Specific
  denial_reason VARCHAR(255),
  denial_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_leads_from_call_shop_status ON public.leads_from_call (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_agent_status ON public.leads_from_call (agent_user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_status ON public.leads_from_call (status);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_created_desc ON public.leads_from_call (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_trial_end ON public.leads_from_call (trial_end_date);
CREATE INDEX IF NOT EXISTS idx_leads_from_call_renewal ON public.leads_from_call (renewal_date);

-- Foreign key back to call_logs
ALTER TABLE public.call_logs
  DROP CONSTRAINT IF EXISTS fk_call_logs_linked_lead,
  ADD CONSTRAINT fk_call_logs_linked_lead
  FOREIGN KEY (linked_lead_id) REFERENCES public.leads_from_call(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.fn_update_leads_from_call_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_from_call_updated_at ON public.leads_from_call;
CREATE TRIGGER trg_leads_from_call_updated_at
  BEFORE UPDATE ON public.leads_from_call
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_leads_from_call_timestamp();

-- Trigger: Mark calling_data_inventory as Used when lead is created
CREATE OR REPLACE FUNCTION public.fn_update_inventory_status_on_lead()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.calling_data_inventory
  SET status = 'Used', updated_at = NOW()
  WHERE id = NEW.calling_data_inventory_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_inventory_status_on_lead_create ON public.leads_from_call;
CREATE TRIGGER trg_update_inventory_status_on_lead_create
  AFTER INSERT ON public.leads_from_call
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_inventory_status_on_lead();

-- -----------------------------------------------------------------------------
-- 4. TABLE: call_log_activity (Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_log_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) DEFAULT 'CallingData',
  entity_id UUID,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_timestamp ON public.call_log_activity (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_shop_timestamp ON public.call_log_activity (shop_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.call_log_activity (action);

-- -----------------------------------------------------------------------------
-- 5. TABLE: calling_data_allocations (Agent Batch Allocation Tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calling_data_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  calling_data_inventory_id UUID REFERENCES public.calling_data_inventory(id) ON DELETE CASCADE,
  allocated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  usage_count INTEGER DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_agent_status ON public.calling_data_allocations (agent_user_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_expiry ON public.calling_data_allocations (expiry_date, status);

CREATE OR REPLACE FUNCTION public.fn_update_allocations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocations_updated_at ON public.calling_data_allocations;
CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON public.calling_data_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_allocations_timestamp();

-- -----------------------------------------------------------------------------
-- 6. TABLE: lead_status_history (Lead Status Transition Audit Log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads_from_call(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON public.lead_status_history (lead_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.fn_log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status, changed_by_user_id, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.agent_user_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_lead_status_change ON public.leads_from_call;
CREATE TRIGGER trg_log_lead_status_change
  AFTER UPDATE ON public.leads_from_call
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_lead_status_change();

-- -----------------------------------------------------------------------------
-- 7. TABLE: imported_leads (External Facebook/Website/Instagram Leads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imported_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  source VARCHAR(50) DEFAULT 'Website',
  message TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imported_leads_status ON public.imported_leads (status);
CREATE INDEX IF NOT EXISTS idx_imported_leads_phone ON public.imported_leads (phone_number);

-- -----------------------------------------------------------------------------
-- ENABLE RLS & FULL ACCESS POLICIES FOR SUPABASE CLIENTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.calling_data_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_from_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_log_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calling_data_inventory_full_access" ON public.calling_data_inventory;
CREATE POLICY "calling_data_inventory_full_access" ON public.calling_data_inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "call_logs_full_access" ON public.call_logs;
CREATE POLICY "call_logs_full_access" ON public.call_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leads_from_call_full_access" ON public.leads_from_call;
CREATE POLICY "leads_from_call_full_access" ON public.leads_from_call FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "calling_data_allocations_full_access" ON public.calling_data_allocations;
CREATE POLICY "calling_data_allocations_full_access" ON public.calling_data_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "call_log_activity_full_access" ON public.call_log_activity;
CREATE POLICY "call_log_activity_full_access" ON public.call_log_activity FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_status_history_full_access" ON public.lead_status_history;
CREATE POLICY "lead_status_history_full_access" ON public.lead_status_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "imported_leads_full_access" ON public.imported_leads;
CREATE POLICY "imported_leads_full_access" ON public.imported_leads FOR ALL USING (true) WITH CHECK (true);

COMMIT;
