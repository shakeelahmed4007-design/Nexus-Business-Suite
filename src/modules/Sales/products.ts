export type BulkPricingTier = {
  minQuantity: number;
  unitPrice: number;
  tierName?: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  emoji: string;
  bulkTiers?: BulkPricingTier[];
  reorderPoint?: number;
};

export const products: Product[] = [
  {
    id: 'P-001',
    name: 'Wireless Headphones',
    category: 'Electronics',
    price: 4500,
    stock: 34,
    sku: 'WH-001',
    emoji: '🎧',
    reorderPoint: 15,
    bulkTiers: [
      { minQuantity: 6, unitPrice: 4200, tierName: 'Bulk (6-20)' },
      { minQuantity: 21, unitPrice: 3800, tierName: 'Wholesale (21+)' },
    ],
  },
  {
    id: 'P-002',
    name: 'Smart Watch Pro',
    category: 'Electronics',
    price: 12000,
    stock: 18,
    sku: 'SW-002',
    emoji: '⌚',
    reorderPoint: 10,
    bulkTiers: [
      { minQuantity: 5, unitPrice: 11200, tierName: 'Bulk (5-15)' },
      { minQuantity: 16, unitPrice: 10500, tierName: 'Wholesale (16+)' },
    ],
  },
  {
    id: 'P-003',
    name: 'Bluetooth Speaker',
    category: 'Electronics',
    price: 3200,
    stock: 52,
    sku: 'BS-003',
    emoji: '🔊',
    reorderPoint: 20,
    bulkTiers: [
      { minQuantity: 10, unitPrice: 2950, tierName: 'Bulk (10-25)' },
      { minQuantity: 26, unitPrice: 2700, tierName: 'Wholesale (26+)' },
    ],
  },
  {
    id: 'P-004',
    name: 'USB-C Cable 2m',
    category: 'Accessories',
    price: 450,
    stock: 200,
    sku: 'UC-004',
    emoji: '🔌',
    reorderPoint: 50,
    bulkTiers: [
      { minQuantity: 20, unitPrice: 380, tierName: 'Pack (20-49)' },
      { minQuantity: 50, unitPrice: 320, tierName: 'Wholesale (50+)' },
    ],
  },
  {
    id: 'P-005',
    name: 'Laptop Stand',
    category: 'Accessories',
    price: 2800,
    stock: 41,
    sku: 'LS-005',
    emoji: '💻',
    reorderPoint: 12,
    bulkTiers: [
      { minQuantity: 6, unitPrice: 2500, tierName: 'Bulk (6-15)' },
      { minQuantity: 16, unitPrice: 2200, tierName: 'Wholesale (16+)' },
    ],
  },
  {
    id: 'P-006',
    name: 'Wireless Mouse',
    category: 'Accessories',
    price: 1500,
    stock: 87,
    sku: 'WM-006',
    emoji: '🖱️',
    reorderPoint: 25,
    bulkTiers: [
      { minQuantity: 10, unitPrice: 1350, tierName: 'Bulk (10-24)' },
      { minQuantity: 25, unitPrice: 1200, tierName: 'Wholesale (25+)' },
    ],
  },
  {
    id: 'P-007',
    name: 'Mechanical Keyboard',
    category: 'Accessories',
    price: 6500,
    stock: 23,
    sku: 'MK-007',
    emoji: '⌨️',
    reorderPoint: 8,
    bulkTiers: [
      { minQuantity: 5, unitPrice: 6000, tierName: 'Bulk (5-14)' },
      { minQuantity: 15, unitPrice: 5500, tierName: 'Wholesale (15+)' },
    ],
  },
  {
    id: 'P-008',
    name: 'Power Bank 20000mAh',
    category: 'Electronics',
    price: 3800,
    stock: 65,
    sku: 'PB-008',
    emoji: '🔋',
    reorderPoint: 15,
    bulkTiers: [
      { minQuantity: 8, unitPrice: 3500, tierName: 'Bulk (8-19)' },
      { minQuantity: 20, unitPrice: 3200, tierName: 'Wholesale (20+)' },
    ],
  },
  {
    id: 'P-009',
    name: 'Phone Case Pro',
    category: 'Accessories',
    price: 800,
    stock: 150,
    sku: 'PC-009',
    emoji: '📱',
    reorderPoint: 30,
    bulkTiers: [
      { minQuantity: 15, unitPrice: 680, tierName: 'Bulk (15-49)' },
      { minQuantity: 50, unitPrice: 550, tierName: 'Wholesale (50+)' },
    ],
  },
  {
    id: 'P-010',
    name: 'Webcam HD 1080p',
    category: 'Electronics',
    price: 4200,
    stock: 29,
    sku: 'WC-010',
    emoji: '📷',
    reorderPoint: 10,
    bulkTiers: [
      { minQuantity: 5, unitPrice: 3850, tierName: 'Bulk (5-14)' },
      { minQuantity: 15, unitPrice: 3500, tierName: 'Wholesale (15+)' },
    ],
  },
  {
    id: 'P-011',
    name: 'Desk Lamp LED',
    category: 'Home',
    price: 2200,
    stock: 44,
    sku: 'DL-011',
    emoji: '💡',
    reorderPoint: 12,
    bulkTiers: [
      { minQuantity: 8, unitPrice: 1950, tierName: 'Bulk (8-19)' },
      { minQuantity: 20, unitPrice: 1750, tierName: 'Wholesale (20+)' },
    ],
  },
  {
    id: 'P-012',
    name: 'Notebook A5 Premium',
    category: 'Stationery',
    price: 600,
    stock: 320,
    sku: 'NB-012',
    emoji: '📓',
    reorderPoint: 60,
    bulkTiers: [
      { minQuantity: 25, unitPrice: 520, tierName: 'Bulk (25-99)' },
      { minQuantity: 100, unitPrice: 450, tierName: 'Wholesale (100+)' },
    ],
  },
];

export const productCategories = ['All', 'Electronics', 'Accessories', 'Home', 'Stationery'];
