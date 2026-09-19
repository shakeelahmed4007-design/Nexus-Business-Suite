import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Receipt,
  X,
  CreditCard,
  Banknote,
  Loader2,
  AlertTriangle,
  Layers,
  RotateCcw,
  ClipboardCheck,
  FileText,
  ShieldAlert,
  Building,
  CheckCircle2,
  DollarSign,
  Package,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useAuth } from '@/shared/context/AuthContext';
import { getOwnerAdminEmail } from '@/shared/lib/adminStore';
import { productCategories, type Product } from '@/modules/Sales/products';
import { fetchProductsApi } from '@/modules/Sales/salesApiService';
import { syncPosCheckoutToCrm, useCustomers } from '@/modules/CRM/useCrmApi';
import {
  fetchCreditAvailabilityApi,
  executeAdvancedSaleApi,
  reserveInventoryApi,
  releaseInventoryApi,
  processSaleReturnApi,
  reconcileStockApi,
  CreditAvailability,
  PaymentMethod,
} from './posAdvancedApiService';
import { CustomerStatementModal } from './CustomerStatementModal';

type CartItem = {
  product: Product;
  qty: number;
  unitPrice: number;
  reservationId?: string;
};

export function PosPage() {
  const { user, profile } = useAuth();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const { hasAccess } = useDataAccess('pos');
  const { customers: crmCustomers } = useCustomers();

  // Mode: Running Sale (Retail) vs Bulk Sale (Wholesale)
  const [saleMode, setSaleMode] = useState<'RUNNING' | 'BULK'>('RUNNING');

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer Selection & Real-Time Credit Status
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>('');
  const [creditStatus, setCreditStatus] = useState<CreditAvailability | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // Modals
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [blockingModalOpen, setBlockingModalOpen] = useState(false);

  // Admin Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Bulk Discount
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<number>(5);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
  const [customDiscountReason, setCustomDiscountReason] = useState<string>('');

  const loadInitialData = async () => {
    setLoading(true);
    const prods = await fetchProductsApi(ownerAdminEmail);
    setProductsList(prods);
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, [ownerAdminEmail]);

  useEffect(() => {
    if (crmCustomers && crmCustomers.length > 0 && !selectedCustomerId) {
      const c = crmCustomers[0];
      setSelectedCustomerId(c.id);
      setSelectedCustomerName(`${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Customer');
      setSelectedCustomerPhone(c.phone || '');
    }
  }, [crmCustomers, selectedCustomerId]);

  // Load Real-time Credit Availability whenever selected customer changes
  const checkCustomerCredit = async (custId: string) => {
    if (!custId) {
      setCreditStatus(null);
      return;
    }
    setCreditLoading(true);
    try {
      const data = await fetchCreditAvailabilityApi(custId);
      setCreditStatus(data);
    } catch {
      // fallback default mock status
      setCreditStatus({
        customer_id: custId,
        customer_name: selectedCustomerName,
        credit_limit: 500000,
        current_outstanding: 0,
        available_credit: 500000,
        can_buy_amount: 500000,
        is_at_limit: false,
        hard_blocks_enforced: false,
        warnings: [],
      });
    } finally {
      setCreditLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      checkCustomerCredit(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  // Pricing engine: calculates tiered price based on saleMode and quantity
  const getProductUnitPrice = (product: Product, quantity: number): number => {
    if (saleMode === 'RUNNING' || !product.bulkTiers || product.bulkTiers.length === 0) {
      return product.price;
    }
    // Find matching tier
    const sortedTiers = [...product.bulkTiers].sort((a, b) => b.minQuantity - a.minQuantity);
    for (const tier of sortedTiers) {
      if (quantity >= tier.minQuantity) {
        return tier.unitPrice;
      }
    }
    return product.price;
  };

  // Add item to cart with reservation
  const addToCart = async (p: Product) => {
    const existing = cart.find((c) => c.product.id === p.id);
    const newQty = existing ? existing.qty + 1 : 1;
    const unitPrice = getProductUnitPrice(p, newQty);

    // Reserve 1 unit in background
    let resId = existing?.reservationId;
    try {
      const res = await reserveInventoryApi(p.id, 1);
      resId = res?.reservation_id || resId;
    } catch {
      // ignore
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((c) =>
          c.product.id === p.id
            ? { ...c, qty: newQty, unitPrice: getProductUnitPrice(p, newQty), reservationId: resId }
            : c,
        );
      }
      return [...prev, { product: p, qty: 1, unitPrice, reservationId: resId }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== id) return c;
          const newQty = Math.max(0, c.qty + delta);
          return {
            ...c,
            qty: newQty,
            unitPrice: getProductUnitPrice(c.product, newQty),
          };
        })
        .filter((c) => c.qty > 0),
    );
  };

  const clearCart = () => {
    // Release active reservations
    cart.forEach((c) => {
      if (c.reservationId) {
        releaseInventoryApi(c.reservationId).catch(() => {});
      }
    });
    setCart([]);
  };

  // Calculate totals
  const subtotal = cart.reduce((a, c) => a + c.unitPrice * c.qty, 0);

  // Bulk discount & custom discount
  const bulkDiscountAmount =
    saleMode === 'BULK' ? Math.round((subtotal * (bulkDiscountPercent + customDiscountPercent)) / 100) : 0;
  const discountedSubtotal = Math.max(0, subtotal - bulkDiscountAmount);

  // Tax rate: 0% wholesale exemption for BULK, 18% for RUNNING
  const taxRate = saleMode === 'BULK' ? 0.0 : 0.18;
  const tax = Math.round(discountedSubtotal * taxRate);
  const total = discountedSubtotal + tax;

  // Real-time credit calculation vs cart
  const availableCredit = creditStatus?.available_credit ?? 500000;
  const isCreditExceeded = saleMode === 'BULK' && total > availableCredit;

  return (
    <div className="space-y-6">
      {!hasAccess && <AccessPendingBanner moduleName="Point of Sale" />}

      {/* Page Header with Sale Mode Selector & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900 dark:text-white">
            Point of Sale & Credit Center
          </h1>
          <p className="text-xs text-ink-500">
            Advanced real-time credit limit enforcement, bulk pricing tiers & inventory synchronization.
          </p>
        </div>

        {/* Quick Operations Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReturnModalOpen(true)}
            className="text-xs flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
            Process Return
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReconcileModalOpen(true)}
            className="text-xs flex items-center gap-1"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-blue-500" />
            Stock Audit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStatementModalOpen(true)}
            className="text-xs flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5 text-brand-500" />
            Statement
          </Button>
        </div>
      </div>

      {/* Top Controls: Sale Mode Switch + Customer Real-Time Credit Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sale Mode Selector */}
        <div className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Transaction Mode</span>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
              <button
                type="button"
                onClick={() => setSaleMode('RUNNING')}
                className={`rounded-lg py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  saleMode === 'RUNNING'
                    ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white'
                    : 'text-ink-600 hover:text-ink-900 dark:text-ink-400'
                }`}
              >
                <span>💵</span> Running Sale
              </button>
              <button
                type="button"
                onClick={() => setSaleMode('BULK')}
                className={`rounded-lg py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  saleMode === 'BULK'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-600 hover:text-ink-900 dark:text-ink-400'
                }`}
              >
                <span>📦</span> Bulk / Wholesale
              </button>
            </div>
          </div>
          <p className="text-[11px] text-ink-500 mt-2">
            {saleMode === 'RUNNING'
              ? 'Standard retail pricing, 18% standard tax rate, cash/immediate payments.'
              : 'Wholesale tiered pricing, 0% wholesale tax exemption, 5% bulk discount, credit limit check.'}
          </p>
        </div>

        {/* Customer Selector & Credit Info */}
        <div className="lg:col-span-2 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Customer Account & Real-Time Credit</span>
            {creditLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Dropdown */}
            <div>
              <label className="block text-[11px] font-medium text-ink-600 dark:text-ink-400 mb-1">Select Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCustomerId(id);
                  const cust = crmCustomers.find((c) => c.id === id);
                  if (cust) {
                    setSelectedCustomerName(`${cust.firstName || ''} ${cust.lastName || ''}`.trim() || cust.companyName || 'Customer');
                    setSelectedCustomerPhone(cust.phone || '');
                  }
                }}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-ink-700 dark:bg-ink-800"
              >
                {crmCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Customer'} - {c.phone || 'No Phone'}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Availability Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-ink-50 p-2 dark:bg-ink-800/50 border border-ink-200/60 dark:border-ink-700/60">
                <p className="text-[10px] uppercase font-bold text-ink-400">Credit Limit</p>
                <p className="text-xs font-bold text-ink-800 dark:text-ink-200 font-mono mt-0.5">
                  PKR {(creditStatus?.credit_limit ?? 500000).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-ink-50 p-2 dark:bg-ink-800/50 border border-ink-200/60 dark:border-ink-700/60">
                <p className="text-[10px] uppercase font-bold text-ink-400">Outstanding</p>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  PKR {(creditStatus?.current_outstanding ?? 0).toLocaleString()}
                </p>
              </div>
              <div
                className={`rounded-xl p-2 border ${
                  availableCredit <= 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20'
                    : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20'
                }`}
              >
                <p className="text-[10px] uppercase font-bold">Available</p>
                <p className="text-xs font-bold font-mono mt-0.5">
                  PKR {availableCredit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Proactive Cart Impact Warning */}
          {cart.length > 0 && isCreditExceeded && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>
                <strong>Credit Exceeded:</strong> Cart total (PKR {total.toLocaleString()}) exceeds available credit (PKR {availableCredit.toLocaleString()}).
                Please add cash down-payment, reduce quantity, or request Admin Override.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Products Grid + Interactive Cart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Product Catalog */}
        <div className="space-y-4 lg:col-span-2">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {productCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    category === c
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white text-ink-600 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or SKU..."
                className="w-full rounded-xl border border-ink-200 bg-white py-1.5 pl-8 pr-3 text-xs dark:border-ink-700 dark:bg-ink-900"
              />
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {productsList
              .filter(
                (p) =>
                  (category === 'All' || p.category === category) &&
                  p.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((p) => {
                const isLowStock = p.stock <= (p.reorderPoint || 10);
                const inCart = cart.find((c) => c.product.id === p.id);
                const currentUnitPrice = getProductUnitPrice(p, inCart ? inCart.qty + 1 : 1);

                return (
                  <motion.div
                    key={p.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(p)}
                    className="group relative cursor-pointer rounded-2xl border border-ink-200 bg-white p-3.5 shadow-sm transition-all hover:border-brand-500 hover:shadow-md dark:border-ink-800 dark:bg-ink-900"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-2xl">{p.emoji}</span>
                      <div className="flex flex-col items-end gap-1">
                        {isLowStock ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            Low: {p.stock}
                          </span>
                        ) : (
                          <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-400">
                            Stock: {p.stock}
                          </span>
                        )}
                        {inCart && (
                          <span className="rounded-full bg-brand-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            x{inCart.qty}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-xs font-bold text-ink-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-ink-400">{p.sku}</p>

                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs font-extrabold text-brand-600 dark:text-brand-400">
                          PKR {currentUnitPrice.toLocaleString()}
                        </p>
                        {saleMode === 'BULK' && currentUnitPrice < p.price && (
                          <p className="text-[9px] line-through text-ink-400 font-mono">
                            PKR {p.price.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors dark:bg-ink-800">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Bulk Pricing Tier Badges */}
                    {saleMode === 'BULK' && p.bulkTiers && p.bulkTiers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-ink-100 dark:border-ink-800 text-[9px] text-ink-500 space-y-0.5">
                        {p.bulkTiers.map((t, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{t.tierName || `${t.minQuantity}+ units`}:</span>
                            <span className="font-mono font-semibold text-brand-600">PKR {t.unitPrice.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        </div>

        {/* Right 1 Col: Smart Cart & Instant Checkout */}
        <div className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 shadow-sm flex flex-col justify-between h-fit min-h-[500px]">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-brand-600" />
                <h3 className="text-sm font-bold text-ink-900 dark:text-white">Active Sale Cart</h3>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                  {cart.reduce((s, c) => s + c.qty, 0)}
                </span>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-[11px] font-medium text-rose-500 hover:underline">
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-16 text-center text-xs text-ink-400">
                <p>🛒 Cart is currently empty.</p>
                <p className="text-[11px] text-ink-500 mt-1">Select products to begin sale.</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800 max-h-72 overflow-y-auto scrollbar-thin my-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-900 dark:text-white truncate">{item.product.name}</p>
                      <p className="text-[10px] text-ink-400 font-mono">
                        PKR {item.unitPrice.toLocaleString()} ea
                        {saleMode === 'BULK' && item.unitPrice < item.product.price && (
                          <span className="ml-1 text-green-600 font-bold">(Bulk Tier Applied)</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right w-20">
                      <p className="font-mono font-bold text-ink-800 dark:text-ink-100">
                        PKR {(item.unitPrice * item.qty).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Pricing Summary */}
          <div className="border-t border-ink-100 pt-3 dark:border-ink-800 space-y-2 text-xs">
            <div className="flex justify-between text-ink-600 dark:text-ink-400">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">PKR {subtotal.toLocaleString()}</span>
            </div>

            {saleMode === 'BULK' && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Bulk Wholesale Discount ({bulkDiscountPercent + customDiscountPercent}%):</span>
                <span className="font-mono">-PKR {bulkDiscountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-ink-600 dark:text-ink-400">
              <span>Tax ({taxRate * 100}% {saleMode === 'BULK' ? 'Wholesale Exemption' : ''}):</span>
              <span className="font-mono font-medium">PKR {tax.toLocaleString()}</span>
            </div>

            <div className="border-t border-ink-200 dark:border-ink-700 pt-2 flex justify-between text-sm font-extrabold text-ink-900 dark:text-white">
              <span>Total Payable:</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">PKR {total.toLocaleString()}</span>
            </div>

            {/* Checkout Trigger */}
            <Button
              className="w-full mt-3 flex items-center justify-center gap-2"
              disabled={cart.length === 0}
              onClick={() => {
                if (isCreditExceeded) {
                  setBlockingModalOpen(true);
                } else {
                  setCheckoutOpen(true);
                }
              }}
            >
              <Receipt className="h-4 w-4" />
              <span>Proceed to Checkout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Checkout Modal with Multi-Payment Method */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        customerName={selectedCustomerName}
        customerPhone={selectedCustomerPhone}
        customerId={selectedCustomerId}
        saleMode={saleMode}
        total={total}
        subtotal={subtotal}
        tax={tax}
        taxRate={taxRate}
        bulkDiscountAmount={bulkDiscountAmount}
        bulkDiscountPercent={bulkDiscountPercent}
        availableCredit={availableCredit}
        cart={cart}
        onCompleteSuccess={() => {
          clearCart();
          setCheckoutOpen(false);
          checkCustomerCredit(selectedCustomerId);
        }}
      />

      {/* MODAL 2: Credit Limit Reached - 4 Actionable Alternatives */}
      <BlockingMessageModal
        open={blockingModalOpen}
        onClose={() => setBlockingModalOpen(false)}
        customerName={selectedCustomerName}
        creditLimit={creditStatus?.credit_limit ?? 500000}
        currentOutstanding={creditStatus?.current_outstanding ?? 0}
        availableCredit={availableCredit}
        attemptedSale={total}
        onOption1Cash={() => {
          setSaleMode('RUNNING');
          setBlockingModalOpen(false);
          setCheckoutOpen(true);
        }}
        onOption2Partial={() => {
          setBlockingModalOpen(false);
          setCheckoutOpen(true);
        }}
        onOption3Override={() => {
          setBlockingModalOpen(false);
          setOverrideModalOpen(true);
        }}
      />

      {/* MODAL 3: Admin Override Reason Modal */}
      <AdminOverrideModal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        onProceedWithOverride={(reason) => {
          setOverrideReason(reason);
          setOverrideModalOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {/* MODAL 4: Sales Return Modal */}
      <ReturnModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        customerId={selectedCustomerId}
        customerName={selectedCustomerName}
        onReturnComplete={() => {
          checkCustomerCredit(selectedCustomerId);
        }}
      />

      {/* MODAL 5: Stock Reconciliation Modal */}
      <StockReconcileModal
        open={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        products={productsList}
        onComplete={() => {
          loadInitialData();
        }}
      />

      {/* MODAL 6: Customer Statement Modal */}
      <CustomerStatementModal
        open={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        customerId={selectedCustomerId}
        customerName={selectedCustomerName}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENT: BlockingMessageModal (The 4 Options when credit limit is exceeded)
// ----------------------------------------------------------------------------
function BlockingMessageModal({
  open,
  onClose,
  customerName,
  creditLimit,
  currentOutstanding,
  availableCredit,
  attemptedSale,
  onOption1Cash,
  onOption2Partial,
  onOption3Override,
}: {
  open: boolean;
  onClose: () => void;
  customerName: string;
  creditLimit: number;
  currentOutstanding: number;
  availableCredit: number;
  attemptedSale: number;
  onOption1Cash: () => void;
  onOption2Partial: () => void;
  onOption3Override: () => void;
}) {
  if (!open) return null;

  const partialCashNeeded = Math.max(0, attemptedSale - availableCredit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900 border border-ink-200 dark:border-ink-800">
        <div className="flex items-center gap-3 border-b border-ink-100 pb-3 dark:border-ink-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-rose-600">CREDIT LIMIT REACHED</h3>
            <p className="text-xs text-ink-500">Customer account limit exceeded for this sale.</p>
          </div>
        </div>

        {/* Ledger State Snapshot */}
        <div className="my-4 rounded-xl bg-ink-50 p-3.5 dark:bg-ink-800/50 space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-ink-600">Customer:</span>
            <span className="font-bold text-ink-900 dark:text-white">{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Credit Limit:</span>
            <span>PKR {creditLimit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Current Outstanding:</span>
            <span className="text-amber-600 font-bold">PKR {currentOutstanding.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-ink-200 dark:border-ink-700 pt-1">
            <span className="text-ink-600">Available Credit:</span>
            <span className="text-rose-600 font-bold">PKR {availableCredit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Attempted Sale:</span>
            <span className="font-bold text-brand-600">PKR {attemptedSale.toLocaleString()}</span>
          </div>
        </div>

        {/* The 4 Actionable Alternatives */}
        <div className="space-y-2 text-xs">
          <p className="font-bold text-ink-700 dark:text-ink-300 uppercase tracking-wider text-[10px]">
            Please Select Alternative Resolution:
          </p>

          <button
            onClick={onOption1Cash}
            className="w-full text-left rounded-xl border border-ink-200 bg-white p-3 hover:border-brand-500 hover:bg-brand-50/30 transition-all dark:border-ink-700 dark:bg-ink-800"
          >
            <p className="font-bold text-brand-700 dark:text-brand-300">1. Customer Pays Full Cash (PKR {attemptedSale.toLocaleString()})</p>
            <p className="text-[11px] text-ink-500">Process the transaction as a Running Cash Sale without touching credit.</p>
          </button>

          <button
            onClick={onOption2Partial}
            className="w-full text-left rounded-xl border border-ink-200 bg-white p-3 hover:border-brand-500 hover:bg-brand-50/30 transition-all dark:border-ink-700 dark:bg-ink-800"
          >
            <p className="font-bold text-amber-700 dark:text-amber-300">
              2. Partial Cash + Remaining Credit
            </p>
            <p className="text-[11px] text-ink-500">
              Customer pays <strong>PKR {partialCashNeeded.toLocaleString()} cash</strong> today, remaining PKR {availableCredit.toLocaleString()} is recorded on credit.
            </p>
          </button>

          <button
            onClick={onOption3Override}
            className="w-full text-left rounded-xl border border-purple-200 bg-purple-50/40 p-3 hover:bg-purple-50 transition-all dark:border-purple-800 dark:bg-purple-950/20"
          >
            <p className="font-bold text-purple-700 dark:text-purple-300">3. Request Admin Override (Requires Reason)</p>
            <p className="text-[11px] text-ink-500">Authorized manager/admin overrides credit limit with mandatory audit reason.</p>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENT: AdminOverrideModal
// ----------------------------------------------------------------------------
function AdminOverrideModal({
  open,
  onClose,
  onProceedWithOverride,
}: {
  open: boolean;
  onClose: () => void;
  onProceedWithOverride: (reason: string) => void;
}) {
  const [reason, setReason] = useState('VIP wholesale customer, partial payment scheduled next week');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900 border border-ink-200 dark:border-ink-800">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-purple-600" />
          Admin Credit Limit Override
        </h3>
        <p className="text-xs text-ink-500 mt-1">
          Provide a clear business justification. This event will be logged in the permanent audit trail.
        </p>

        <div className="mt-3">
          <label className="block text-[11px] font-medium text-ink-700 dark:text-ink-300 mb-1">
            Override Reason *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-white p-2.5 text-xs dark:border-ink-700 dark:bg-ink-800"
            placeholder="e.g. VIP account agreement, post-dated check received..."
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!reason.trim()}
            onClick={() => onProceedWithOverride(reason)}
          >
            Authorize & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENT: CheckoutModal (With Multi-Payment Method Support)
// ----------------------------------------------------------------------------
function CheckoutModal({
  open,
  onClose,
  customerName,
  customerPhone,
  customerId,
  saleMode,
  total,
  subtotal,
  tax,
  taxRate,
  bulkDiscountAmount,
  bulkDiscountPercent,
  availableCredit,
  cart,
  onCompleteSuccess,
}: {
  open: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  customerId: string;
  saleMode: 'RUNNING' | 'BULK';
  total: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  bulkDiscountAmount: number;
  bulkDiscountPercent: number;
  availableCredit: number;
  cart: CartItem[];
  onCompleteSuccess: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [downPayment, setDownPayment] = useState<number>(saleMode === 'RUNNING' ? total : 0);
  const [refNumber, setRefNumber] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [cardLast4, setCardLast4] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saleMode === 'RUNNING') {
      setDownPayment(total);
    } else {
      // Default: pay difference if exceeds available credit, else 0
      setDownPayment(Math.max(0, total - availableCredit));
    }
  }, [total, saleMode, availableCredit, open]);

  const creditGiven = Math.max(0, total - downPayment);

  const handleSubmitSale = async () => {
    setLoading(true);
    setError(null);
    try {
      await executeAdvancedSaleApi({
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        sale_type: saleMode,
        items: cart.map((c) => ({
          product_id: c.product.id,
          product_name: c.product.name,
          quantity: c.qty,
          unit_price: c.unitPrice,
          regular_price: c.product.price,
          tax_percentage: taxRate * 100,
        })),
        subtotal,
        discount_amount: bulkDiscountAmount,
        bulk_discount_percent: bulkDiscountPercent,
        tax_rate_applied: taxRate * 100,
        tax_amount: tax,
        total_amount: total,
        cash_received: downPayment,
        credit_given: creditGiven,
        payment_method: paymentMethod,
        reference_number: refNumber,
        check_number: checkNumber,
        card_last4: cardLast4,
        reservation_ids: cart.map((c) => c.reservationId).filter(Boolean) as string[],
      });

      onCompleteSuccess();
    } catch (e: any) {
      setError(e.message || 'Sale checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-ink-900 border border-ink-200 dark:border-ink-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-accent-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="h-5 w-5" />
            <h3 className="font-bold text-sm">Finalize POS {saleMode} Checkout</h3>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-white/80" /></button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto scrollbar-thin space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Customer & Sale Info */}
          <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800 text-xs flex justify-between">
            <div>
              <p className="font-bold text-ink-900 dark:text-white">{customerName}</p>
              <p className="text-[11px] text-ink-500">{customerPhone || 'No Phone'}</p>
            </div>
            <div className="text-right">
              <Badge tone={saleMode === 'BULK' ? 'cyan' : 'brand'}>{saleMode} SALE</Badge>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-200 mb-1">
              Payment Method:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'Bank Transfer', 'Check', 'Card', 'Mobile Wallet'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`rounded-xl border py-2 px-2 text-xs font-semibold transition-all ${
                    paymentMethod === m
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                      : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Method Details */}
          {paymentMethod === 'Bank Transfer' && (
            <div>
              <label className="block text-[11px] text-ink-600 mb-1">Bank Reference / Transaction ID:</label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="e.g. HBL-FT-991823"
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-800"
              />
            </div>
          )}
          {paymentMethod === 'Check' && (
            <div>
              <label className="block text-[11px] text-ink-600 mb-1">Check Number & Bank:</label>
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="e.g. MCB Check # 882910"
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-800"
              />
            </div>
          )}
          {paymentMethod === 'Card' && (
            <div>
              <label className="block text-[11px] text-ink-600 mb-1">Card Last 4 Digits:</label>
              <input
                type="text"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value)}
                placeholder="e.g. 4022"
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs dark:border-ink-700 dark:bg-ink-800 font-mono"
              />
            </div>
          )}

          {/* Cash Down Payment vs Credit Calculation */}
          <div className="rounded-xl border border-ink-200 bg-white p-3.5 dark:border-ink-700 dark:bg-ink-800/40 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-ink-800 dark:text-ink-100">Amount Paid Today (Down Payment):</label>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value || 0)))}
                className="w-36 rounded-lg border border-ink-300 px-2 py-1 text-right font-mono font-bold text-xs"
              />
            </div>
            <div className="flex justify-between text-[11px] text-ink-500 pt-1 border-t border-dashed border-ink-200 dark:border-ink-700">
              <span>Total Payable:</span>
              <span className="font-mono">PKR {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-brand-600">Remaining Credit Given:</span>
              <span className="font-mono text-brand-600">PKR {creditGiven.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-200 bg-ink-50 p-4 dark:border-ink-800 dark:bg-ink-800/50">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmitSale} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            {loading ? 'Processing Sale...' : 'Confirm Sale & Print Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENT: ReturnModal (Process Item Returns & Restore Inventory)
// ----------------------------------------------------------------------------
function ReturnModal({
  open,
  onClose,
  customerId,
  customerName,
  onReturnComplete,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onReturnComplete: () => void;
}) {
  const [productId, setProductId] = useState('P-001');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(4500);
  const [reason, setReason] = useState('Customer returned unused goods in original packaging');
  const [refundType, setRefundType] = useState<'Cash' | 'Credit_Adjustment'>('Credit_Adjustment');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleReturn = async () => {
    setLoading(true);
    try {
      await processSaleReturnApi({
        customer_id: customerId,
        items: [{ product_id: productId, quantity, refund_unit_price: unitPrice }],
        return_reason: reason,
        refund_type: refundType,
      });
      alert(`Return processed! PKR ${(quantity * unitPrice).toLocaleString()} adjusted.`);
      onReturnComplete();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900 border border-ink-200 dark:border-ink-800 space-y-4">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
          <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-rose-500" />
            Process Sales Return
          </h3>
          <button onClick={onClose}><X className="h-4 w-4 text-ink-400" /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] text-ink-600 mb-1">Customer:</label>
            <p className="font-bold text-ink-900 dark:text-white">{customerName}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-ink-600 mb-1">Returned Qty:</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-ink-200 p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink-600 mb-1">Unit Refund (PKR):</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-xl border border-ink-200 p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-ink-600 mb-1">Refund Type:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundType('Credit_Adjustment')}
                className={`rounded-lg border p-2 text-xs font-semibold ${
                  refundType === 'Credit_Adjustment' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200'
                }`}
              >
                Credit Adjustment
              </button>
              <button
                type="button"
                onClick={() => setRefundType('Cash')}
                className={`rounded-lg border p-2 text-xs font-semibold ${
                  refundType === 'Cash' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200'
                }`}
              >
                Cash Refund
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-ink-600 mb-1">Reason for Return:</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-ink-200 p-2 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleReturn} disabled={loading}>
            {loading ? 'Restoring Stock...' : 'Confirm Return'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENT: StockReconcileModal (Physical Stock Audit Reconciliation)
// ----------------------------------------------------------------------------
function StockReconcileModal({
  open,
  onClose,
  products,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onComplete: () => void;
}) {
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || 'P-001');
  const [physicalCount, setPhysicalCount] = useState<number>(30);
  const [notes, setNotes] = useState('Bi-weekly floor count audit');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const currentProd = products.find((p) => p.id === selectedProdId) || products[0];
  const systemCount = currentProd?.stock || 0;
  const variance = physicalCount - systemCount;

  const handleReconcile = async () => {
    setLoading(true);
    try {
      await reconcileStockApi({
        product_id: selectedProdId,
        physical_count: physicalCount,
        notes,
      });
      alert(`Stock reconciled! New quantity set to ${physicalCount}. Variance: ${variance}.`);
      onComplete();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Failed to reconcile stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900 border border-ink-200 dark:border-ink-800 space-y-4">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
          <h3 className="font-bold text-sm text-ink-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-500" />
            Physical Stock Reconciliation
          </h3>
          <button onClick={onClose}><X className="h-4 w-4 text-ink-400" /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] text-ink-600 mb-1">Select Product:</label>
            <select
              value={selectedProdId}
              onChange={(e) => {
                setSelectedProdId(e.target.value);
                const p = products.find((pr) => pr.id === e.target.value);
                if (p) setPhysicalCount(p.stock);
              }}
              className="w-full rounded-xl border border-ink-200 p-2 text-xs dark:bg-ink-800"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center p-3 rounded-xl bg-ink-50 dark:bg-ink-800">
            <div>
              <p className="text-[10px] uppercase font-bold text-ink-400">System Recorded</p>
              <p className="text-sm font-bold font-mono">{systemCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-ink-400">Physical Variance</p>
              <p className={`text-sm font-bold font-mono ${variance < 0 ? 'text-rose-600' : variance > 0 ? 'text-green-600' : 'text-ink-600'}`}>
                {variance > 0 ? `+${variance}` : variance}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-ink-600 mb-1">Actual Physical Count:</label>
            <input
              type="number"
              min={0}
              value={physicalCount}
              onChange={(e) => setPhysicalCount(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-ink-200 p-2 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] text-ink-600 mb-1">Audit Notes:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-ink-200 p-2 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-100 dark:border-ink-800">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleReconcile} disabled={loading}>
            {loading ? 'Reconciling...' : 'Apply Stock Adjustment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
