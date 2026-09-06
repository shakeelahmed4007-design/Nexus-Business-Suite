export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  tags: string[];
  totalOrders: number;
  totalSpent: number;
  lastContact: string;
  joinedAt: string;
};

export const customers: Customer[] = [
  { id: 'CU-001', name: 'Hamza Sheikh', phone: '+92 311 6789012', email: 'hamza@foodhub.com', company: 'FoodHub', city: 'Karachi', tags: ['VIP', 'Wholesale'], totalOrders: 18, totalSpent: 285000, lastContact: '2026-08-30', joinedAt: '2025-06-15' },
  { id: 'CU-002', name: 'Sara Ahmed', phone: '+92 300 1234567', email: 'sara@techvision.com', company: 'TechVision Ltd', city: 'Lahore', tags: ['New', 'Retail'], totalOrders: 2, totalSpent: 24500, lastContact: '2026-08-30', joinedAt: '2026-08-20' },
  { id: 'CU-003', name: 'Bilal Raza', phone: '+92 321 2345678', email: 'bilal@greenmart.pk', company: 'GreenMart', city: 'Islamabad', tags: ['Wholesale'], totalOrders: 12, totalSpent: 180000, lastContact: '2026-08-29', joinedAt: '2025-11-03' },
  { id: 'CU-004', name: 'Hina Malik', phone: '+92 333 3456789', email: 'hina@blueocean.io', company: 'BlueOcean Inc', city: 'Karachi', tags: ['VIP'], totalOrders: 25, totalSpent: 520000, lastContact: '2026-08-28', joinedAt: '2025-03-22' },
  { id: 'CU-005', name: 'Usman Tariq', phone: '+92 345 4567890', email: 'usman@peakfit.com', company: 'PeakFitness', city: 'Faisalabad', tags: ['Retail'], totalOrders: 7, totalSpent: 89000, lastContact: '2026-08-27', joinedAt: '2026-01-10' },
  { id: 'CU-006', name: 'Ayesha Khan', phone: '+92 301 5678901', email: 'ayesha@luxdecor.pk', company: 'LuxDecor', city: 'Lahore', tags: ['VIP', 'Wholesale'], totalOrders: 31, totalSpent: 680000, lastContact: '2026-08-26', joinedAt: '2024-12-05' },
  { id: 'CU-007', name: 'Maria Yousuf', phone: '+92 322 7890123', email: 'maria@stylecraft.io', company: 'StyleCraft', city: 'Karachi', tags: ['New'], totalOrders: 1, totalSpent: 6700, lastContact: '2026-08-25', joinedAt: '2026-08-15' },
  { id: 'CU-008', name: 'Ali Hassan', phone: '+92 333 8901234', email: 'ali@autopro.pk', company: 'AutoPro', city: 'Multan', tags: ['Retail'], totalOrders: 5, totalSpent: 42000, lastContact: '2026-08-24', joinedAt: '2026-02-18' },
];
