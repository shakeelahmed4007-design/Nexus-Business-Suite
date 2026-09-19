import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Send, Calendar, Download, CheckCircle2, Clock, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import {
  fetchCustomerStatementApi,
  sendCustomerStatementApi,
  CustomerStatement,
} from './posAdvancedApiService';

export function CustomerStatementModal({
  open,
  onClose,
  customerId,
  customerName,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
}) {
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatement = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerStatementApi(customerId, period);
      setStatement(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && customerId) {
      loadStatement();
      setSentSuccess(false);
    }
  }, [open, customerId, period]);

  const handleSendEmail = async () => {
    if (!statement?.statement_id) return;
    setSending(true);
    try {
      await sendCustomerStatementApi(statement.statement_id);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 4000);
    } catch (e: any) {
      alert(e.message || 'Failed to send statement email');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-ink-900 border border-ink-200 dark:border-ink-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-200 bg-gradient-to-r from-brand-600 to-accent-600 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Monthly Account Statement</h3>
                <p className="text-xs text-brand-100">
                  Customer: <span className="font-semibold text-white">{customerName || statement?.customer_name || 'Valued Client'}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-thin space-y-5">
            {/* Period Selector & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-ink-500" />
                <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">Statement Period:</span>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="rounded-lg border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-900 dark:border-ink-600 dark:bg-ink-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={sending || loading || !statement}
                  className="text-xs flex items-center gap-1.5"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : sentSuccess ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {sending ? 'Sending...' : sentSuccess ? 'Dispatched!' : 'Email Statement'}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex h-44 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
                {error}
              </div>
            ) : statement ? (
              <>
                {/* Statement Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-800/40">
                    <p className="text-[10px] uppercase font-bold text-ink-400">Opening Balance</p>
                    <p className="text-sm font-bold text-ink-800 dark:text-ink-100 font-mono mt-0.5">
                      PKR {statement.opening_balance.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-800/40">
                    <p className="text-[10px] uppercase font-bold text-ink-400">New Sales</p>
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400 font-mono mt-0.5">
                      +PKR {statement.total_sales.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-800/40">
                    <p className="text-[10px] uppercase font-bold text-ink-400">Total Payments</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 font-mono mt-0.5">
                      -PKR {statement.total_payments.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800/60 dark:bg-brand-950/20">
                    <p className="text-[10px] uppercase font-bold text-brand-700 dark:text-brand-300">Closing Balance</p>
                    <p className="text-base font-extrabold text-brand-700 dark:text-brand-300 font-mono mt-0.5">
                      PKR {statement.closing_balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Aging Breakdown */}
                <div className="rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-brand-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-200">
                      Overdue Aging Analysis
                    </h4>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-green-50 p-2.5 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
                      <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase">Current (0-30d)</p>
                      <p className="text-xs font-bold text-green-800 dark:text-green-200 font-mono mt-1">
                        PKR {statement.aging_summary.current.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">31 - 60 Days</p>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200 font-mono mt-1">
                        PKR {statement.aging_summary.days_31_60.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-2.5 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40">
                      <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">61 - 90 Days</p>
                      <p className="text-xs font-bold text-orange-800 dark:text-orange-200 font-mono mt-1">
                        PKR {statement.aging_summary.days_61_90.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-rose-50 p-2.5 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                      <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">90+ Days</p>
                      <p className="text-xs font-bold text-rose-800 dark:text-rose-200 font-mono mt-1">
                        PKR {statement.aging_summary.days_90_plus.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Period Transactions Chronological Table */}
                <div className="rounded-xl border border-ink-200 bg-white overflow-hidden dark:border-ink-800 dark:bg-ink-900">
                  <div className="bg-ink-50 px-4 py-2.5 dark:bg-ink-800 border-b border-ink-200 dark:border-ink-700">
                    <p className="text-xs font-bold text-ink-800 dark:text-ink-200">
                      Period Transactions ({statement.transactions.length})
                    </p>
                  </div>
                  {statement.transactions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-400">
                      No recorded sales or payments in this period.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto scrollbar-thin divide-y divide-ink-100 dark:divide-ink-800">
                      {statement.transactions.map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-2 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                tone={tx.type === 'CREDIT_SALE' ? 'amber' : 'green'}
                              >
                                {tx.type === 'CREDIT_SALE' ? 'Sale' : 'Payment'}
                              </Badge>
                              <span className="font-mono text-ink-500">{tx.date}</span>
                            </div>
                            {tx.notes && <p className="text-[11px] text-ink-400 truncate max-w-xs">{tx.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-mono font-bold ${
                                tx.type === 'CREDIT_SALE' ? 'text-amber-600' : 'text-green-600'
                              }`}
                            >
                              {tx.type === 'CREDIT_SALE' ? '+' : '-'}PKR {tx.amount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-ink-400 font-mono">
                              Bal: PKR {tx.balance_after.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remittance / Payment Instructions */}
                {statement.payment_instructions && (
                  <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/70 p-3.5 dark:border-ink-700 dark:bg-ink-950/30 text-xs">
                    <p className="font-bold text-ink-800 dark:text-ink-100 mb-1">🏦 Remittance & Settlement Instructions:</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-600 dark:text-ink-400">
                      <div>Bank: <span className="font-semibold text-ink-800 dark:text-ink-200">{statement.payment_instructions.bank_name}</span></div>
                      <div>Title: <span className="font-semibold text-ink-800 dark:text-ink-200">{statement.payment_instructions.account_title}</span></div>
                      <div>A/C #: <span className="font-mono font-semibold text-ink-800 dark:text-ink-200">{statement.payment_instructions.account_number}</span></div>
                      <div>IBAN: <span className="font-mono font-semibold text-ink-800 dark:text-ink-200">{statement.payment_instructions.iban}</span></div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-ink-200 bg-ink-50 px-6 py-3.5 dark:border-ink-800 dark:bg-ink-800/50">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
