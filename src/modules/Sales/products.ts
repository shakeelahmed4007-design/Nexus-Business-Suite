export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  emoji: string;
};

export const products: Product[] = [
  { id: 'P-001', name: 'Wireless Headphones', category: 'Electronics', price: 4500, stock: 34, sku: 'WH-001', emoji: '🎧' },
  { id: 'P-002', name: 'Smart Watch Pro', category: 'Electronics', price: 12000, stock: 18, sku: 'SW-002', emoji: '⌚' },
  { id: 'P-003', name: 'Bluetooth Speaker', category: 'Electronics', price: 3200, stock: 52, sku: 'BS-003', emoji: '🔊' },
  { id: 'P-004', name: 'USB-C Cable 2m', category: 'Accessories', price: 450, stock: 200, sku: 'UC-004', emoji: '🔌' },
  { id: 'P-005', name: 'Laptop Stand', category: 'Accessories', price: 2800, stock: 41, sku: 'LS-005', emoji: '💻' },
  { id: 'P-006', name: 'Wireless Mouse', category: 'Accessories', price: 1500, stock: 87, sku: 'WM-006', emoji: '🖱️' },
  { id: 'P-007', name: 'Mechanical Keyboard', category: 'Accessories', price: 6500, stock: 23, sku: 'MK-007', emoji: '⌨️' },
  { id: 'P-008', name: 'Power Bank 20000mAh', category: 'Electronics', price: 3800, stock: 65, sku: 'PB-008', emoji: '🔋' },
  { id: 'P-009', name: 'Phone Case Pro', category: 'Accessories', price: 800, stock: 150, sku: 'PC-009', emoji: '📱' },
  { id: 'P-010', name: 'Webcam HD 1080p', category: 'Electronics', price: 4200, stock: 29, sku: 'WC-010', emoji: '📷' },
  { id: 'P-011', name: 'Desk Lamp LED', category: 'Home', price: 2200, stock: 44, sku: 'DL-011', emoji: '💡' },
  { id: 'P-012', name: 'Notebook A5 Premium', category: 'Stationery', price: 600, stock: 320, sku: 'NB-012', emoji: '📓' },
];

export const productCategories = ['All', 'Electronics', 'Accessories', 'Home', 'Stationery'];
