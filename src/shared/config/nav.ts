import {
  LayoutDashboard,
  Users,
  Building2,
  ShoppingCart,
  Package,
  Boxes,
  Warehouse,
  TrendingDown,
  CreditCard,
  BookOpen,
  FileText,
  Phone,
  UserCircle,
  Share2,
  UserSquare2,
  CheckSquare,
  BarChart3,
  Sparkles,
  FileBarChart,
  LineChart,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  group: string;
  allowedRoles?: string[];
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'Overview', allowedRoles: ['Admin', 'Call Agent', 'Inventory Manager', 'HR'] },
  { label: 'Reports', path: '/reports', icon: BarChart3, group: 'Overview', allowedRoles: ['Admin', 'Call Agent', 'Inventory Manager', 'HR'] },

  { label: 'Lead Management', path: '/leads', icon: Users, group: 'CRM', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Customer Data', path: '/customers', icon: UserCircle, group: 'CRM', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Calling Data', path: '/calls', icon: Phone, group: 'CRM', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Tasks & Follow-ups', path: '/tasks', icon: CheckSquare, group: 'CRM', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Smart Follow-up AI', path: '/smart-followup', icon: Sparkles, group: 'CRM', allowedRoles: ['Admin', 'Call Agent'] },

  { label: 'POS', path: '/pos', icon: ShoppingCart, group: 'Sales', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Orders', path: '/orders', icon: Package, group: 'Sales', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Invoices', path: '/invoices', icon: FileText, group: 'Sales', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Payments', path: '/payments', icon: CreditCard, group: 'Sales', allowedRoles: ['Admin', 'Call Agent'] },
  { label: 'Purchases', path: '/purchases', icon: BookOpen, group: 'Sales', allowedRoles: ['Admin', 'Call Agent'] },

  { label: 'Stock', path: '/stock', icon: Boxes, group: 'Inventory', allowedRoles: ['Admin', 'Inventory Manager'] },
  { label: 'Warehouse', path: '/warehouse', icon: Warehouse, group: 'Inventory', allowedRoles: ['Admin', 'Inventory Manager'] },
  { label: 'Vendors', path: '/vendors', icon: Building2, group: 'Inventory', allowedRoles: ['Admin', 'Inventory Manager'] },

  { label: 'Team / HR', path: '/hr', icon: UserSquare2, group: 'Organization', allowedRoles: ['Admin', 'HR'] },
  { label: 'Social Media', path: '/social', icon: Share2, group: 'Organization', allowedRoles: ['Admin', 'HR', 'Call Agent'] },
  { label: 'Messages', path: '/messages', icon: MessageSquare, group: 'Organization', allowedRoles: ['Admin', 'HR', 'Call Agent'] },

  { label: 'Auto-Report AI', path: '/auto-report', icon: FileBarChart, group: 'Intelligence', allowedRoles: ['Admin'] },
  { label: 'Forecasting', path: '/forecasting', icon: LineChart, group: 'Intelligence', allowedRoles: ['Admin'] },
];

export const navGroups = Array.from(new Set(navItems.map((n) => n.group)));
