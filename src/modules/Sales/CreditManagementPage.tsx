import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Search,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Users,
  ShieldAlert,
  Loader2,
  FileText,
  Sliders,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { useAuth } from '@/shared/context/AuthContext';
import { getOwnerAdminEmail } from '@/shared/lib/adminStore';
import { useCustomers } from '@/modules/CRM/useCrmApi';
import {
  fetchCustomerCreditReportApi,
  fetchCustomerCreditLedgerApi,
  recordCreditSaleApi,
  recordCustomerPaymentApi,
  updateCustomerCreditLimitApi,
  fetchVendorCreditReportApi,
  fetchVendorCreditLedgerApi,
  recordCreditPurchaseApi,
  recordVendorPaymentApi,
  updateVendorCreditLimitApi,
  fetchOverdueReportApi,
  fetchRunningSalesHistoryApi,
  type CustomerCreditStatus,
  type CustomerCreditLedgerEntry,
  type VendorCreditStatus,
  type VendorCreditLedgerEntry,
} from './creditApiService';

export function CreditManagementPage() {
  const { user, profile } = useAuth();
  const shopId = getOwnerAdminEmail(user?.email, profile?.role) || 'shop-001';

  const [activeTab, setActiveTab] = useState<'customers' | 'vendors' | 'overdue' | 'running'>('customers');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer Credit state
  const [customerReport, setCustomerReport] = useState<{ summary: any; customers: CustomerCreditStatus[] }>({
    summary: {
      totalCustomers: 0,
      totalCreditLimitExtended: 0,
      totalOutstandingReceivable: 0,
      totalAvailableCredit: 0,
      customersInWarning: 0,
      customersBlocked: 0,
      customersOverdue: 0,
      totalOverdueAmount: 0,
    },
    customers: [],
  });

  // Vendor Credit state
  const [vendorReport, setVendorReport] = useState<{ summary: any; vendors: VendorCreditStatus[] }>({
    summary: {
      totalVendors: 0,
      totalCreditLimitExtended: 0,
      totalOutstandingPayable: 0,
      totalAvailableCredit: 0,
      vendorsInWarning: 0,
      vendorsExceeded: 0,
    },
    vendors: [],
  });

  // Overdue report state
  const [overdueData, setOverdueData] = useState<any>(null);

  // Running sales state
  const [runningSalesData, setRunningSalesData] = useState<any>(null);

  // Modals state
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<CustomerCreditStatus | null>(null);
  const [customerLedgerEntries, setCustomerLedgerEntries] = useState<CustomerCreditLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerCreditStatus | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [targetEntityForLimit, setTargetEntityForLimit] = useState<{ id: string; name: string; type: 'customer' | 'vendor'; currentLimit: number } | null>(null);
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [limitSubmitting, setLimitSubmitting] = useState(false);

  const { customers: crmCustomers } = useCustomers();

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleCustomerId, setSaleCustomerId] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleDownPayment, setSaleDownPayment] = useState('');
  const [saleInvoiceRef, setSaleInvoiceRef] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleError, setSaleError] = useState('');
  const [saleSubmitting, setSaleSubmitting] = useState(false);

  // Combine customers from Credit Service report with CRM customers
  const allAvailableCustomers = useMemo(() => {
    const list: Array<{ id: string; name: string; phone?: string; availableCredit: number }> = [];
    const seen = new Set<string>();

    // 1. Customers from credit report
    customerReport.customers.forEach((c) => {
      seen.add(c.customerId);
      list.push({
        id: c.customerId,
        name: c.customerName,
        phone: c.phone,
        availableCredit: c.availableCredit,
      });
    });

    // 2. Customers from CRM module
    crmCustomers.forEach((c) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Registered Customer';
        list.push({
          id: c.id,
          name,
          phone: c.phone,
          availableCredit: (c as any).creditLimit || 500000,
        });
      }
    });

    return list;
  }, [customerReport.customers, crmCustomers]);

  // Vendor Modals
  const [vLedgerModalOpen, setVLedgerModalOpen] = useState(false);
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState<VendorCreditStatus | null>(null);
  const [vendorLedgerEntries, setVendorLedgerEntries] = useState<VendorCreditLedgerEntry[]>([]);

  const [vPaymentModalOpen, setVPaymentModalOpen] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<VendorCreditStatus | null>(null);
  const [vPaymentAmount, setVPaymentAmount] = useState('');
  const [vPaymentNotes, setVPaymentNotes] = useState('');
  const [vPaymentSubmitting, setVPaymentSubmitting] = useState(false);

  const [vPurchaseModalOpen, setVPurchaseModalOpen] = useState(false);
  const [vPurchaseVendorId, setVPurchaseVendorId] = useState('');
  const [vPurchaseAmount, setVPurchaseAmount] = useState('');
  const [vPurchaseDownPayment, setVPurchaseDownPayment] = useState('');
  const [vPurchaseNotes, setVPurchaseNotes] = useState('');
  const [vAllowOverride, setVAllowOverride] = useState(false);
  const [vPurchaseError, setVPurchaseError] = useState('');
  const [vPurchaseSubmitting, setVPurchaseSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'customers') {
        const data = await fetchCustomerCreditReportApi(shopId, { search: searchQuery });
        setCustomerReport(data);
      } else if (activeTab === 'vendors') {
        const data = await fetchVendorCreditReportApi(shopId);
        setVendorReport(data);
      } else if (activeTab === 'overdue') {
        const data = await fetchOverdueReportApi(30, shopId);
        setOverdueData(data);
      } else if (activeTab === 'running') {
        const data = await fetchRunningSalesHistoryApi(shopId);
        setRunningSalesData(data);
      }
    } catch (e) {
      console.error('Failed to load credit data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, shopId]);

  // Open Ledger
  const handleOpenLedger = async (cust: CustomerCreditStatus) => {
    setSelectedCustomerForLedger(cust);
    setLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await fetchCustomerCreditLedgerApi(cust.customerId, shopId);
      setCustomerLedgerEntries(res.entries);
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Submit Payment
  const handlePaymentSubmit = async () => {
    if (!selectedCustomerForPayment || !paymentAmount) return;
    setPaymentSubmitting(true);
    try {
      await recordCustomerPaymentApi({
        customer_id: selectedCustomerForPayment.customerId,
        amount_paid: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes,
        shop_id: shopId,
      });
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Submit Limit Update
  const handleLimitSubmit = async () => {
    if (!targetEntityForLimit || newCreditLimit === '') return;
    setLimitSubmitting(true);
    try {
      if (targetEntityForLimit.type === 'customer') {
        await updateCustomerCreditLimitApi(targetEntityForLimit.id, Number(newCreditLimit), shopId);
      } else {
        await updateVendorCreditLimitApi(targetEntityForLimit.id, Number(newCreditLimit), shopId);
      }
      setLimitModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update credit limit');
    } finally {
      setLimitSubmitting(false);
    }
  };

  // Submit Credit Sale
  const handleCreditSaleSubmit = async () => {
    if (!saleCustomerId || !saleAmount) return;
    setSaleSubmitting(true);
    setSaleError('');
    try {
      const combinedNote = [
        saleInvoiceRef ? `[Order/Ref: ${saleInvoiceRef.trim()}]` : '',
        saleNotes?.trim() || 'Direct Credit Sale',
      ]
        .filter(Boolean)
        .join(' ');

      await recordCreditSaleApi({
        customer_id: saleCustomerId,
        sale_amount: Number(saleAmount),
        payment_received_today: Number(saleDownPayment || 0),
        notes: combinedNote,
        shop_id: shopId,
      });
      setSaleModalOpen(false);
      setSaleCustomerId('');
      setSaleAmount('');
      setSaleDownPayment('');
      setSaleInvoiceRef('');
      setSaleNotes('');
      await loadData();
    } catch (err: any) {
      setSaleError(err.message || 'Sale blocked');
    } finally {
      setSaleSubmitting(false);
    }
  };

  // Vendor actions
  const handleOpenVendorLedger = async (v: VendorCreditStatus) => {
    setSelectedVendorForLedger(v);
    setVLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await fetchVendorCreditLedgerApi(v.vendorId, shopId);
      setVendorLedgerEntries(res.entries);
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleVendorPaymentSubmit = async () => {
    if (!selectedVendorForPayment || !vPaymentAmount) return;
    setVPaymentSubmitting(true);
    try {
      await recordVendorPaymentApi({
        vendor_id: selectedVendorForPayment.vendorId,
        amount_paid: Number(vPaymentAmount),
        notes: vPaymentNotes,
        shop_id: shopId,
      });
      setVPaymentModalOpen(false);
      setVPaymentAmount('');
      setVPaymentNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setVPaymentSubmitting(false);
    }
  };

  const handleVendorPurchaseSubmit = async () => {
    if (!vPurchaseVendorId || !vPurchaseAmount) return;
    setVPurchaseSubmitting(true);
    setVPurchaseError('');
    try {
      await recordCreditPurchaseApi({
        vendor_id: vPurchaseVendorId,
        purchase_amount: Number(vPurchaseAmount),
        payment_paid_today: Number(vPurchaseDownPayment || 0),
        allow_override: vAllowOverride,
        notes: vPurchaseNotes,
        shop_id: shopId,
      });
      setVPurchaseModalOpen(false);
      setVPurchaseVendorId('');
      setVPurchaseAmount('');
      setVPurchaseDownPayment('');
      setVAllowOverride(false);
      await loadData();
    } catch (err: any) {
      setVPurchaseError(err.message || 'Purchase blocked');
    } finally {
      setVPurchaseSubmitting(false);
    }
  };

  const getBadgeTone = (color: string): 'brand' | 'green' | 'amber' | 'rose' | 'gray' => {
    switch (color) {
      case 'Green': return 'green';
      case 'Yellow': return 'amber';
      case 'Red': return 'rose';
      case 'Black': return 'gray';
      default: return 'brand';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Credit Management System"
        subtitle="Track customer and vendor credit limits, available balances, installment repayments, and running sales."
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setSaleModalOpen(true)}>
            <Plus className="h-4 w-4" /> New Credit Sale
          </Button>
        </div>
      </PageHeader>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Credit Extended</span>
            <div className="rounded-xl bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/10">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-ink-900 dark:text-ink-50">
            PKR {customerReport.summary.totalCreditLimitExtended.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-ink-500">Active credit ceiling across customers</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Receivables (Owed)</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-500/10">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
            PKR {customerReport.summary.totalOutstandingReceivable.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-ink-500">Customers' outstanding credit balance</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Available Credit</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            PKR {customerReport.summary.totalAvailableCredit.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-ink-500">Remaining credit headroom for sales</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Risk & Overdue Alerts</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {customerReport.summary.customersBlocked + customerReport.summary.customersInWarning}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {customerReport.summary.customersBlocked} blocked · {customerReport.summary.customersInWarning} warning
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-200 dark:border-ink-800">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === 'customers'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <Users className="h-4 w-4" /> Customer Credit Accounts
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === 'vendors'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <Building2 className="h-4 w-4" /> Vendor Credit (Purchases)
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === 'overdue'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <Clock className="h-4 w-4" /> Overdue Aging Analysis
        </button>
        <button
          onClick={() => setActiveTab('running')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === 'running'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Running Sales (Cash)
        </button>
      </div>

      {/* TAB 1: CUSTOMER CREDIT ACCOUNTS */}
      {activeTab === 'customers' && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100 dark:border-ink-800">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, phone..."
                className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm dark:border-ink-700 dark:bg-ink-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setSaleModalOpen(true)}>
                <Plus className="h-4 w-4" /> Record Credit Sale
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-ink-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading customer credit accounts...</span>
            </div>
          ) : customerReport.customers.length === 0 ? (
            <div className="p-12 text-center text-ink-400">No customer credit accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-800/50">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Credit Limit</th>
                    <th className="px-5 py-3">Outstanding (Owing)</th>
                    <th className="px-5 py-3">Available Credit</th>
                    <th className="px-5 py-3">% Used</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {customerReport.customers.map((c) => (
                    <tr key={c.customerId} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink-900 dark:text-ink-50">{c.customerName}</p>
                        <p className="text-xs text-ink-400">{c.phone || c.email || 'No contact'}</p>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-ink-700 dark:text-ink-200">
                        PKR {c.creditLimit.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        PKR {c.currentOutstanding.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        PKR {c.availableCredit.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
                            <div
                              className={`h-full ${
                                c.percentageUsed >= 80 ? 'bg-rose-500' : c.percentageUsed >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, c.percentageUsed)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{c.percentageUsed}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={getBadgeTone(c.badgeColor)}>{c.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomerForPayment(c);
                              setPaymentModalOpen(true);
                            }}
                          >
                            <DollarSign className="h-3.5 w-3.5" /> Pay
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenLedger(c)}>
                            <FileText className="h-3.5 w-3.5" /> Ledger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTargetEntityForLimit({
                                id: c.customerId,
                                name: c.customerName,
                                type: 'customer',
                                currentLimit: c.creditLimit,
                              });
                              setNewCreditLimit(c.creditLimit.toString());
                              setLimitModalOpen(true);
                            }}
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: VENDOR CREDIT (PURCHASES) */}
      {activeTab === 'vendors' && (
        <Card className="overflow-hidden">
          <div className="flex justify-between p-4 border-b border-ink-100 dark:border-ink-800">
            <div>
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Vendor Credit Tracking</h3>
              <p className="text-xs text-ink-400">Manage vendor credit limits and outstanding liabilities (Accounts Payable)</p>
            </div>
            <Button size="sm" onClick={() => setVPurchaseModalOpen(true)}>
              <Plus className="h-4 w-4" /> New Credit Purchase
            </Button>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-ink-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading vendor credit accounts...</span>
            </div>
          ) : vendorReport.vendors.length === 0 ? (
            <div className="p-12 text-center text-ink-400">No vendor credit accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-800/50">
                  <tr>
                    <th className="px-5 py-3">Vendor</th>
                    <th className="px-5 py-3">Credit Limit</th>
                    <th className="px-5 py-3">Owing to Vendor</th>
                    <th className="px-5 py-3">Available Purchasing Credit</th>
                    <th className="px-5 py-3">% Used</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {vendorReport.vendors.map((v) => (
                    <tr key={v.vendorId} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink-900 dark:text-ink-50">{v.vendorName}</p>
                        <p className="text-xs text-ink-400">{v.contactNumber || v.email || 'No contact'}</p>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium">PKR {v.creditLimit.toLocaleString()}</td>
                      <td className="px-5 py-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                        PKR {v.currentOutstanding.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        PKR {v.availableCredit.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={getBadgeTone(v.badgeColor)}>{v.status}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold">{v.percentageUsed}%</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVendorForPayment(v);
                              setVPaymentModalOpen(true);
                            }}
                          >
                            <DollarSign className="h-3.5 w-3.5" /> Pay Vendor
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenVendorLedger(v)}>
                            <FileText className="h-3.5 w-3.5" /> Ledger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTargetEntityForLimit({
                                id: v.vendorId,
                                name: v.vendorName,
                                type: 'vendor',
                                currentLimit: v.creditLimit,
                              });
                              setNewCreditLimit(v.creditLimit.toString());
                              setLimitModalOpen(true);
                            }}
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: OVERDUE AGING ANALYSIS */}
      {activeTab === 'overdue' && (
        <div className="space-y-6">
          {overdueData && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Object.entries(overdueData.agingBuckets || {}).map(([bucket, val]: [string, any]) => (
                  <Card key={bucket} className="p-4 border-t-4 border-t-amber-500">
                    <p className="text-xs font-semibold text-ink-500">{bucket}</p>
                    <p className="mt-2 text-xl font-bold text-ink-900 dark:text-ink-50">
                      PKR {val.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-ink-400">{val.count} accounts</p>
                  </Card>
                ))}
              </div>

              <Card className="overflow-hidden">
                <div className="p-4 border-b border-ink-100 dark:border-ink-800">
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Overdue Customer Receivables</h3>
                </div>
                {overdueData.items?.length === 0 ? (
                  <div className="p-8 text-center text-ink-400">No overdue customer accounts. All customers in good standing!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-ink-50 text-xs font-semibold uppercase text-ink-500">
                        <tr>
                          <th className="px-5 py-3">Customer</th>
                          <th className="px-5 py-3">Days Past Due</th>
                          <th className="px-5 py-3">Aging Bracket</th>
                          <th className="px-5 py-3">Overdue Balance</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {overdueData.items?.map((item: any) => (
                          <tr key={item.customerId}>
                            <td className="px-5 py-4">
                              <p className="font-semibold">{item.customerName}</p>
                              <p className="text-xs text-ink-400">{item.phone}</p>
                            </td>
                            <td className="px-5 py-4 font-semibold text-rose-600">{item.daysPastDue} Days</td>
                            <td className="px-5 py-4"><Badge tone="amber">{item.bucket}</Badge></td>
                            <td className="px-5 py-4 font-mono font-bold text-rose-600">PKR {item.overdueAmount.toLocaleString()}</td>
                            <td className="px-5 py-4 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomerForPayment({
                                    customerId: item.customerId,
                                    customerName: item.customerName,
                                    creditLimit: item.creditLimit,
                                    currentOutstanding: item.currentOutstanding,
                                    availableCredit: 0,
                                    percentageUsed: 100,
                                    status: 'Overdue',
                                    badgeColor: 'Red',
                                    isOverdue: true,
                                    overdueDays: item.daysPastDue,
                                  });
                                  setPaymentModalOpen(true);
                                }}
                              >
                                Record Payment
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 4: RUNNING SALES (CASH) */}
      {activeTab === 'running' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-ink-100 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Running Sales (Immediate Cash)</h3>
            <p className="text-xs text-ink-400">Cash POS sales where customers paid immediately in full, kept separate from credit sales.</p>
          </div>
          {runningSalesData?.runningSales?.length === 0 ? (
            <div className="p-8 text-center text-ink-400">No running cash sales recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs font-semibold uppercase text-ink-500">
                  <tr>
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Items</th>
                    <th className="px-5 py-3">Payment Method</th>
                    <th className="px-5 py-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {runningSalesData?.runningSales?.map((sale: any) => (
                    <tr key={sale.order_id}>
                      <td className="px-5 py-3 font-mono text-xs">{sale.order_id.slice(0, 8)}</td>
                      <td className="px-5 py-3">{new Date(sale.order_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3">{sale.order_items?.length || 1} items</td>
                      <td className="px-5 py-3"><Badge tone="green">Cash / Immediate</Badge></td>
                      <td className="px-5 py-3 text-right font-mono font-bold">PKR {Number(sale.total_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: CUSTOMER CREDIT LEDGER                                     */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={ledgerModalOpen}
        onClose={() => setLedgerModalOpen(false)}
        title={`Credit Ledger: ${selectedCustomerForLedger?.customerName}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-xs dark:bg-ink-800">
            <div>
              <span className="text-ink-400">Limit:</span>
              <p className="font-bold">PKR {selectedCustomerForLedger?.creditLimit.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-ink-400">Outstanding:</span>
              <p className="font-bold text-amber-600">PKR {selectedCustomerForLedger?.currentOutstanding.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-ink-400">Available:</span>
              <p className="font-bold text-emerald-600">PKR {selectedCustomerForLedger?.availableCredit.toLocaleString()}</p>
            </div>
          </div>

          {ledgerLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-ink-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading ledger entries...</span>
            </div>
          ) : customerLedgerEntries.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-400">No transaction entries found for this customer.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-ink-900 border-b border-ink-100 font-semibold text-ink-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Running Balance</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {customerLedgerEntries.map((e) => (
                    <tr key={e.ledgerId}>
                      <td className="py-2.5">{new Date(e.transactionDate).toLocaleDateString()}</td>
                      <td className="py-2.5">
                        <Badge tone={e.transactionType === 'PAYMENT' ? 'green' : 'amber'}>
                          {e.transactionType}
                        </Badge>
                      </td>
                      <td className={`py-2.5 font-mono font-bold ${e.transactionType === 'PAYMENT' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {e.transactionType === 'PAYMENT' ? '-' : '+'} PKR {e.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 font-mono font-bold">PKR {e.outstandingBalanceAfter.toLocaleString()}</td>
                      <td className="py-2.5 text-ink-400">{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: RECORD CUSTOMER PAYMENT                                    */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment: ${selectedCustomerForPayment?.customerName}`}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Current Outstanding Balance: <strong className="font-mono">PKR {selectedCustomerForPayment?.currentOutstanding.toLocaleString()}</strong>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Amount to Pay (PKR) *</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Check">Check</option>
              <option value="Card">Card</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Notes / Reference (Optional)</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Cheque #4928"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePaymentSubmit} disabled={paymentSubmitting || !paymentAmount}>
              {paymentSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 3: ADJUST CREDIT LIMIT                                        */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        title={`Adjust Credit Limit: ${targetEntityForLimit?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-400">
            Set the maximum credit ceiling. Customers and vendors cannot exceed this limit without explicit admin approval.
          </p>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">New Credit Limit (PKR) *</label>
            <input
              type="number"
              value={newCreditLimit}
              onChange={(e) => setNewCreditLimit(e.target.value)}
              placeholder="e.g. 500000"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setLimitModalOpen(false)}>Cancel</Button>
            <Button onClick={handleLimitSubmit} disabled={limitSubmitting || newCreditLimit === ''}>
              {limitSubmitting ? 'Updating...' : 'Save New Limit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 4: NEW CREDIT SALE                                            */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        title="Record New Credit Sale"
      >
        <div className="space-y-4">
          {saleError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              <ShieldAlert className="inline h-4 w-4 mr-1" />
              {saleError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Customer *</label>
            <select
              value={saleCustomerId}
              onChange={(e) => setSaleCustomerId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            >
              <option value="">Select customer...</option>
              {allAvailableCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — Available: PKR {c.availableCredit.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {saleCustomerId && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs dark:border-brand-800/50 dark:bg-brand-950/20 flex items-center justify-between">
              <span className="text-brand-900 dark:text-brand-200 font-medium">Customer Available Credit:</span>
              <span className="font-mono font-bold text-brand-700 dark:text-brand-300 text-sm">
                PKR {(allAvailableCustomers.find((c) => c.id === saleCustomerId)?.availableCredit ?? 500000).toLocaleString()}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Total Sale Amount (PKR) *</label>
            <input
              type="number"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value)}
              placeholder="e.g. 150000"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Cash Payment Received Today (Down Payment)</label>
            <input
              type="number"
              value={saleDownPayment}
              onChange={(e) => setSaleDownPayment(e.target.value)}
              placeholder="0 (or partial payment to reduce credit needed)"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
            {saleAmount && (
              <p className="mt-1 text-xs text-ink-500">
                Credit Given: <strong>PKR {Math.max(0, Number(saleAmount) - Number(saleDownPayment || 0)).toLocaleString()}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Linked Order / Invoice # (Optional)</label>
            <input
              type="text"
              value={saleInvoiceRef}
              onChange={(e) => setSaleInvoiceRef(e.target.value)}
              placeholder="e.g. ORD-10023 or INV-2026-001"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Sale Notes</label>
            <input
              type="text"
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              placeholder="e.g. 3 boxes of electronics"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSaleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreditSaleSubmit} disabled={saleSubmitting || !saleCustomerId || !saleAmount}>
              {saleSubmitting ? 'Processing...' : 'Complete Credit Sale'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 5: VENDOR CREDIT LEDGER                                       */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={vLedgerModalOpen}
        onClose={() => setVLedgerModalOpen(false)}
        title={`Vendor Ledger: ${selectedVendorForLedger?.vendorName}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-xs dark:bg-ink-800">
            <div>
              <span className="text-ink-400">Limit:</span>
              <p className="font-bold">PKR {selectedVendorForLedger?.creditLimit.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-ink-400">Owing:</span>
              <p className="font-bold text-rose-600">PKR {selectedVendorForLedger?.currentOutstanding.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-ink-400">Available:</span>
              <p className="font-bold text-emerald-600">PKR {selectedVendorForLedger?.availableCredit.toLocaleString()}</p>
            </div>
          </div>

          {vendorLedgerEntries.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-400">No transaction entries found for this vendor.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-ink-900 border-b border-ink-100 font-semibold text-ink-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Balance Owing</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {vendorLedgerEntries.map((e) => (
                    <tr key={e.ledgerId}>
                      <td className="py-2">{new Date(e.transactionDate).toLocaleDateString()}</td>
                      <td className="py-2">
                        <Badge tone={e.transactionType === 'PAYMENT' ? 'green' : 'amber'}>
                          {e.transactionType}
                        </Badge>
                      </td>
                      <td className="py-2 font-mono font-bold">PKR {e.amount.toLocaleString()}</td>
                      <td className="py-2 font-mono font-bold text-rose-600">PKR {e.outstandingBalanceAfter.toLocaleString()}</td>
                      <td className="py-2 text-ink-400">{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 6: PAY VENDOR                                                 */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={vPaymentModalOpen}
        onClose={() => setVPaymentModalOpen(false)}
        title={`Record Payment to Vendor: ${selectedVendorForPayment?.vendorName}`}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
            Total Owing to Vendor: <strong className="font-mono">PKR {selectedVendorForPayment?.currentOutstanding.toLocaleString()}</strong>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Amount to Pay (PKR) *</label>
            <input
              type="number"
              value={vPaymentAmount}
              onChange={(e) => setVPaymentAmount(e.target.value)}
              placeholder="e.g. 100000"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Notes / Reference</label>
            <input
              type="text"
              value={vPaymentNotes}
              onChange={(e) => setVPaymentNotes(e.target.value)}
              placeholder="e.g. Bank transfer ref #10294"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setVPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleVendorPaymentSubmit} disabled={vPaymentSubmitting || !vPaymentAmount}>
              {vPaymentSubmitting ? 'Recording...' : 'Record Vendor Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 7: NEW VENDOR CREDIT PURCHASE                                 */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={vPurchaseModalOpen}
        onClose={() => setVPurchaseModalOpen(false)}
        title="Record Vendor Credit Purchase"
      >
        <div className="space-y-4">
          {vPurchaseError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              <ShieldAlert className="inline h-4 w-4 mr-1" />
              {vPurchaseError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Vendor *</label>
            <select
              value={vPurchaseVendorId}
              onChange={(e) => setVPurchaseVendorId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            >
              <option value="">Select vendor...</option>
              {vendorReport.vendors.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>
                  {v.vendorName} (Available Limit: PKR {v.availableCredit.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Purchase Amount (PKR) *</label>
            <input
              type="number"
              value={vPurchaseAmount}
              onChange={(e) => setVPurchaseAmount(e.target.value)}
              placeholder="e.g. 300000"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Immediate Payment Paid Today (Down Payment)</label>
            <input
              type="number"
              value={vPurchaseDownPayment}
              onChange={(e) => setVPurchaseDownPayment(e.target.value)}
              placeholder="0"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-xs dark:bg-ink-800">
            <input
              type="checkbox"
              id="vOverride"
              checked={vAllowOverride}
              onChange={(e) => setVAllowOverride(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="vOverride" className="text-ink-700 dark:text-ink-200">
              Admin Override (Allow purchase even if vendor credit limit is exceeded)
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Notes</label>
            <input
              type="text"
              value={vPurchaseNotes}
              onChange={(e) => setVPurchaseNotes(e.target.value)}
              placeholder="e.g. Invoice #PO-9823"
              className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setVPurchaseModalOpen(false)}>Cancel</Button>
            <Button onClick={handleVendorPurchaseSubmit} disabled={vPurchaseSubmitting || !vPurchaseVendorId || !vPurchaseAmount}>
              {vPurchaseSubmitting ? 'Recording...' : 'Record Purchase'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
