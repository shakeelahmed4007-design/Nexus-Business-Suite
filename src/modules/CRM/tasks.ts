export type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  relatedTo: string;
};

export const tasks: Task[] = [
  { id: 'T-001', title: 'Send proposal to BlueOcean', description: 'Prepare detailed pricing proposal for Hina Malik', assignee: 'Ahsan K.', priority: 'High', status: 'In Progress', dueDate: '2026-09-02', relatedTo: 'L-003' },
  { id: 'T-002', title: 'Follow up with GreenMart', description: 'Call Bilal about bulk order status', assignee: 'Fatima S.', priority: 'Medium', status: 'To Do', dueDate: '2026-09-01', relatedTo: 'L-002' },
  { id: 'T-003', title: 'Restock Smart Watch Pro', description: 'Place PO with TechHub — only 12 units left', assignee: 'Imran Q.', priority: 'High', status: 'To Do', dueDate: '2026-08-31', relatedTo: 'S-002' },
  { id: 'T-004', title: 'Review invoice INV-2038', description: 'Overdue payment from Ayesha Khan — follow up', assignee: 'Saad M.', priority: 'High', status: 'Review', dueDate: '2026-08-30', relatedTo: 'INV-2038' },
  { id: 'T-005', title: 'Demo call with EduSmart', description: 'Schedule product demo for Nida Aslam', assignee: 'Zain A.', priority: 'Medium', status: 'In Progress', dueDate: '2026-09-03', relatedTo: 'L-009' },
  { id: 'T-006', title: 'Update social media calendar', description: 'Plan posts for September', assignee: 'Naveed R.', priority: 'Low', status: 'Done', dueDate: '2026-08-28', relatedTo: 'Marketing' },
  { id: 'T-007', title: 'Quarterly inventory audit', description: 'Full warehouse count for WH-A', assignee: 'Rabia N.', priority: 'Medium', status: 'To Do', dueDate: '2026-09-05', relatedTo: 'WH-A' },
  { id: 'T-008', title: 'Onboard new hire', description: 'Setup accounts for marketing intern', assignee: 'Hira A.', priority: 'Low', status: 'Done', dueDate: '2026-08-27', relatedTo: 'HR' },
  { id: 'T-009', title: 'Negotiate vendor contract', description: 'Renew Global Supplies annual agreement', assignee: 'Imran Q.', priority: 'Medium', status: 'In Progress', dueDate: '2026-09-04', relatedTo: 'V-001' },
  { id: 'T-010', title: 'Prepare monthly sales report', description: 'Compile August sales metrics', assignee: 'Ahsan K.', priority: 'High', status: 'Review', dueDate: '2026-09-01', relatedTo: 'Sales' },
];

export const taskColumns = ['To Do', 'In Progress', 'Review', 'Done'] as const;
