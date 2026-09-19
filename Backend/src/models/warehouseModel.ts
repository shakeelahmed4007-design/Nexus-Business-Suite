export type LocationType = 'WAREHOUSE' | 'RETAIL_SHOP' | 'DISTRIBUTION_CENTER' | 'OTHER';
export type LocationStatus = 'ACTIVE' | 'INACTIVE';

export interface WarehouseLocation {
  location_id: string;
  shop_id: string;
  location_name: string;
  location_type: LocationType;
  parent_location_id?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  manager_id?: string | null;
  status: LocationStatus;
  created_at: string;
  updated_at: string;
  // Hierarchy & runtime attributes
  child_locations?: WarehouseLocation[];
  parent_location_name?: string;
}

export interface CreateLocationInput {
  shop_id?: string;
  location_name: string;
  location_type: LocationType;
  parent_location_id?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  manager_id?: string | null;
  status?: LocationStatus;
}

export interface UpdateLocationInput {
  location_name?: string;
  location_type?: LocationType;
  parent_location_id?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  manager_id?: string | null;
  status?: LocationStatus;
}

export interface ProductLocationInventory {
  inventory_id: string;
  shop_id: string;
  product_id: string;
  location_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_quantity: number; // quantity_on_hand - quantity_reserved
  reorder_point: number;
  safety_stock: number;
  last_counted_at?: string | null;
  last_updated_at: string;
  // Metadata join fields
  product_name?: string;
  location_name?: string;
}

export interface InventoryMatrixCell {
  location_id: string;
  location_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_quantity: number;
  reorder_point: number;
  safety_stock: number;
  is_low_stock: boolean;
}

export interface InventoryMatrixRow {
  product_id: string;
  product_name: string;
  sku?: string;
  locations: Record<string, InventoryMatrixCell>;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
}

export interface MultiLocationMatrixResponse {
  locations: { location_id: string; location_name: string; location_type: LocationType }[];
  products: InventoryMatrixRow[];
  total_products: number;
  total_stock_all_locations: number;
}

export type TransferStatus = 'INITIATED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'REVERSED';

export interface TransferItem {
  transfer_item_id: string;
  transfer_id: string;
  product_id: string;
  quantity_transferred: number;
  quantity_received?: number | null;
  variance?: number; // quantity_received - quantity_transferred (negative means shortage)
  notes?: string | null;
  created_at: string;
  product_name?: string;
}

export interface StockTransfer {
  transfer_id: string;
  shop_id: string;
  source_location_id: string;
  source_location_name?: string;
  destination_location_id: string;
  destination_location_name?: string;
  transfer_status: TransferStatus;
  initiated_by_user_id?: string | null;
  initiated_at: string;
  received_by_user_id?: string | null;
  received_at?: string | null;
  transfer_reason?: string | null;
  expected_transfer_date?: string | null;
  notes?: string | null;
  discrepancies_notes?: string | null;
  items: TransferItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateTransferItemInput {
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateTransferInput {
  shop_id?: string;
  source_location_id: string;
  destination_location_id: string;
  items: CreateTransferItemInput[];
  transfer_reason?: string;
  expected_transfer_date?: string;
  notes?: string;
  initiated_by_user_id?: string;
}

export interface ReceiveTransferItemInput {
  product_id: string;
  quantity_received: number;
  notes?: string;
}

export interface ReceiveTransferInput {
  received_by_user_id?: string;
  received_items?: ReceiveTransferItemInput[]; // If omitted or partial, defaults to full transferred quantity
  discrepancies_notes?: string;
}

export interface TransferHistoryEntry {
  history_id: string;
  transfer_id: string;
  status_change_from?: string | null;
  status_change_to: string;
  changed_by_user_id?: string | null;
  changed_at: string;
  notes?: string | null;
}

export type MovementType =
  | 'SALE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'REVERSAL'
  | 'COUNT_ADJUSTMENT';

export interface LocationInventoryMovement {
  movement_id: string;
  shop_id: string;
  product_id: string;
  product_name?: string;
  source_location_id?: string | null;
  source_location_name?: string | null;
  destination_location_id?: string | null;
  destination_location_name?: string | null;
  movement_type: MovementType;
  quantity: number;
  movement_date: string;
  reference_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface RebalancingSuggestion {
  suggestion_id: string;
  shop_id: string;
  product_id: string;
  product_name: string;
  source_location_id: string;
  source_location_name: string;
  source_available_stock: number;
  source_safety_stock: number;
  destination_location_id: string;
  destination_location_name: string;
  destination_current_stock: number;
  destination_reorder_point: number;
  suggested_transfer_quantity: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface InventoryCountRecord {
  count_id: string;
  shop_id: string;
  location_id: string;
  location_name?: string;
  product_id: string;
  product_name?: string;
  counted_quantity: number;
  system_quantity: number;
  variance: number; // counted - system
  counted_by_user_id?: string | null;
  count_date: string;
  investigation_notes?: string | null;
  created_at: string;
}

export interface RecordCycleCountInput {
  shop_id?: string;
  location_id: string;
  product_id: string;
  counted_quantity: number;
  counted_by_user_id?: string;
  investigation_notes?: string;
  apply_system_adjustment?: boolean;
}

export interface LocationSalesReportItem {
  location_id: string;
  location_name: string;
  location_type: LocationType;
  total_sales_count: number;
  total_units_sold: number;
  total_sales_amount: number;
}

export interface TransferAnalysisReport {
  total_transfers: number;
  completed_transfers: number;
  in_transit_transfers: number;
  transfers_with_discrepancy: number;
  reversed_transfers: number;
  average_transfer_duration_hours: number;
  top_routes: {
    source_location_id: string;
    source_location_name: string;
    destination_location_id: string;
    destination_location_name: string;
    transfer_count: number;
    total_quantity: number;
  }[];
}
