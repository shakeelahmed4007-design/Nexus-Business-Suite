import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={clsx(
              'relative w-full overflow-hidden rounded-t-2xl bg-white shadow-card-lg dark:bg-ink-900 sm:rounded-2xl',
              sizes[size],
            )}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-ink-800">
                <div>
                  {title && <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="max-h-[80vh] overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 scrollbar-thin touch-scrolling">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-t border-ink-200 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-ink-800">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
