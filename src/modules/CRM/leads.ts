export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  source: string;
  owner: string;
  createdAt: string;
};

export const leads: Lead[] = [
  { id: 'L-001', name: 'Sara Ahmed', company: 'TechVision Ltd', email: 'sara@techvision.com', phone: '+92 300 1234567', value: 85000, stage: 'New', source: 'Website', owner: 'Ahsan K.', createdAt: '2026-08-28' },
  { id: 'L-002', name: 'Bilal Raza', company: 'GreenMart', email: 'bilal@greenmart.pk', phone: '+92 321 2345678', value: 120000, stage: 'Contacted', source: 'Referral', owner: 'Fatima S.', createdAt: '2026-08-26' },
  { id: 'L-003', name: 'Hina Malik', company: 'BlueOcean Inc', email: 'hina@blueocean.io', phone: '+92 333 3456789', value: 250000, stage: 'Qualified', source: 'LinkedIn', owner: 'Ahsan K.', createdAt: '2026-08-24' },
  { id: 'L-004', name: 'Usman Tariq', company: 'PeakFitness', email: 'usman@peakfit.com', phone: '+92 345 4567890', value: 67000, stage: 'Proposal', source: 'Cold Call', owner: 'Zain A.', createdAt: '2026-08-22' },
  { id: 'L-005', name: 'Ayesha Khan', company: 'LuxDecor', email: 'ayesha@luxdecor.pk', phone: '+92 301 5678901', value: 180000, stage: 'Negotiation', source: 'Exhibition', owner: 'Fatima S.', createdAt: '2026-08-20' },
  { id: 'L-006', name: 'Hamza Sheikh', company: 'FoodHub', email: 'hamza@foodhub.com', phone: '+92 311 6789012', value: 95000, stage: 'Won', source: 'Website', owner: 'Ahsan K.', createdAt: '2026-08-18' },
  { id: 'L-007', name: 'Maria Yousuf', company: 'StyleCraft', email: 'maria@stylecraft.io', phone: '+92 322 7890123', value: 310000, stage: 'Contacted', source: 'Instagram', owner: 'Zain A.', createdAt: '2026-08-16' },
  { id: 'L-008', name: 'Ali Hassan', company: 'AutoPro', email: 'ali@autopro.pk', phone: '+92 333 8901234', value: 54000, stage: 'New', source: 'Google Ads', owner: 'Ahsan K.', createdAt: '2026-08-30' },
  { id: 'L-009', name: 'Nida Aslam', company: 'EduSmart', email: 'nida@edusmart.com', phone: '+92 344 9012345', value: 220000, stage: 'Qualified', source: 'Referral', owner: 'Fatima S.', createdAt: '2026-08-27' },
  { id: 'L-010', name: 'Kashif Iqbal', company: 'MediCare+', email: 'kashif@medicare.pk', phone: '+92 315 0123456', value: 175000, stage: 'Proposal', source: 'Website', owner: 'Zain A.', createdAt: '2026-08-25' },
  { id: 'L-011', name: 'Zoya Butt', company: 'CloudNine', email: 'zoya@cloudnine.io', phone: '+92 326 1234567', value: 280000, stage: 'Negotiation', source: 'LinkedIn', owner: 'Ahsan K.', createdAt: '2026-08-23' },
  { id: 'L-012', name: 'Faizan Ahmed', company: 'QuickShip', email: 'faizan@quickship.com', phone: '+92 337 2345678', value: 78000, stage: 'Lost', source: 'Cold Call', owner: 'Fatima S.', createdAt: '2026-08-15' },
];

export const leadStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
