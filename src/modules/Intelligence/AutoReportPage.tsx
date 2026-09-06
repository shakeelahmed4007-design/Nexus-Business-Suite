import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileBarChart, Sparkles, Languages, FileText, Download, Printer } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { salesData } from '@/modules/Overview/dashboard';
import { clsx } from 'clsx';

type Lang = 'en' | 'ur';

export function AutoReportPage() {
  const { hasAccess } = useDataAccess('auto_report');
  const [lang, setLang] = useState<Lang>('en');
  const [reportType, setReportType] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  function generate() {
    if (!hasAccess) return;
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1500);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Auto-Report Generator" subtitle="Generate business reports in English or Urdu with AI.">
        <Badge tone="violet" icon={Sparkles}>AI Powered</Badge>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        {/* Report builder */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Report Configuration</h3>

            {/* Language toggle */}
            <div className="mt-4">
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-500"><Languages className="h-3.5 w-3.5" /> Language</label>
              <div className="flex gap-2">
                {([['en', 'English'], ['ur', 'اردو']] as const).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={clsx(
                      'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                      lang === code ? 'bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Report type */}
            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium text-ink-500">Report Type</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { id: 'sales', label: lang === 'ur' ? 'سیلز' : 'Sales' },
                  { id: 'inventory', label: lang === 'ur' ? 'انوینٹری' : 'Inventory' },
                  { id: 'finance', label: lang === 'ur' ? 'فنانس' : 'Finance' },
                  { id: 'hr', label: lang === 'ur' ? 'ایچ آر' : 'HR' },
                ].map((t) => (
                  <button key={t.id} onClick={() => setReportType(t.id)} className={clsx('rounded-lg px-3 py-2 text-xs font-medium transition-all', reportType === t.id ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30' : 'bg-ink-50 text-ink-500 dark:bg-ink-800/50')}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium text-ink-500">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm dark:border-ink-700 dark:bg-ink-800">
                <option value="weekly">{lang === 'ur' ? 'ہفتہ وار' : 'Weekly'}</option>
                <option value="monthly">{lang === 'ur' ? 'ماہانہ' : 'Monthly'}</option>
                <option value="quarterly">{lang === 'ur' ? 'سہ ماہی' : 'Quarterly'}</option>
                <option value="yearly">{lang === 'ur' ? 'سالانہ' : 'Yearly'}</option>
              </select>
            </div>

            <Button className="mt-5 w-full" onClick={generate} disabled={generating}>
              <Sparkles className="h-4 w-4" />
              {generating ? (lang === 'ur' ? 'تیار ہو رہا ہے...' : 'Generating...') : (lang === 'ur' ? 'رپورٹ بنائیں' : 'Generate Report')}
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500">
                <FileBarChart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">AI Summary</p>
                <p className="text-xs text-ink-500">Auto-generated insights from your data</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[
                { label: lang === 'ur' ? 'کل revenues' : 'Total Revenue', value: 'PKR 680K', trend: '+9.7%' },
                { label: lang === 'ur' ? 'کل آرڈرز' : 'Total Orders', value: '232', trend: '+5.2%' },
                { label: lang === 'ur' ? 'نئے گاہک' : 'New Customers', value: '38', trend: '+14%' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-xs dark:bg-ink-800/50">
                  <span className="text-ink-500">{s.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink-900 dark:text-ink-50">{s.value}</span>
                    <Badge tone="green">{s.trend}</Badge>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Report preview */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 p-4 dark:border-ink-800">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-50">
              <FileText className="h-4 w-4 text-brand-500" /> {lang === 'ur' ? 'رپورٹ پیش نظارہ' : 'Report Preview'}
            </span>
            {generated && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => alert('Printing report...')}><Printer className="h-4 w-4" /> Print</Button>
                <Button variant="ghost" size="sm" onClick={() => alert('Downloading PDF...')}><Download className="h-4 w-4" /> PDF</Button>
              </div>
            )}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="h-10 w-10 text-brand-500" />
                  </motion.div>
                  <p className="mt-4 text-sm text-ink-500">{lang === 'ur' ? 'AI رپورٹ تیار کر رہا ہے...' : 'AI is generating your report...'}</p>
                </motion.div>
              ) : generated ? (
                <motion.div key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={clsx(lang === 'ur' && 'text-right')} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
                  <div className="mb-6 border-b border-ink-200 pb-4 dark:border-ink-800">
                    <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50">
                      {lang === 'ur' ? 'کاروباری کارکردگی رپورٹ' : 'Business Performance Report'}
                    </h2>
                    <p className="mt-1 text-xs text-ink-400">
                      {lang === 'ur' ? `ادارہ: Nexus Business Suite | مدت: ${period === 'monthly' ? 'اگست 2026' : period}` : `Nexus Business Suite | Period: August 2026`}
                    </p>
                  </div>

                  <div className="space-y-4 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                    <Section title={lang === 'ur' ? 'خدملاصہ' : 'Executive Summary'} lang={lang}>
                      {lang === 'ur'
                        ? 'اگست 2026 میں، کاروبار نے 9.7٪ اضافے کے ساتھ 680,000 روپے کی آمدنی حاصل کی۔ کل 232 آرڈرز موصول ہوئے، جو پچھلے مہینے سے 5.2٪ زیادہ ہیں۔ 38 نئے گاہکوں نے رجسٹریشن کی، جو 14٪ اضافہ ظاہر کرتا ہے۔'
                        : 'In August 2026, the business generated PKR 680,000 in revenue, representing a 9.7% increase month-over-month. A total of 232 orders were received, up 5.2% from the previous period. 38 new customers registered, marking a 14% growth in customer acquisition.'}
                    </Section>

                    <Section title={lang === 'ur' ? 'فروخت کی کارکردگی' : 'Sales Performance'} lang={lang}>
                      {lang === 'ur'
                        ? 'سیلز ٹیم نے اہم کامیابی حاصل کی، خاص طور پر الیکٹرانکس کیٹیگری میں۔ اوسط آرڈر ویلیو 2,930 روپے رہی، جو 7.4٪ بہتر ہے۔ کنورژن ریٹ 24٪ تک پہنچ گیا، جو صنعت کی اوسط سے زیادہ ہے۔'
                        : 'The sales team performed strongly, particularly in the Electronics category. The average order value reached PKR 2,930, improving by 7.4%. The conversion rate climbed to 24%, above industry average. Top-performing channels were Online (58%) and POS (28%).'}
                    </Section>

                    <Section title={lang === 'ur' ? 'مخزون کی صورتحال' : 'Inventory Status'} lang={lang}>
                      {lang === 'ur'
                        ? '48 فعال SKUs میں سے 3 آئٹمز کم اسٹاک پر ہیں۔ Smart Watch Pro اور Mechanical Keyboard کو فوری طور پر دوبارہ آرڈر کرنے کی ضرورت ہے۔ کل اسٹاک کی مالیت 2.1 ملین روپے ہے۔'
                        : 'Of 48 active SKUs, 3 items are on low stock alert. Smart Watch Pro and Mechanical Keyboard require immediate reordering. Total stock value stands at PKR 2.1 million across three warehouses.'}
                    </Section>

                    <Section title={lang === 'ur' ? 'تجاویز' : 'Recommendations'} lang={lang}>
                      {lang === 'ur'
                        ? '1. Smart Watch Pro کی فوری دوبارہ آرڈرنگ کریں۔ 2. VIP گاہکوں کے لیے خصوصی پیشکش جاری رکھیں۔ 3. ستمبر میں مارکیٹنگ مہم میں اضافہ کریں۔ 4. GreenMart کے ساتھ بلک آرڈر کے مواقع پر عمل کریں۔'
                        : '1. Reorder Smart Watch Pro immediately to prevent stockout. 2. Continue VIP customer retention program. 3. Increase marketing spend for September campaign. 4. Follow up on bulk order opportunities with GreenMart and BlueOcean.'}
                    </Section>
                  </div>

                  <div className="mt-6 rounded-xl bg-ink-50 p-4 dark:bg-ink-800/50">
                    <p className="text-xs text-ink-400">{lang === 'ur' ? 'AI کی طرف سے تیار کردہ — Nikon Business Suite' : 'Generated by AI — Nexus Business Suite'}</p>
                    <p className="mt-1 text-xs text-ink-400">{new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US')}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
                  <FileBarChart className="h-12 w-12 text-ink-200 dark:text-ink-700" />
                  <p className="mt-4 text-sm font-medium text-ink-500">{lang === 'ur' ? 'رپورٹ پیش نظارہ یہاں دکھائی دیگی' : 'Report preview will appear here'}</p>
                  <p className="mt-1 text-xs text-ink-400">{lang === 'ur' ? 'رپورٹ بنانے کے لیے بٹن دبائیں' : 'Click "Generate Report" to begin'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children, lang }: { title: string; children: React.ReactNode; lang: Lang }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-bold text-ink-900 dark:text-ink-50">{title}</h3>
      <p className="text-xs leading-relaxed text-ink-600 dark:text-ink-300">{children}</p>
    </div>
  );
}
