import { clsx } from 'clsx';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
};

export type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
};

export function Table<T extends Record<string, any>>({ columns, data, rowKey, onRowClick, empty }: TableProps<T>) {
  const alignClass = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-800">
            {columns.map((c) => (
              <th
                key={c.key}
                className={clsx(
                  'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400',
                  alignClass(c.align),
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-400">
                {empty || 'No records found'}
              </td>
            </tr>
          )}
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={clsx(
                'border-b border-ink-100 transition-colors last:border-0 dark:border-ink-800/60',
                onRowClick && 'cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/40',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx('whitespace-nowrap px-4 py-3 text-ink-700 dark:text-ink-200', alignClass(c.align), c.className)}
                >
                  {c.render ? c.render(row) : (row[c.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
