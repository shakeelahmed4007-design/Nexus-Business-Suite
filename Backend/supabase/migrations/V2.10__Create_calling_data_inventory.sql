-- Migration 1: Create calling_data_inventory table
-- Description: Raw pool of calling numbers for admin allocation

CREATE TABLE IF NOT EXISTS public.calling_data_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  source VARCHAR(100) CHECK (source IN ('Manual Entry', 'Purchased List', 'CSV Import', 'Website', 'Facebook')),
  data_type VARCHAR(50) CHECK (data_type IN ('Raw Data', 'Support Numbers')) DEFAULT 'Raw Data',
  status VARCHAR(50) CHECK (status IN ('Available', 'Allocated', 'Used', 'Expired', 'Invalid')) DEFAULT 'Available',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_calling_inventory_per_admin UNIQUE (shop_id, admin_user_id, phone_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calling_data_inventory_admin_status ON public.calling_data_inventory (admin_user_id, status);
CREATE INDEX IF NOT EXISTS idx_calling_data_inventory_shop_status ON public.calling_data_inventory (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_calling_data_inventory_phone ON public.calling_data_inventory (phone_number);

-- Auto-update updated_at trigger
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
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_calling_inventory_timestamp();

-- RLS Enable
ALTER TABLE public.calling_data_inventory ENABLE ROW LEVEL SECURITY;
