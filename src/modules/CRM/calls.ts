export type CallLog = {
  id: string;
  contact: string;
  number: string;
  type: 'Incoming' | 'Outgoing' | 'Missed';
  duration: string;
  durationSec: number;
  date: string;
  notes: string;
};

export const callLogs: CallLog[] = [
  { id: 'C-001', contact: 'Sara Ahmed', number: '+92 300 1234567', type: 'Outgoing', duration: '4:32', durationSec: 272, date: '2026-08-30 11:15', notes: 'Discussed proposal details' },
  { id: 'C-002', contact: 'Bilal Raza', number: '+92 321 2345678', type: 'Incoming', duration: '8:15', durationSec: 495, date: '2026-08-30 10:02', notes: 'Price negotiation for bulk order' },
  { id: 'C-003', contact: 'Hina Malik', number: '+92 333 3456789', type: 'Missed', duration: '0:00', durationSec: 0, date: '2026-08-30 09:30', notes: '' },
  { id: 'C-004', contact: 'Usman Tariq', number: '+92 345 4567890', type: 'Outgoing', duration: '2:18', durationSec: 138, date: '2026-08-29 16:45', notes: 'Follow-up on quote' },
  { id: 'C-005', contact: 'Ayesha Khan', number: '+92 301 5678901', type: 'Incoming', duration: '12:40', durationSec: 760, date: '2026-08-29 14:20', notes: 'Contract terms discussion' },
  { id: 'C-006', contact: 'Hamza Sheikh', number: '+92 311 6789012', type: 'Outgoing', duration: '1:05', durationSec: 65, date: '2026-08-29 11:00', notes: 'Order confirmation' },
  { id: 'C-007', contact: 'Maria Yousuf', number: '+92 322 7890123', type: 'Missed', duration: '0:00', durationSec: 0, date: '2026-08-28 17:55', notes: '' },
  { id: 'C-008', contact: 'Ali Hassan', number: '+92 333 8901234', type: 'Incoming', duration: '3:22', durationSec: 202, date: '2026-08-28 15:30', notes: 'Product inquiry' },
  { id: 'C-009', contact: 'Nida Aslam', number: '+92 344 9012345', type: 'Outgoing', duration: '6:10', durationSec: 370, date: '2026-08-28 13:15', notes: 'Demo scheduling' },
  { id: 'C-010', contact: 'Kashif Iqbal', number: '+92 315 0123456', type: 'Outgoing', duration: '0:45', durationSec: 45, date: '2026-08-28 10:00', notes: 'Quick check-in' },
];

export const callStats = {
  total: callLogs.length,
  incoming: callLogs.filter((c) => c.type === 'Incoming').length,
  outgoing: callLogs.filter((c) => c.type === 'Outgoing').length,
  missed: callLogs.filter((c) => c.type === 'Missed').length,
  totalDuration: callLogs.reduce((a, c) => a + c.durationSec, 0),
};
