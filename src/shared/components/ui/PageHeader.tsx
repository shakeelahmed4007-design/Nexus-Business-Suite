export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-ink-900 dark:text-ink-50 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 max-w-full">{children}</div>}
    </div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">{children}</div>
  );
}
