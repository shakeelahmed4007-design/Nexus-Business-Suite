import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/shared/context/ThemeContext';
import { AuthProvider } from '@/shared/context/AuthContext';
import { RequireRole } from '@/shared/components/RequireRole';

import { LoginPage } from '@/modules/Auth/LoginPage';
import { ShopAdminDashboard } from '@/modules/ShopAdmin/ShopAdminDashboard';
import { StaffDashboard } from '@/modules/Staff/StaffDashboard';

import { AppLayout } from '@/shared/components/layout/AppLayout';
import { DashboardPage } from '@/modules/Overview/DashboardPage';
import { ReportsPage } from '@/modules/Overview/ReportsPage';
import { LeadsPage } from '@/modules/CRM/LeadsPage';
import { CustomersPage } from '@/modules/CRM/CustomersPage';
import { CallsPage } from '@/modules/CRM/CallsPage';
import { TasksPage } from '@/modules/CRM/TasksPage';
import { SmartFollowupPage } from '@/modules/CRM/SmartFollowupPage';
import { PosPage } from '@/modules/Sales/PosPage';
import { OrdersPage } from '@/modules/Sales/OrdersPage';
import { InvoicesPage } from '@/modules/Sales/InvoicesPage';
import { PaymentsPage } from '@/modules/Sales/PaymentsPage';
import { PurchasesPage } from '@/modules/Sales/PurchasesPage';
import { StockPage } from '@/modules/Inventory/StockPage';
import { WarehousePage } from '@/modules/Inventory/WarehousePage';
import { VendorsPage } from '@/modules/Inventory/VendorsPage';
import { HrPage } from '@/modules/Organization/HrPage';
import { SocialPage } from '@/modules/Organization/SocialPage';
import { MessagesPage } from '@/modules/Organization/MessagesPage';
import { IntegrationsPage } from '@/modules/Organization/IntegrationsPage';
import { AutoReportPage } from '@/modules/Intelligence/AutoReportPage';
import { ForecastingPage } from '@/modules/Intelligence/ForecastingPage';
import { AdminManagementPage } from '@/modules/Admin/AdminManagementPage';
import { TeamManagementPage } from '@/modules/Admin/TeamManagementPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Dedicated Route */}
            <Route
              path="/admin"
              element={
                <RequireRole allowedRoles={['admin', 'shop_admin']}>
                  <ShopAdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/shop-admin"
              element={
                <RequireRole allowedRoles={['admin', 'shop_admin']}>
                  <ShopAdminDashboard />
                </RequireRole>
              }
            />

            {/* Sales / Staff Route fallback */}
            <Route
              path="/sales"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/staff"
              element={<Navigate to="/" replace />}
            />

            {/* Main Application Suite for All Logged In Users */}
            <Route
              path="/*"
              element={
                <RequireRole allowedRoles={['super_admin', 'admin', 'shop_admin', 'sales', 'staff']}>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/leads" element={<LeadsPage />} />
                      <Route path="/customers" element={<CustomersPage />} />
                      <Route path="/calls" element={<CallsPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/smart-followup" element={<SmartFollowupPage />} />
                      <Route path="/pos" element={<PosPage />} />
                      <Route path="/orders" element={<OrdersPage />} />
                      <Route path="/invoices" element={<InvoicesPage />} />
                      <Route path="/payments" element={<PaymentsPage />} />
                      <Route path="/purchases" element={<PurchasesPage />} />
                      <Route path="/stock" element={<StockPage />} />
                      <Route path="/warehouse" element={<WarehousePage />} />
                      <Route path="/vendors" element={<VendorsPage />} />
                      <Route path="/hr" element={<HrPage />} />
                      <Route path="/social" element={<SocialPage />} />
                      <Route path="/messages" element={<MessagesPage />} />
                      <Route path="/integrations" element={<IntegrationsPage />} />
                      <Route path="/auto-report" element={<AutoReportPage />} />
                      <Route path="/forecasting" element={<ForecastingPage />} />
                      <Route path="/admin-management" element={<AdminManagementPage />} />
                      <Route path="/team-management" element={<TeamManagementPage />} />
                      <Route path="/overview/team-management" element={<TeamManagementPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppLayout>
                </RequireRole>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
