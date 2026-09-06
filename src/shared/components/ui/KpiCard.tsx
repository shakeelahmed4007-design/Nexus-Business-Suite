import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

type Trend = { value: number; positive?: boolean };

export type KpiCardProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  accent?: 'brand' | 'green' | 'amber' | 'rose' | 'cyan';
  trend?: Trend;
  delay?: number;
};

const accents: Record<string, string> = {
  brand: 'from-brand-500/10 to-brand-500/0 text-brand-600 dark:text-brand-400',
  green: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400',
  amber: 'from-amber-500/10 to-amber-500/0 text-amber-600 dark:text-amber-400',
  rose: 'from-rose-500/10 to-rose-500/0 text-rose-600 dark:text-rose-400',
  cyan: 'from-cyan-500/10 to-cyan-500/0 text-cyan-600 dark:text-cyan-400',
};

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1200, bounce: 0 });
  const display = useTransform(spring, (v) =>
    `${prefix}${Math.round(v).toLocaleString()}${suffix}`,
  );

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export function KpiCard({ label, value, prefix, suffix, icon: Icon, accent = 'brand', trend, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4 }}
      className="card-base relative overflow-hidden p-5"
    >
      <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-60', accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
          </p>
          {trend && (() => {
            const rawNum = typeof trend.value === 'number' ? trend.value : parseFloat(String(trend.value));
            const safeTrendVal = isNaN(rawNum) ? 0 : Math.abs(rawNum);
            return (
              <p
                className={clsx(
                  'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                  trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {trend.positive ? '▲' : '▼'} {safeTrendVal}%
                <span className="text-ink-400 dark:text-ink-500">vs last month</span>
              </p>
            );
          })()}
        </div>
        <div className={clsx('rounded-xl p-2.5', accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
