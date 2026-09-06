export type PrioritySuggestion = {
  id: string;
  type: 'Lead' | 'Task' | 'Follow-up';
  title: string;
  entity: string;
  priority: 'Critical' | 'High' | 'Medium';
  reason: string;
  score: number;
  action: string;
};

export const prioritySuggestions: PrioritySuggestion[] = [
  {
    id: 'AI-001', type: 'Follow-up', title: 'Call Ayesha Khan — overdue payment', entity: 'INV-2038 (PKR 45,000)',
    priority: 'Critical', score: 95,
    reason: 'Payment is 6 days overdue. Customer is VIP with PKR 680K lifetime value. High risk of churn if not handled today.',
    action: 'Call now',
  },
  {
    id: 'AI-002', type: 'Task', title: 'Restock Smart Watch Pro urgently', entity: 'SKU SW-002 (12 units left)',
    priority: 'Critical', score: 91,
    reason: 'Below reorder threshold. 3 active orders pending. Expected stockout in 4 days at current sales rate.',
    action: 'Create PO',
  },
  {
    id: 'AI-003', type: 'Lead', title: 'Send proposal to BlueOcean Inc', entity: 'L-003 (PKR 250K deal)',
    priority: 'High', score: 87,
    reason: 'Lead has been in Qualified stage for 6 days. Competitor activity detected on LinkedIn. High deal value.',
    action: 'Send proposal',
  },
  {
    id: 'AI-004', type: 'Lead', title: 'Re-engage Faizan Ahmed (Lost lead)', entity: 'L-012 (PKR 78K)',
    priority: 'Medium', score: 64,
    reason: 'Lost 15 days ago due to pricing. New discount campaign launching. Similar profile leads have 23% win-back rate.',
    action: 'Send offer',
  },
  {
    id: 'AI-005', type: 'Follow-up', title: 'Call Maria Yousuf — missed call', entity: '+92 322 7890123',
    priority: 'High', score: 82,
    reason: '2 missed calls in 3 days. Lead value PKR 310K. Pattern suggests high purchase intent. Best callback time: 2-4 PM.',
    action: 'Call back',
  },
  {
    id: 'AI-006', type: 'Task', title: 'Quarterly audit overdue', entity: 'WH-A',
    priority: 'Medium', score: 58,
    reason: 'Last audit was 98 days ago. Discrepancy of 3 units in last count. Schedule before month-end.',
    action: 'Schedule',
  },
];
