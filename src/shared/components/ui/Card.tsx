import { clsx } from 'clsx';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ className, hover, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'card-base rounded-2xl',
        hover && 'transition-all duration-300 hover:shadow-card-lg hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 p-5 pb-0', className)}>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
