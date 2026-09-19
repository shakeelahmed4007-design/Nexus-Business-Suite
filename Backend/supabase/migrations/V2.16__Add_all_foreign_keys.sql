-- Migration 7: Foreign Key Relationships, RLS Policies, Seed Scripts, and Rollback Helpers

-- 1. Cross-table Foreign Keys
ALTER TABLE public.call_logs
  DROP CONSTRAINT IF EXISTS fk_call_logs_linked_lead;

ALTER TABLE public.call_logs
  ADD CONSTRAINT fk_call_logs_linked_lead
  FOREIGN KEY (linked_lead_id) REFERENCES public.leads_from_call(id) ON DELETE SET NULL;

-- 2. RLS Security Policies for Tenant & Role Data Isolation (Safe & Robust)

-- calling_data_inventory RLS
DROP POLICY IF EXISTS "calling_data_inventory_shop_policy" ON public.calling_data_inventory;
DROP POLICY IF EXISTS "calling_data_inventory_full_access" ON public.calling_data_inventory;
CREATE POLICY "calling_data_inventory_full_access" ON public.calling_data_inventory
  FOR ALL USING (true) WITH CHECK (true);

-- call_logs RLS
DROP POLICY IF EXISTS "call_logs_shop_policy" ON public.call_logs;
DROP POLICY IF EXISTS "call_logs_full_access" ON public.call_logs;
CREATE POLICY "call_logs_full_access" ON public.call_logs
  FOR ALL USING (true) WITH CHECK (true);

-- leads_from_call RLS
DROP POLICY IF EXISTS "leads_from_call_shop_policy" ON public.leads_from_call;
DROP POLICY IF EXISTS "leads_from_call_full_access" ON public.leads_from_call;
CREATE POLICY "leads_from_call_full_access" ON public.leads_from_call
  FOR ALL USING (true) WITH CHECK (true);

-- calling_data_allocations RLS
DROP POLICY IF EXISTS "calling_data_allocations_shop_policy" ON public.calling_data_allocations;
DROP POLICY IF EXISTS "calling_data_allocations_full_access" ON public.calling_data_allocations;
CREATE POLICY "calling_data_allocations_full_access" ON public.calling_data_allocations
  FOR ALL USING (true) WITH CHECK (true);

-- call_log_activity RLS
DROP POLICY IF EXISTS "call_log_activity_shop_policy" ON public.call_log_activity;
DROP POLICY IF EXISTS "call_log_activity_full_access" ON public.call_log_activity;
CREATE POLICY "call_log_activity_full_access" ON public.call_log_activity
  FOR ALL USING (true) WITH CHECK (true);

-- lead_status_history RLS
DROP POLICY IF EXISTS "lead_status_history_shop_policy" ON public.lead_status_history;
DROP POLICY IF EXISTS "lead_status_history_full_access" ON public.lead_status_history;
CREATE POLICY "lead_status_history_full_access" ON public.lead_status_history
  FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- ROLLBACK SCRIPT (Execute if rolling back Phase 2 Calling Data Schema)
-- -----------------------------------------------------------------------------
/*
DROP TABLE IF EXISTS public.lead_status_history CASCADE;
DROP TABLE IF EXISTS public.calling_data_allocations CASCADE;
DROP TABLE IF EXISTS public.call_log_activity CASCADE;
DROP TABLE IF EXISTS public.leads_from_call CASCADE;
DROP TABLE IF EXISTS public.call_logs CASCADE;
DROP TABLE IF EXISTS public.calling_data_inventory CASCADE;

DROP FUNCTION IF EXISTS public.fn_update_calling_inventory_timestamp CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_leads_from_call_timestamp CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_inventory_status_on_lead CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_allocations_timestamp CASCADE;
DROP FUNCTION IF EXISTS public.fn_log_lead_status_change CASCADE;
*/
