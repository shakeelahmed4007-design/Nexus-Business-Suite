import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, Receipt, X, CreditCard, Banknote, Loader2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { useAuth } from '@/shared/context/AuthContext';
import { getOwnerAdminEmail } from '@/shared/lib/adminStore';
import { productCategories, type Product } from '@/modules/Sales/products';
import { fetchProductsApi, posCheckoutApi } from '@/modules/Sales/salesApiService';
import { clsx } from 'clsx';

type CartItem = { product: Product; qty: number };

export function PosPage() {
  const { user, profile } = useAuth();
  const ownerAdminEmail = getOwnerAdminEmail(user?.email, profile?.role);
  const { hasAccess } = useDataAccess('pos');

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const data = await fetchProductsApi(ownerAdminEmail);
    setProductsList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [ownerAdminEmail]);

  const displayProducts = hasAccess ? productsList : [];
  const displayCart = hasAccess ? cart : [];

  const filtered = displayProducts.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const subtotal = displayCart.reduce((a, c) => a + c.product.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) return prev.map((c) => (c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    );
  }

  const handleCheckoutComplete = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);

    const result = await posCheckoutApi({
      shop_id: ownerAdminEmail,
      customer_id: 'Walk-in Customer',
      items: cart.map((c) => ({
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.qty,
        unit_price: c.product.price,
        tax_percentage: 18,
      })),
      payment_method: 'Cash',
      discount_amount: 0,
    });

    setCheckoutLoading(false);

    if (result.success) {
      alert('Sale completed successfully! Transaction saved to Supabase database.');
      setCart([]);
      setReceiptOpen(false);
      loadProducts();
    } else {
      alert(`Checkout notice: ${result.error || 'Saved transaction locally'}`);
      setCart([]);
      setReceiptOpen(false);
    }
  };

  const scrollToCart = () => {
    document.getElementById('pos-cart-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-16 lg:pb-0">
      <PageHeader title="Point of Sale" subtitle="Quick checkout connected directly to Supabase POS engine." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Product grid */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm dark:border-ink-700 dark:bg-ink-900"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin no-scrollbar touch-scrolling pb-1">
              {productCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    'shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                    category === c
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 text-ink-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading real-time products from Supabase...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => addToCart(p)}
                  className="card-base group p-3 sm:p-4 text-left"
                >
                  <div className="mb-2 sm:mb-3 flex h-14 sm:h-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-50 to-ink-100 text-2xl sm:text-3xl dark:from-ink-800 dark:to-ink-800/50">
                    {p.emoji && (p.emoji.startsWith('http') || p.emoji.startsWith('data:') || p.emoji.startsWith('blob:')) ? (
                      <img src={p.emoji} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      p.emoji || '📦'
                    )}
                  </div>
                  <p className="truncate text-xs font-semibold text-ink-900 dark:text-ink-50">{p.name}</p>
                  <p className="text-[10px] text-ink-400">{p.category}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400">PKR {p.price.toLocaleString()}</span>
                    <span className={clsx('text-[10px]', p.stock < 15 ? 'text-rose-500' : 'text-ink-400')}>{p.stock} left</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div id="pos-cart-panel">
          <Card className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col">
            <div className="flex items-center justify-between border-b border-ink-200 p-4 dark:border-ink-800">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-50">
                <ShoppingCart className="h-4 w-4 text-brand-500" /> Cart ({cart.length})
              </span>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-rose-500 hover:underline">Clear all</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-ink-400">
                  <ShoppingCart className="mb-2 h-10 w-10 opacity-40" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  <AnimatePresence>
                    {cart.map((item) => (
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800"
                      >
                        <span className="text-2xl">{item.product.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink-900 dark:text-ink-50">{item.product.name}</p>
                          <p className="text-xs text-brand-600 dark:text-brand-400">PKR {item.product.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQty(item.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 dark:bg-ink-800">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 dark:bg-ink-800">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-ink-200 p-4 dark:border-ink-800">
                <div className="space-y-1.5 text-sm">
                  <Row label="Subtotal" value={`PKR ${subtotal.toLocaleString()}`} />
                  <Row label="Tax (18%)" value={`PKR ${tax.toLocaleString()}`} />
                  <div className="my-2 border-t border-dashed border-ink-200 dark:border-ink-700" />
                  <Row label="Total" value={`PKR ${total.toLocaleString()}`} bold />
                </div>
                <Button className="mt-4 w-full" onClick={() => setReceiptOpen(true)}>
                  <CreditCard className="h-4 w-4" /> Checkout
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Floating mobile cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-2xl bg-brand-600 p-3 text-white shadow-2xl backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-xs font-bold">
              {cart.reduce((a, c) => a + c.qty, 0)}
            </div>
            <div>
              <p className="text-xs font-bold">PKR {total.toLocaleString()}</p>
              <p className="text-[10px] text-brand-100">{cart.length} unique items</p>
            </div>
          </div>
          <button
            onClick={scrollToCart}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm"
          >
            View Cart <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onComplete={handleCheckoutComplete}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        total={total}
        loading={checkoutLoading}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx(bold ? 'font-bold text-ink-900 dark:text-ink-50' : 'text-ink-500')}>{label}</span>
      <span className={clsx(bold ? 'font-bold text-brand-600 dark:text-brand-400' : 'text-ink-700 dark:text-ink-200')}>{value}</span>
    </div>
  );
}

function ReceiptModal({
  open,
  onClose,
  onComplete,
  cart,
  subtotal,
  tax,
  total,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  loading: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-card-lg dark:bg-ink-900"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                <span className="font-semibold">Receipt</span>
              </div>
              <button onClick={onClose}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="mb-4 text-center">
                <p className="text-sm font-bold text-ink-900 dark:text-ink-50">Nexus Business Suite</p>
                <p className="text-xs text-ink-400">Receipt #R-{Date.now().toString().slice(-6)}</p>
                <p className="text-xs text-ink-400">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="mb-4 border-t border-dashed border-ink-200 pt-4 dark:border-ink-700 max-h-48 overflow-y-auto scrollbar-thin">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between py-1 text-xs">
                    <span className="text-ink-600 dark:text-ink-300">{item.product.name} x{item.qty}</span>
                    <span className="font-medium text-ink-800 dark:text-ink-100">PKR {(item.product.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-dashed border-ink-200 pt-3 text-xs dark:border-ink-700">
                <Row label="Subtotal" value={`PKR ${subtotal.toLocaleString()}`} />
                <Row label="Tax (18%)" value={`PKR ${tax.toLocaleString()}`} />
                <div className="my-2 border-t border-ink-200 dark:border-ink-700" />
                <Row label="Total" value={`PKR ${total.toLocaleString()}`} bold />
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Close</Button>
                <Button className="flex-1" onClick={onComplete} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                  {loading ? 'Processing...' : 'Complete'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
