export type Bin = {
  id: string;
  rack: string;
  row: string;
  item: string;
  quantity: number;
  capacity: number;
  status: 'Full' | 'Partial' | 'Empty';
};

export type Warehouse = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  used: number;
  bins: number;
  racks: number;
};

export const warehouses: Warehouse[] = [
  { id: 'WH-A', name: 'Warehouse A', location: 'Karachi Central', capacity: 5000, used: 4200, bins: 48, racks: 12 },
  { id: 'WH-B', name: 'Warehouse B', location: 'Korangi Industrial', capacity: 3500, used: 2100, bins: 36, racks: 9 },
  { id: 'WH-C', name: 'Warehouse C', location: 'Lahore Depot', capacity: 2000, used: 1650, bins: 24, racks: 6 },
];

export const bins: Bin[] = [
  { id: 'A-R1-B1', rack: 'R1', row: 'A', item: 'Wireless Headphones', quantity: 34, capacity: 50, status: 'Partial' },
  { id: 'A-R1-B2', rack: 'R1', row: 'A', item: 'Smart Watch Pro', quantity: 12, capacity: 30, status: 'Partial' },
  { id: 'A-R1-B3', rack: 'R1', row: 'A', item: 'Mechanical Keyboard', quantity: 8, capacity: 25, status: 'Partial' },
  { id: 'A-R1-B4', rack: 'R1', row: 'A', item: 'Webcam HD', quantity: 5, capacity: 20, status: 'Partial' },
  { id: 'A-R2-B1', rack: 'R2', row: 'A', item: 'Laptop Stand', quantity: 0, capacity: 30, status: 'Empty' },
  { id: 'A-R2-B2', rack: 'R2', row: 'A', item: 'Desk Lamp LED', quantity: 44, capacity: 50, status: 'Partial' },
  { id: 'A-R2-B3', rack: 'R2', row: 'A', item: 'Phone Case Pro', quantity: 48, capacity: 50, status: 'Partial' },
  { id: 'A-R3-B1', rack: 'R3', row: 'A', item: 'USB-C Cable', quantity: 100, capacity: 100, status: 'Full' },
  { id: 'A-R3-B2', rack: 'R3', row: 'A', item: 'Notebook A5', quantity: 95, capacity: 100, status: 'Full' },
  { id: 'B-R1-B1', rack: 'R1', row: 'B', item: 'Bluetooth Speaker', quantity: 52, capacity: 60, status: 'Partial' },
  { id: 'B-R1-B2', rack: 'R1', row: 'B', item: 'Wireless Mouse', quantity: 87, capacity: 100, status: 'Partial' },
  { id: 'B-R2-B1', rack: 'R2', row: 'B', item: 'Power Bank', quantity: 65, capacity: 80, status: 'Partial' },
];

export const movementLog = [
  { id: 'MOV-001', item: 'Wireless Headphones', type: 'In', qty: 50, from: 'Supplier', to: 'WH-A / R1-B1', date: '2026-08-30 10:30', user: 'Imran Q.' },
  { id: 'MOV-002', item: 'Smart Watch Pro', type: 'Out', qty: 8, from: 'WH-A / R1-B2', to: 'ORD-2042', date: '2026-08-29 14:15', user: 'Ahsan K.' },
  { id: 'MOV-003', item: 'Bluetooth Speaker', type: 'Transfer', qty: 20, from: 'WH-B / R1-B1', to: 'WH-A / R2-B2', date: '2026-08-28 09:45', user: 'Rabia N.' },
  { id: 'MOV-004', item: 'USB-C Cable', type: 'Out', qty: 25, from: 'WH-A / R3-B1', to: 'ORD-2041', date: '2026-08-28 11:20', user: 'Fatima S.' },
  { id: 'MOV-005', item: 'Power Bank', type: 'In', qty: 40, from: 'TechHub', to: 'WH-B / R2-B1', date: '2026-08-27 16:00', user: 'Imran Q.' },
];
