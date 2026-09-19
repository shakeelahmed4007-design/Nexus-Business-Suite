-- ============================================================================
-- Migration: 20260921_warehouse_management_system.sql
-- Description: Multi-Location Warehouse Inventory Tracking, Stock Transfers,
--              Cycle Counting, Rebalancing, and Movement History.
-- ============================================================================

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    location_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'RETAIL_SHOP', -- 'WAREHOUSE', 'RETAIL_SHOP', 'DISTRIBUTION_CENTER', 'OTHER'
    parent_location_id TEXT REFERENCES locations(location_id) ON DELETE SET NULL,
    address TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    manager_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_shop_id ON locations(shop_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

-- 2. Product Location Inventory Table
CREATE TABLE IF NOT EXISTS product_location_inventory (
    inventory_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    quantity_on_hand NUMERIC(15, 2) NOT NULL DEFAULT 0,
    quantity_reserved NUMERIC(15, 2) NOT NULL DEFAULT 0,
    reorder_point NUMERIC(15, 2) NOT NULL DEFAULT 10,
    safety_stock NUMERIC(15, 2) NOT NULL DEFAULT 5,
    last_counted_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_loc_product UNIQUE(shop_id, location_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_pli_shop_location ON product_location_inventory(shop_id, location_id);
CREATE INDEX IF NOT EXISTS idx_pli_shop_product ON product_location_inventory(shop_id, product_id);

-- 3. Stock Transfers Table
CREATE TABLE IF NOT EXISTS stock_transfers (
    transfer_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    source_location_id TEXT NOT NULL REFERENCES locations(location_id),
    destination_location_id TEXT NOT NULL REFERENCES locations(location_id),
    transfer_status TEXT NOT NULL DEFAULT 'INITIATED', -- 'INITIATED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'REVERSED'
    initiated_by_user_id TEXT,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by_user_id TEXT,
    received_at TIMESTAMPTZ,
    transfer_reason TEXT, -- 'Rebalancing', 'Low Stock', 'Seasonal', 'Customer Order', 'Other'
    expected_transfer_date TIMESTAMPTZ,
    notes TEXT,
    discrepancies_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_shop_status ON stock_transfers(shop_id, transfer_status);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON stock_transfers(source_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON stock_transfers(destination_location_id);

-- 4. Transfer Items Table
CREATE TABLE IF NOT EXISTS transfer_items (
    transfer_item_id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity_transferred NUMERIC(15, 2) NOT NULL,
    quantity_received NUMERIC(15, 2),
    variance NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product ON transfer_items(product_id);

-- 5. Transfer History (State Audit Log) Table
CREATE TABLE IF NOT EXISTS transfer_history (
    history_id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
    status_change_from TEXT,
    status_change_to TEXT NOT NULL,
    changed_by_user_id TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_transfer_history_transfer ON transfer_history(transfer_id);

-- 6. Location Inventory Movements Table (Complete Audit Trace)
CREATE TABLE IF NOT EXISTS location_inventory_movements (
    movement_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    source_location_id TEXT REFERENCES locations(location_id),
    destination_location_id TEXT REFERENCES locations(location_id),
    movement_type TEXT NOT NULL, -- 'SALE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'RETURN', 'REVERSAL', 'COUNT_ADJUSTMENT'
    quantity NUMERIC(15, 2) NOT NULL,
    movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_movements_shop_prod ON location_inventory_movements(shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_loc_movements_date ON location_inventory_movements(movement_date);

-- 7. Inventory Counts Table (Physical Cycle Counting)
CREATE TABLE IF NOT EXISTS inventory_counts (
    count_id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    location_id TEXT NOT NULL REFERENCES locations(location_id),
    product_id TEXT NOT NULL,
    counted_quantity NUMERIC(15, 2) NOT NULL,
    system_quantity NUMERIC(15, 2) NOT NULL,
    variance NUMERIC(15, 2) NOT NULL,
    counted_by_user_id TEXT,
    count_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    investigation_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_loc_date ON inventory_counts(location_id, count_date);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_shop ON inventory_counts(shop_id);
