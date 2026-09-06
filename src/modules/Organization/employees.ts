export type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  joinedAt: string;
  status: 'Active' | 'On Leave' | 'Remote';
  attendance: number;
  avatar: string;
};

export const employees: Employee[] = [
  { id: 'E-001', name: 'Ahsan Khan', role: 'Sales Manager', department: 'Sales', email: 'ahsan@nexus.com', phone: '+92 300 1111111', joinedAt: '2023-06-15', status: 'Active', attendance: 96, avatar: 'AK' },
  { id: 'E-002', name: 'Fatima Saleem', role: 'Account Executive', department: 'Sales', email: 'fatima@nexus.com', phone: '+92 321 2222222', joinedAt: '2024-01-20', status: 'Active', attendance: 92, avatar: 'FS' },
  { id: 'E-003', name: 'Zain Ali', role: 'Sales Executive', department: 'Sales', email: 'zain@nexus.com', phone: '+92 333 3333333', joinedAt: '2024-09-05', status: 'Remote', attendance: 88, avatar: 'ZA' },
  { id: 'E-004', name: 'Imran Qureshi', role: 'Procurement Lead', department: 'Procurement', email: 'imran@nexus.com', phone: '+92 345 4444444', joinedAt: '2023-11-10', status: 'Active', attendance: 94, avatar: 'IQ' },
  { id: 'E-005', name: 'Rabia Naveed', role: 'Warehouse Manager', department: 'Operations', email: 'rabia@nexus.com', phone: '+92 311 5555555', joinedAt: '2023-03-18', status: 'Active', attendance: 98, avatar: 'RN' },
  { id: 'E-006', name: 'Saad Mahmood', role: 'Finance Officer', department: 'Finance', email: 'saad@nexus.com', phone: '+92 322 6666666', joinedAt: '2024-04-12', status: 'On Leave', attendance: 85, avatar: 'SM' },
  { id: 'E-007', name: 'Hira Aslam', role: 'HR Specialist', department: 'HR', email: 'hira@nexus.com', phone: '+92 333 7777777', joinedAt: '2024-07-01', status: 'Active', attendance: 97, avatar: 'HA' },
  { id: 'E-008', name: 'Naveed Rana', role: 'Marketing Lead', department: 'Marketing', email: 'naveed@nexus.com', phone: '+92 344 8888888', joinedAt: '2023-08-22', status: 'Active', attendance: 91, avatar: 'NR' },
];

export const departments = [
  { name: 'Sales', count: 3, color: 'bg-brand-500' },
  { name: 'Operations', count: 1, color: 'bg-emerald-500' },
  { name: 'Procurement', count: 1, color: 'bg-amber-500' },
  { name: 'Finance', count: 1, color: 'bg-cyan-500' },
  { name: 'HR', count: 1, color: 'bg-rose-500' },
  { name: 'Marketing', count: 1, color: 'bg-violet-500' },
];

export const attendanceTrend = [
  { day: 'Mon', present: 7, absent: 1 },
  { day: 'Tue', present: 8, absent: 0 },
  { day: 'Wed', present: 6, absent: 2 },
  { day: 'Thu', present: 7, absent: 1 },
  { day: 'Fri', present: 8, absent: 0 },
  { day: 'Sat', present: 5, absent: 3 },
];
