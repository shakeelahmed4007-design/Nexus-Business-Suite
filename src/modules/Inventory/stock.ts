export type StockItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  warehouse: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

export const stockItems: StockItem[] = [
  { id: 'S-001', name: 'Wireless Headphones', sku: 'WH-001', category: 'Electronics', quantity: 34, reorderLevel: 20, unitPrice: 4500, warehouse: 'WH-A', status: 'In Stock' },
  { id: 'S-002', name: 'Smart Watch Pro', sku: 'SW-002', category: 'Electronics', quantity: 12, reorderLevel: 15, unitPrice: 12000, warehouse: 'WH-A', status: 'Low Stock' },
  { id: 'S-003', name: 'Bluetooth Speaker', sku: 'BS-003', category: 'Electronics', quantity: 52, reorderLevel: 25, unitPrice: 3200, warehouse: 'WH-B', status: 'In Stock' },
  { id: 'S-004', name: 'USB-C Cable 2m', sku: 'UC-004', category: 'Accessories', quantity: 200, reorderLevel: 50, unitPrice: 450, warehouse: 'WH-B', status: 'In Stock' },
  { id: 'S-005', name: 'Laptop Stand', sku: 'LS-005', category: 'Accessories', quantity: 0, reorderLevel: 10, unitPrice: 2800, warehouse: 'WH-A', status: 'Out of Stock' },
  { id: 'S-006', name: 'Wireless Mouse', sku: 'WM-006', category: 'Accessories', quantity: 87, reorderLevel: 30, unitPrice: 1500, warehouse: 'WH-B', status: 'In Stock' },
  { id: 'S-007', name: 'Mechanical Keyboard', sku: 'MK-007', category: 'Accessories', quantity: 8, reorderLevel: 12, unitPrice: 6500, warehouse: 'WH-A', status: 'Low Stock' },
  { id: 'S-008', name: 'Power Bank 20000mAh', sku: 'PB-008', category: 'Electronics', quantity: 65, reorderLevel: 30, unitPrice: 3800, warehouse: 'WH-C', status: 'In Stock' },
  { id: 'S-009', name: 'Phone Case Pro', sku: 'PC-009', category: 'Accessories', quantity: 150, reorderLevel: 40, unitPrice: 800, warehouse: 'WH-C', status: 'In Stock' },
  { id: 'S-010', name: 'Webcam HD 1080p', sku: 'WC-010', category: 'Electronics', quantity: 5, reorderLevel: 15, unitPrice: 4200, warehouse: 'WH-A', status: 'Low Stock' },
];

export type StockMovement = {
  id: string;
  item: string;
  type: 'In' | 'Out' | 'Transfer';
  quantity: number;
  from: string;
  to: string;
  date: string;
  by: string;
};

export const stockMovements: StockMovement[] = [
  { id: 'M-001', item: 'Wireless Headphones', type: 'In', quantity: 50, from: 'Global Supplies', to: 'WH-A', date: '2026-08-30 10:30', by: 'Imran Q.' },
  { id: 'M-002', item: 'Smart Watch Pro', type: 'Out', quantity: 8, from: 'WH-A', to: 'ORD-2042', date: '2026-08-29 14:15', by: 'Ahsan K.' },
  { id: 'M-003', item: 'USB-C Cable 2m', type: 'Out', quantity: 25, from: 'WH-B', to: 'ORD-2041', date: '2026-08-28 09:45', by: 'Fatima S.' },
  { id: 'M-004', item: 'Bluetooth Speaker', type: 'Transfer', quantity: 20, from: 'WH-B', to: 'WH-A', date: '2026-08-27 16:00', by: 'Zain A.' },
  { id: 'M-005', item: 'Power Bank 20000mAh', type: 'In', quantity: 40, from: 'TechHub Wholesale', to: 'WH-C', date: '2026-08-26 11:20', by: 'Imran Q.' },
  { id: 'M-006', item: 'Wireless Mouse', type: 'Out', quantity: 13, from: 'WH-B', to: 'ORD-2039', date: '2026-08-25 13:30', by: 'Ahsan K.' },
  { id: 'M-007', item: 'Mechanical Keyboard', type: 'Out', quantity: 4, from: 'WH-A', to: 'ORD-2038', date: '2026-08-24 15:45', by: 'Fatima S.' },
];

export const stockTrend = [
  { month: 'Mar', inbound: 320, outbound: 280 },
  { month: 'Apr', inbound: 410, outbound: 340 },
  { month: 'May', inbound: 380, outbound: 390 },
  { month: 'Jun', inbound: 450, outbound: 420 },
  { month: 'Jul', inbound: 520, outbound: 480 },
  { month: 'Aug', inbound: 480, outbound: 510 },
];
