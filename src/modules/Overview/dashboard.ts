export const salesData = [
  { month: 'Mar', sales: 420000, orders: 145, target: 450000 },
  { month: 'Apr', sales: 480000, orders: 168, target: 470000 },
  { month: 'May', sales: 510000, orders: 175, target: 500000 },
  { month: 'Jun', sales: 580000, orders: 198, target: 550000 },
  { month: 'Jul', sales: 620000, orders: 210, target: 600000 },
  { month: 'Aug', sales: 680000, orders: 232, target: 650000 },
];

export const revenueByCategory = [
  { name: 'Electronics', value: 1240000, color: '#3366ff' },
  { name: 'Accessories', value: 680000, color: '#06b6d4' },
  { name: 'Home', value: 320000, color: '#10b981' },
  { name: 'Stationery', value: 140000, color: '#f59e0b' },
];

export const leadSourceData = [
  { name: 'Website', value: 35, color: '#3366ff' },
  { name: 'Referral', value: 22, color: '#06b6d4' },
  { name: 'LinkedIn', value: 18, color: '#10b981' },
  { name: 'Google Ads', value: 15, color: '#f59e0b' },
  { name: 'Instagram', value: 10, color: '#f43f5e' },
];

export const weeklyActivity = [
  { day: 'Mon', value: 320 },
  { day: 'Tue', value: 410 },
  { day: 'Wed', value: 380 },
  { day: 'Thu', value: 520 },
  { day: 'Fri', value: 680 },
  { day: 'Sat', value: 540 },
  { day: 'Sun', value: 290 },
];

export const recentActivity = [
  { id: 1, type: 'order', text: 'New order ORD-2043 from Hamza Sheikh', amount: 'PKR 18,500', time: '5 min ago', icon: 'shopping' },
  { id: 2, type: 'lead', text: 'New lead Sara Ahmed added from Website', amount: 'PKR 85K', time: '1 hour ago', icon: 'user' },
  { id: 3, type: 'payment', text: 'Payment received for INV-2043', amount: 'PKR 18,500', time: '2 hours ago', icon: 'card' },
  { id: 4, type: 'stock', text: 'Low stock alert: Smart Watch Pro', amount: '12 units left', time: '3 hours ago', icon: 'box' },
  { id: 5, type: 'call', text: 'Missed call from Maria Yousuf', amount: '', time: '4 hours ago', icon: 'phone' },
  { id: 6, type: 'task', text: 'Task completed: Social media calendar', amount: '', time: '5 hours ago', icon: 'check' },
];

export const dashboardKpis = [
  { label: 'Total Revenue', value: 680000, prefix: 'PKR ', icon: 'dollar', accent: 'brand' as const, trend: { value: 9.7, positive: true } },
  { label: 'Active Leads', value: 42, icon: 'users', accent: 'cyan' as const, trend: { value: 12, positive: true } },
  { label: 'Orders This Month', value: 232, icon: 'package', accent: 'green' as const, trend: { value: 5.2, positive: true } },
  { label: 'Pending Payments', value: 8, icon: 'clock', accent: 'amber' as const, trend: { value: 2, positive: false } },
];
