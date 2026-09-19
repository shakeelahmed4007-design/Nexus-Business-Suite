-- =============================================================================
-- NEXUS BUSINESS SUITE - CALLING DATA COMPLETE MASTER SQL (IDEMPOTENT & SAFE)
-- Database: PostgreSQL (Supabase)
-- Description: Bulletproof migration that creates or updates all Calling Data
--              tables, columns, indexes, triggers, and RLS policies safely
--              even if tables already exist.
-- =============================================================================

BEGIN;

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLE: calling_data (CRM Direct Contact Pool)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.calling_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(30) NOT NULL
);

-- Ensure all columns exist regardless of previous table definition
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'CSV Import';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS data_type VARCHAR(100) DEFAULT 'Raw Data';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Available';
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMPTZ;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS last_used_date TIMESTAMPTZ;
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS linked_lead_id VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS linked_customer_id VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.calling_data ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Drop and recreate indexes safely
DROP INDEX IF EXISTS idx_calling_data_shop;
CREATE INDEX IF NOT EXISTS idx_calling_data_shop ON public.calling_data(shop_id);

DROP INDEX IF EXISTS idx_calling_data_phone;
CREATE INDEX IF NOT EXISTS idx_calling_data_phone ON public.calling_data(phone_number);

DROP INDEX IF EXISTS idx_calling_data_status;
CREATE INDEX IF NOT EXISTS idx_calling_data_status ON public.calling_data(status);

DROP INDEX IF EXISTS idx_calling_data_assigned;
CREATE INDEX IF NOT EXISTS idx_calling_data_assigned ON public.calling_data(assigned_to);

-- =============================================================================
-- 2. TABLE: calling_data_inventory (Raw Telemarketing Number Pool)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.calling_data_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(30) NOT NULL
);

ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS admin_user_id TEXT;
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'CSV Import';
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS data_type VARCHAR(50) DEFAULT 'Raw Data';
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Available';
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.calling_data_inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP INDEX IF EXISTS idx_cdi_shop_status;
CREATE INDEX IF NOT EXISTS idx_cdi_shop_status ON public.calling_data_inventory(shop_id, status);

DROP INDEX IF EXISTS idx_cdi_phone;
CREATE INDEX IF NOT EXISTS idx_cdi_phone ON public.calling_data_inventory(phone_number);

-- =============================================================================
-- 3. TABLE: calling_data_allocations (Agent Quotas & Assignments)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.calling_data_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocated_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS admin_user_id TEXT;
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS agent_user_id TEXT;
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS calling_data_inventory_id UUID;
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS allocated_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS last_used_date TIMESTAMPTZ;
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.calling_data_allocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_allocations_agent;
CREATE INDEX IF NOT EXISTS idx_allocations_agent ON public.calling_data_allocations(agent_user_id, status);

DROP INDEX IF EXISTS idx_allocations_expiry;
CREATE INDEX IF NOT EXISTS idx_allocations_expiry ON public.calling_data_allocations(expiry_date, status);

-- =============================================================================
-- 4. TABLE: call_logs (Call History, Outcomes, Recordings & Durations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255),
    phone_number VARCHAR(30)
);

ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS calling_data_inventory_id UUID;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS agent_user_id TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_notes TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_recording_url TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS linked_lead_id UUID;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_call_logs_phone;
CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON public.call_logs(phone_number);

DROP INDEX IF EXISTS idx_call_logs_status;
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs(call_status);

DROP INDEX IF EXISTS idx_call_logs_agent;
CREATE INDEX IF NOT EXISTS idx_call_logs_agent ON public.call_logs(agent_user_id, call_time DESC);

