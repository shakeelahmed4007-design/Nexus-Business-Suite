export type Order = {
  id: string;
  customer: string;
  date: string;
  items: number;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  payment: 'Paid' | 'Unpaid' | 'Partial';
  channel: string;
};

export const orders: Order[] = [
  { id: 'ORD-2043', customer: 'Hamza Sheikh', date: '2026-08-30', items: 3, total: 18500, status: 'Pending', payment: 'Unpaid', channel: 'POS' },
  { id: 'ORD-2042', customer: 'Sara Ahmed', date: '2026-08-29', items: 1, total: 12000, status: 'Processing', payment: 'Paid', channel: 'Online' },
  { id: 'ORD-2041', customer: 'Bilal Raza', date: '2026-08-28', items: 5, total: 32000, status: 'Shipped', payment: 'Paid', channel: 'Online' },
  { id: 'ORD-2040', customer: 'Hina Malik', date: '2026-08-27', items: 2, total: 8900, status: 'Delivered', payment: 'Paid', channel: 'Phone' },
  { id: 'ORD-2039', customer: 'Usman Tariq', date: '2026-08-26', items: 4, total: 15600, status: 'Delivered', payment: 'Paid', channel: 'POS' },
  { id: 'ORD-2038', customer: 'Ayesha Khan', date: '2026-08-25', items: 7, total: 45000, status: 'Shipped', payment: 'Partial', channel: 'Online' },
  { id: 'ORD-2037', customer: 'Maria Yousuf', date: '2026-08-24', items: 2, total: 6700, status: 'Processing', payment: 'Paid', channel: 'Online' },
  { id: 'ORD-2036', customer: 'Ali Hassan', date: '2026-08-23', items: 1, total: 4500, status: 'Delivered', payment: 'Paid', channel: 'POS' },
  { id: 'ORD-2035', customer: 'Nida Aslam', date: '2026-08-22', items: 6, total: 28000, status: 'Cancelled', payment: 'Unpaid', channel: 'Phone' },
  { id: 'ORD-2034', customer: 'Kashif Iqbal', date: '2026-08-21', items: 3, total: 11200, status: 'Delivered', payment: 'Paid', channel: 'Online' },
];

export const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;

export const orderStatusFlow = [
  { key: 'Pending', label: 'Pending', count: 1 },
  { key: 'Processing', label: 'Processing', count: 2 },
  { key: 'Shipped', label: 'Shipped', count: 2 },
  { key: 'Delivered', label: 'Delivered', count: 4 },
];
