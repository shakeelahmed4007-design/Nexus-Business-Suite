export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  rating: number;
  totalOrders: number;
  outstanding: number;
  status: 'Active' | 'On Hold' | 'Inactive';
  location: string;
};

export const vendors: Vendor[] = [
  { id: 'V-001', name: 'Global Supplies Co', category: 'Electronics', contact: 'Imran Q.', phone: '+92 300 1111111', email: 'sales@globalsupplies.com', rating: 4.8, totalOrders: 156, outstanding: 45000, status: 'Active', location: 'Karachi' },
  { id: 'V-002', name: 'PrimeSource Ltd', category: 'Hardware', contact: 'Saad M.', phone: '+92 321 2222222', email: 'info@primesource.pk', rating: 4.5, totalOrders: 98, outstanding: 0, status: 'Active', location: 'Lahore' },
  { id: 'V-003', name: 'MegaTrade Inc', category: 'Office Supplies', contact: 'Rabia N.', phone: '+92 333 3333333', email: 'orders@megatrade.io', rating: 3.9, totalOrders: 67, outstanding: 12000, status: 'On Hold', location: 'Islamabad' },
  { id: 'V-004', name: 'UniDistributors', category: 'Packaging', contact: 'Tariq J.', phone: '+92 345 4444444', email: 'contact@unidist.com', rating: 4.7, totalOrders: 203, outstanding: 28000, status: 'Active', location: 'Faisalabad' },
  { id: 'V-005', name: 'Skyline Imports', category: 'Electronics', contact: 'Naveed R.', phone: '+92 311 5555555', email: 'hello@skyline.pk', rating: 4.2, totalOrders: 45, outstanding: 0, status: 'Active', location: 'Karachi' },
  { id: 'V-006', name: 'FreshPack Co', category: 'Packaging', contact: 'Amber L.', phone: '+92 322 6666666', email: 'sales@freshpack.com', rating: 3.5, totalOrders: 22, outstanding: 8000, status: 'Inactive', location: 'Multan' },
  { id: 'V-007', name: 'TechHub Wholesale', category: 'Electronics', contact: 'Sufyan H.', phone: '+92 333 7777777', email: 'b2b@techhub.pk', rating: 4.9, totalOrders: 178, outstanding: 65000, status: 'Active', location: 'Lahore' },
  { id: 'V-008', name: 'EcoMaterials', category: 'Raw Materials', contact: 'Hira A.', phone: '+92 344 8888888', email: 'supply@ecomaterials.io', rating: 4.3, totalOrders: 89, outstanding: 15000, status: 'Active', location: 'Peshawar' },
];
