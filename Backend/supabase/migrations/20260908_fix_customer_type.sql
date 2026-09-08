-- ================================================================
-- FIX: Drop customer_type check constraint so VIP & other types work
-- Run this in Supabase SQL Editor:
-- ================================================================

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_status_check;