-- =============================================================================
-- 5. TABLE: leads_from_call (Converted Hot Leads, Deals & Trials)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leads_from_call (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255),
    phone_number VARCHAR(30)
);

ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS call_log_id UUID;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS calling_data_inventory_id UUID;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS agent_user_id TEXT;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New';
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Calling';
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS trial_period VARCHAR(50);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS sale_amount NUMERIC(15, 2);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMPTZ;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS denial_reason VARCHAR(255);
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS denial_date TIMESTAMPTZ;
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads_from_call ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP INDEX IF EXISTS idx_lfc_shop_status;
CREATE INDEX IF NOT EXISTS idx_lfc_shop_status ON public.leads_from_call(shop_id, status);

DROP INDEX IF EXISTS idx_lfc_agent;
CREATE INDEX IF NOT EXISTS idx_lfc_agent ON public.leads_from_call(agent_user_id, status);

-- =============================================================================
-- 6. TABLE: lead_status_history (Lead Stage Audit Log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    new_status VARCHAR(50)
);

ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS old_status VARCHAR(50);
ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);
ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS changed_by_user_id TEXT;
ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_lsh_lead;
CREATE INDEX IF NOT EXISTS idx_lsh_lead ON public.lead_status_history(lead_id, changed_at DESC);

-- =============================================================================
-- 7. TABLE: call_log_activity (Activity Log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.call_log_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100)
);

ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS module VARCHAR(50) DEFAULT 'CallingData';
ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE public.call_log_activity ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_cla_shop_time;
CREATE INDEX IF NOT EXISTS idx_cla_shop_time ON public.call_log_activity(shop_id, timestamp DESC);

-- =============================================================================
-- 8. TABLE: imported_leads (Website, Meta & External Incoming Leads)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.imported_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255),
    phone_number VARCHAR(30)
);

ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT 'shop-001';
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Website';
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT;
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.imported_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_il_status;
CREATE INDEX IF NOT EXISTS idx_il_status ON public.imported_leads(status);

-- =============================================================================
-- 9. TRIGGERS & AUTOMATIC TIMESTAMP HANDLERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calling_data_updated_at ON public.calling_data;
CREATE TRIGGER trg_calling_data_updated_at
    BEFORE UPDATE ON public.calling_data
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_cdi_updated_at ON public.calling_data_inventory;
CREATE TRIGGER trg_cdi_updated_at
    BEFORE UPDATE ON public.calling_data_inventory
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_allocations_updated_at ON public.calling_data_allocations;
CREATE TRIGGER trg_allocations_updated_at
    BEFORE UPDATE ON public.calling_data_allocations
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_lfc_updated_at ON public.leads_from_call;
CREATE TRIGGER trg_lfc_updated_at
    BEFORE UPDATE ON public.leads_from_call
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_imported_leads_updated_at ON public.imported_leads;
CREATE TRIGGER trg_imported_leads_updated_at
    BEFORE UPDATE ON public.imported_leads
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS) & FULL ACCESS PERMISSIONS
-- =============================================================================
ALTER TABLE public.calling_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_data_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_from_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_log_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calling_data_all_access" ON public.calling_data;
CREATE POLICY "calling_data_all_access" ON public.calling_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "calling_data_inventory_all_access" ON public.calling_data_inventory;
CREATE POLICY "calling_data_inventory_all_access" ON public.calling_data_inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "calling_data_allocations_all_access" ON public.calling_data_allocations;
CREATE POLICY "calling_data_allocations_all_access" ON public.calling_data_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "call_logs_all_access" ON public.call_logs;
CREATE POLICY "call_logs_all_access" ON public.call_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leads_from_call_all_access" ON public.leads_from_call;
CREATE POLICY "leads_from_call_all_access" ON public.leads_from_call FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_status_history_all_access" ON public.lead_status_history;
CREATE POLICY "lead_status_history_all_access" ON public.lead_status_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "call_log_activity_all_access" ON public.call_log_activity;
CREATE POLICY "call_log_activity_all_access" ON public.call_log_activity FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "imported_leads_all_access" ON public.imported_leads;
CREATE POLICY "imported_leads_all_access" ON public.imported_leads FOR ALL USING (true) WITH CHECK (true);

COMMIT;
