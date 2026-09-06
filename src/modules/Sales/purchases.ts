export type Purchase = {
  id: string;
  vendor: string;
  date: string;
  items: number;
  total: number;
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
  expected: string;
};

export const purchases: Purchase[] = [
  { id: 'PO-001', vendor: 'Global Supplies Co', date: '2026-08-28', items: 12, total: 84000, status: 'Ordered', expected: '2026-09-05' },
  { id: 'PO-002', vendor: 'TechHub Wholesale', date: '2026-08-25', items: 8, total: 156000, status: 'Received', expected: '2026-09-01' },
  { id: 'PO-003', vendor: 'PrimeSource Ltd', date: '2026-08-22', items: 5, total: 32000, status: 'Received', expected: '2026-08-28' },
  { id: 'PO-004', vendor: 'UniDistributors', date: '2026-08-20', items: 20, total: 28000, status: 'Ordered', expected: '2026-09-03' },
  { id: 'PO-005', vendor: 'Skyline Imports', date: '2026-08-18', items: 3, total: 67000, status: 'Draft', expected: '2026-09-10' },
  { id: 'PO-006', vendor: 'EcoMaterials', date: '2026-08-15', items: 15, total: 45000, status: 'Received', expected: '2026-08-22' },
  { id: 'PO-007', vendor: 'MegaTrade Inc', date: '2026-08-12', items: 7, total: 18000, status: 'Cancelled', expected: '2026-08-20' },
  { id: 'PO-008', vendor: 'Global Supplies Co', date: '2026-08-10', items: 10, total: 52000, status: 'Received', expected: '2026-08-17' },
];

export const supplierBreakdown = [
  { vendor: 'Global Supplies', orders: 156, value: 840000 },
  { vendor: 'TechHub Wholesale', orders: 178, value: 1240000 },
  { vendor: 'PrimeSource Ltd', orders: 98, value: 520000 },
  { vendor: 'UniDistributors', orders: 203, value: 680000 },
  { vendor: 'Skyline Imports', orders: 45, value: 310000 },
  { vendor: 'EcoMaterials', orders: 89, value: 240000 },
];
