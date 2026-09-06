const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'src');

const mappings = [
  // Overview
  ['pages/DashboardPage.tsx', 'modules/Overview/DashboardPage.tsx'],
  ['pages/ReportsPage.tsx', 'modules/Overview/ReportsPage.tsx'],
  ['data/dashboard.ts', 'modules/Overview/dashboard.ts'],

  // CRM
  ['pages/LeadsPage.tsx', 'modules/CRM/LeadsPage.tsx'],
  ['pages/CustomersPage.tsx', 'modules/CRM/CustomersPage.tsx'],
  ['pages/CallsPage.tsx', 'modules/CRM/CallsPage.tsx'],
  ['pages/TasksPage.tsx', 'modules/CRM/TasksPage.tsx'],
  ['pages/SmartFollowupPage.tsx', 'modules/CRM/SmartFollowupPage.tsx'],
  ['data/leads.ts', 'modules/CRM/leads.ts'],
  ['data/customers.ts', 'modules/CRM/customers.ts'],
  ['data/calls.ts', 'modules/CRM/calls.ts'],
  ['data/tasks.ts', 'modules/CRM/tasks.ts'],
  ['data/aiSuggestions.ts', 'modules/CRM/aiSuggestions.ts'],

  // Sales
  ['pages/PosPage.tsx', 'modules/Sales/PosPage.tsx'],
  ['pages/OrdersPage.tsx', 'modules/Sales/OrdersPage.tsx'],
  ['pages/InvoicesPage.tsx', 'modules/Sales/InvoicesPage.tsx'],
  ['pages/PaymentsPage.tsx', 'modules/Sales/PaymentsPage.tsx'],
  ['pages/PurchasesPage.tsx', 'modules/Sales/PurchasesPage.tsx'],
  ['data/products.ts', 'modules/Sales/products.ts'],
  ['data/orders.ts', 'modules/Sales/orders.ts'],
  ['data/invoices.ts', 'modules/Sales/invoices.ts'],
  ['data/payments.ts', 'modules/Sales/payments.ts'],
  ['data/purchases.ts', 'modules/Sales/purchases.ts'],

  // Inventory
  ['pages/StockPage.tsx', 'modules/Inventory/StockPage.tsx'],
  ['pages/WarehousePage.tsx', 'modules/Inventory/WarehousePage.tsx'],
  ['pages/VendorsPage.tsx', 'modules/Inventory/VendorsPage.tsx'],
  ['data/stock.ts', 'modules/Inventory/stock.ts'],
  ['data/warehouse.ts', 'modules/Inventory/warehouse.ts'],
  ['data/vendors.ts', 'modules/Inventory/vendors.ts'],

  // Organization
  ['pages/HrPage.tsx', 'modules/Organization/HrPage.tsx'],
  ['pages/SocialPage.tsx', 'modules/Organization/SocialPage.tsx'],
  ['pages/MessagesPage.tsx', 'modules/Organization/MessagesPage.tsx'],
  ['data/employees.ts', 'modules/Organization/employees.ts'],
  ['data/social.ts', 'modules/Organization/social.ts'],
  ['data/messages.ts', 'modules/Organization/messages.ts'],

  // Intelligence
  ['pages/AutoReportPage.tsx', 'modules/Intelligence/AutoReportPage.tsx'],
  ['pages/ForecastingPage.tsx', 'modules/Intelligence/ForecastingPage.tsx'],
  ['data/forecast.ts', 'modules/Intelligence/forecast.ts'],
];

// Moving directories to shared
const sharedDirs = ['components/ui', 'components/layout', 'context', 'config'];

// Create module directories
const modules = ['Overview', 'CRM', 'Sales', 'Inventory', 'Organization', 'Intelligence'];
modules.forEach(mod => {
  const modPath = path.join(rootDir, 'modules', mod);
  if (!fs.existsSync(modPath)) {
    fs.mkdirSync(modPath, { recursive: true });
  }
});

// Create shared directories
const sharedDirRoot = path.join(rootDir, 'shared');
if (!fs.existsSync(sharedDirRoot)) {
  fs.mkdirSync(sharedDirRoot, { recursive: true });
}

// Move files based on mapping
mappings.forEach(([src, dest]) => {
  const srcPath = path.join(rootDir, src);
  const destPath = path.join(rootDir, dest);
  if (fs.existsSync(srcPath)) {
    console.log(`Moving ${src} to ${dest}`);
    fs.renameSync(srcPath, destPath);
  } else {
    console.warn(`Source not found: ${srcPath}`);
  }
});

