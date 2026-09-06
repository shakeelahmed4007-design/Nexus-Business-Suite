export type Invoice = {
  id: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  tax: number;
  total: number;
  status: 'Paid' | 'Sent' | 'Overdue' | 'Draft';
  items: { name: string; qty: number; price: number }[];
};

export const invoices: Invoice[] = [
  {
    id: 'INV-2043', customer: 'Hamza Sheikh', date: '2026-08-30', dueDate: '2026-09-14', amount: 15700, tax: 2800, total: 18500, status: 'Paid',
    items: [{ name: 'Wireless Headphones', qty: 2, price: 4500 }, { name: 'USB-C Cable 2m', qty: 3, price: 450 }, { name: 'Phone Case Pro', qty: 2, price: 800 }],
  },
  {
    id: 'INV-2042', customer: 'Sara Ahmed', date: '2026-08-29', dueDate: '2026-09-12', amount: 10200, tax: 1800, total: 12000, status: 'Paid',
    items: [{ name: 'Smart Watch Pro', qty: 1, price: 12000 }],
  },
  {
    id: 'INV-2041', customer: 'Bilal Raza', date: '2026-08-28', dueDate: '2026-09-11', amount: 27200, tax: 4800, total: 32000, status: 'Sent',
    items: [{ name: 'Bluetooth Speaker', qty: 5, price: 3200 }, { name: 'Power Bank 20000mAh', qty: 5, price: 3800 }],
  },
  {
    id: 'INV-2040', customer: 'Hina Malik', date: '2026-08-27', dueDate: '2026-09-10', amount: 7500, tax: 1400, total: 8900, status: 'Paid',
    items: [{ name: 'Laptop Stand', qty: 1, price: 2800 }, { name: 'Wireless Mouse', qty: 2, price: 1500 }, { name: 'Desk Lamp LED', qty: 1, price: 2200 }],
  },
  {
    id: 'INV-2039', customer: 'Usman Tariq', date: '2026-08-26', dueDate: '2026-09-09', amount: 13200, tax: 2400, total: 15600, status: 'Paid',
    items: [{ name: 'Mechanical Keyboard', qty: 1, price: 6500 }, { name: 'Webcam HD 1080p', qty: 1, price: 4200 }, { name: 'Notebook A5', qty: 5, price: 600 }],
  },
  {
    id: 'INV-2038', customer: 'Ayesha Khan', date: '2026-08-25', dueDate: '2026-09-08', amount: 38200, tax: 6800, total: 45000, status: 'Overdue',
    items: [{ name: 'Smart Watch Pro', qty: 2, price: 12000 }, { name: 'Mechanical Keyboard', qty: 2, price: 6500 }, { name: 'Laptop Stand', qty: 2, price: 2800 }],
  },
  {
    id: 'INV-2037', customer: 'Maria Yousuf', date: '2026-08-24', dueDate: '2026-09-07', amount: 5700, tax: 1000, total: 6700, status: 'Paid',
    items: [{ name: 'Wireless Mouse', qty: 1, price: 1500 }, { name: 'Phone Case Pro', qty: 2, price: 800 }, { name: 'USB-C Cable 2m', qty: 5, price: 450 }],
  },
  {
    id: 'INV-2036', customer: 'Ali Hassan', date: '2026-08-23', dueDate: '2026-09-06', amount: 3800, tax: 700, total: 4500, status: 'Draft',
    items: [{ name: 'Wireless Headphones', qty: 1, price: 4500 }],
  },
];
