export type Payment = {
  id: string;
  invoice: string;
  customer: string;
  amount: number;
  method: 'Bank Transfer' | 'Card' | 'Cash' | 'Cheque' | 'JazzCash';
  status: 'Paid' | 'Pending' | 'Overdue';
  date: string;
  dueDate: string;
};

export const payments: Payment[] = [
  { id: 'PAY-001', invoice: 'INV-2043', customer: 'Hamza Sheikh', amount: 18500, method: 'Bank Transfer', status: 'Paid', date: '2026-08-30', dueDate: '2026-09-05' },
  { id: 'PAY-002', invoice: 'INV-2042', customer: 'Sara Ahmed', amount: 12000, method: 'Card', status: 'Paid', date: '2026-08-29', dueDate: '2026-09-03' },
  { id: 'PAY-003', invoice: 'INV-2041', customer: 'Bilal Raza', amount: 32000, method: 'Cheque', status: 'Pending', date: '', dueDate: '2026-09-10' },
  { id: 'PAY-004', invoice: 'INV-2040', customer: 'Hina Malik', amount: 8900, method: 'JazzCash', status: 'Paid', date: '2026-08-27', dueDate: '2026-09-01' },
  { id: 'PAY-005', invoice: 'INV-2039', customer: 'Usman Tariq', amount: 15600, method: 'Cash', status: 'Paid', date: '2026-08-26', dueDate: '2026-08-30' },
  { id: 'PAY-006', invoice: 'INV-2038', customer: 'Ayesha Khan', amount: 45000, method: 'Bank Transfer', status: 'Overdue', date: '', dueDate: '2026-08-25' },
  { id: 'PAY-007', invoice: 'INV-2037', customer: 'Maria Yousuf', amount: 6700, method: 'Card', status: 'Paid', date: '2026-08-24', dueDate: '2026-08-28' },
  { id: 'PAY-008', invoice: 'INV-2036', customer: 'Ali Hassan', amount: 4500, method: 'Cash', status: 'Paid', date: '2026-08-23', dueDate: '2026-08-27' },
  { id: 'PAY-009', invoice: 'INV-2035', customer: 'Nida Aslam', amount: 28000, method: 'Cheque', status: 'Overdue', date: '', dueDate: '2026-08-20' },
  { id: 'PAY-010', invoice: 'INV-2034', customer: 'Kashif Iqbal', amount: 11200, method: 'Bank Transfer', status: 'Pending', date: '', dueDate: '2026-09-08' },
];

export const paymentMethodBreakdown = [
  { name: 'Bank Transfer', value: 91700, color: '#3366ff' },
  { name: 'Card', value: 18700, color: '#06b6d4' },
  { name: 'Cash', value: 20100, color: '#10b981' },
  { name: 'Cheque', value: 60000, color: '#f59e0b' },
  { name: 'JazzCash', value: 8900, color: '#f43f5e' },
];