// Move shared directories
sharedDirs.forEach(dir => {
  const srcPath = path.join(rootDir, dir);
  const destPath = path.join(rootDir, 'shared', dir);
  if (fs.existsSync(srcPath)) {
    const parentDest = path.dirname(destPath);
    if (!fs.existsSync(parentDest)) {
      fs.mkdirSync(parentDest, { recursive: true });
    }
    console.log(`Moving directory ${srcPath} to ${destPath}`);
    // node fs.renameSync can move directories across the same filesystem
    try {
      fs.renameSync(srcPath, destPath);
    } catch(e) {
      console.error(`Failed to move ${srcPath} to ${destPath}`, e);
    }
  } else {
    console.warn(`Directory not found: ${srcPath}`);
  }
});

// Recursively find all TS/TSX files and update imports
function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allTsFiles = walk(rootDir);

const importReplacements = [
  // shared components
  { from: /@\/components\/ui/g, to: '@/shared/components/ui' },
  { from: /@\/components\/layout/g, to: '@/shared/components/layout' },
  { from: /@\/context/g, to: '@/shared/context' },
  { from: /@\/config/g, to: '@/shared/config' },
  
  // Data imports
  { from: /@\/data\/dashboard/g, to: '@/modules/Overview/dashboard' },
  { from: /@\/data\/purchases/g, to: '@/modules/Sales/purchases' },
  { from: /@\/data\/leads/g, to: '@/modules/CRM/leads' },
  { from: /@\/data\/customers/g, to: '@/modules/CRM/customers' },
  { from: /@\/data\/calls/g, to: '@/modules/CRM/calls' },
  { from: /@\/data\/tasks/g, to: '@/modules/CRM/tasks' },
  { from: /@\/data\/aiSuggestions/g, to: '@/modules/CRM/aiSuggestions' },
  { from: /@\/data\/products/g, to: '@/modules/Sales/products' },
  { from: /@\/data\/orders/g, to: '@/modules/Sales/orders' },
  { from: /@\/data\/invoices/g, to: '@/modules/Sales/invoices' },
  { from: /@\/data\/payments/g, to: '@/modules/Sales/payments' },
  { from: /@\/data\/stock/g, to: '@/modules/Inventory/stock' },
  { from: /@\/data\/warehouse/g, to: '@/modules/Inventory/warehouse' },
  { from: /@\/data\/vendors/g, to: '@/modules/Inventory/vendors' },
  { from: /@\/data\/employees/g, to: '@/modules/Organization/employees' },
  { from: /@\/data\/social/g, to: '@/modules/Organization/social' },
  { from: /@\/data\/messages/g, to: '@/modules/Organization/messages' },
  { from: /@\/data\/forecast/g, to: '@/modules/Intelligence/forecast' },

  // Page imports
  { from: /@\/pages\/DashboardPage/g, to: '@/modules/Overview/DashboardPage' },
  { from: /@\/pages\/ReportsPage/g, to: '@/modules/Overview/ReportsPage' },
  { from: /@\/pages\/LeadsPage/g, to: '@/modules/CRM/LeadsPage' },
  { from: /@\/pages\/CustomersPage/g, to: '@/modules/CRM/CustomersPage' },
  { from: /@\/pages\/CallsPage/g, to: '@/modules/CRM/CallsPage' },
  { from: /@\/pages\/TasksPage/g, to: '@/modules/CRM/TasksPage' },
  { from: /@\/pages\/SmartFollowupPage/g, to: '@/modules/CRM/SmartFollowupPage' },
  { from: /@\/pages\/PosPage/g, to: '@/modules/Sales/PosPage' },
  { from: /@\/pages\/OrdersPage/g, to: '@/modules/Sales/OrdersPage' },
  { from: /@\/pages\/InvoicesPage/g, to: '@/modules/Sales/InvoicesPage' },
  { from: /@\/pages\/PaymentsPage/g, to: '@/modules/Sales/PaymentsPage' },
  { from: /@\/pages\/PurchasesPage/g, to: '@/modules/Sales/PurchasesPage' },
  { from: /@\/pages\/StockPage/g, to: '@/modules/Inventory/StockPage' },
  { from: /@\/pages\/WarehousePage/g, to: '@/modules/Inventory/WarehousePage' },
  { from: /@\/pages\/VendorsPage/g, to: '@/modules/Inventory/VendorsPage' },
  { from: /@\/pages\/HrPage/g, to: '@/modules/Organization/HrPage' },
  { from: /@\/pages\/SocialPage/g, to: '@/modules/Organization/SocialPage' },
  { from: /@\/pages\/MessagesPage/g, to: '@/modules/Organization/MessagesPage' },
  { from: /@\/pages\/AutoReportPage/g, to: '@/modules/Intelligence/AutoReportPage' },
  { from: /@\/pages\/ForecastingPage/g, to: '@/modules/Intelligence/ForecastingPage' },
];

allTsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;
  
  importReplacements.forEach(({from, to}) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated imports in ${file}`);
  }
});

console.log('Done!');
