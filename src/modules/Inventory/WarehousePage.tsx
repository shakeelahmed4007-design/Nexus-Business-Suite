import { useState } from 'react';
import { motion } from 'framer-motion';
import { Warehouse, Grid3x3, Boxes, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { warehouses, bins, movementLog } from '@/modules/Inventory/warehouse';
import { clsx } from 'clsx';

const binStatusConfig = {
  Full: { tone: 'green' as const, color: 'bg-emerald-500', text: 'text-white' },
  Partial: { tone: 'brand' as const, color: 'bg-brand-500', text: 'text-white' },
  Empty: { tone: 'gray' as const, color: 'bg-ink-300 dark:bg-ink-700', text: 'text-ink-500' },
};

export function WarehousePage() {
  const { hasAccess } = useDataAccess('warehouse');
  const [selectedWh, setSelectedWh] = useState(warehouses[0]?.id || 'WH-1');

  const displayWarehouses = hasAccess ? warehouses : [];
  const displayMovementLogs = hasAccess ? movementLog : [];

  const whBins = hasAccess
    ? bins.filter((b) => b.id.startsWith(selectedWh.replace('WH-', '').charAt(0)))
    : [];
  const wh = displayWarehouses.find((w) => w.id === selectedWh);

  const moveColumns: Column<typeof movementLog[number]>[] = [
    { key: 'id', header: 'ID', render: (m) => <span className="font-mono text-xs text-ink-500">{m.id}</span> },
    { key: 'item', header: 'Item' },
    { key: 'type', header: 'Type', render: (m) => <Badge tone={m.type === 'In' ? 'green' : m.type === 'Out' ? 'rose' : 'brand'}>{m.type}</Badge> },
    { key: 'qty', header: 'Qty', align: 'center', render: (m) => <span className="font-semibold">{m.qty}</span> },
    { key: 'from', header: 'From', render: (m) => <span className="text-xs text-ink-500">{m.from}</span> },
    { key: 'to', header: 'To', render: (m) => <span className="text-xs text-ink-500">{m.to}</span> },
    { key: 'date', header: 'Date', render: (m) => <span className="text-xs text-ink-500">{m.date}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse Management" subtitle="Visualize bin locations, racks, and inventory movements." />

      {!hasAccess && <AccessPendingBanner />}

      {/* Warehouse selector cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {displayWarehouses.map((w, i) => {
          const pct = Math.round((w.used / w.capacity) * 100);
          return (
            <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
              <Card hover className={`cursor-pointer p-5 ${selectedWh === w.id ? 'ring-2 ring-brand-500' : ''}`} onClick={() => setSelectedWh(w.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                    <Warehouse className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-xs text-ink-400">{w.id}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-ink-900 dark:text-ink-50">{w.name}</p>
                <p className="text-xs text-ink-500">{w.location}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-400">Capacity</span>
                    <span className="font-medium">{w.used}/{w.capacity}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                      className={clsx('h-full rounded-full', pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500')}
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Grid3x3 className="h-3.5 w-3.5" /> {w.racks} racks</span>
                  <span className="flex items-center gap-1"><Boxes className="h-3.5 w-3.5" /> {w.bins} bins</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Bin visualization */}
      {wh && (
        <Card>
          <CardHeader
            title={`Bin Layout — ${wh.name}`}
            subtitle={`${whBins.length} bins across ${new Set(whBins.map((b) => b.rack)).size} racks`}
            action={<Badge tone="brand">Live View</Badge>}
          />
          <div className="p-5 pt-3">
            {/* Legend */}
            <div className="mb-4 flex items-center gap-4 text-xs">
              {Object.entries(binStatusConfig).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1.5 text-ink-500">
                  <span className={`h-3 w-3 rounded ${cfg.color}`} /> {key}
                </span>
              ))}
            </div>

            {/* Racks */}
            {Array.from(new Set(whBins.map((b) => `${b.row}-${b.rack}`))).map((rackKey) => {
              const rackBins = whBins.filter((b) => `${b.row}-${b.rack}` === rackKey);
              return (
                <div key={rackKey} className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-ink-400">Row {rackBins[0].row} — Rack {rackBins[0].rack}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {rackBins.map((b) => {
                      const cfg = binStatusConfig[b.status];
                      const fillPct = (b.quantity / b.capacity) * 100;
                      return (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          className="group relative overflow-hidden rounded-lg border border-ink-200 p-3 dark:border-ink-700"
                        >
                          <div className="absolute bottom-0 left-0 h-1 bg-ink-100 dark:bg-ink-800 w-full" />
                          <motion.div
                            className={clsx('absolute bottom-0 left-0 h-1', cfg.color)}
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPct}%` }}
                            transition={{ duration: 0.8 }}
                          />
                          <p className="text-xs font-mono text-ink-400">{b.id}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{b.item}</p>
                          <p className="mt-1 text-xs text-ink-500">{b.quantity}/{b.capacity}</p>
                          <div className={clsx('mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', cfg.color, cfg.text)}>
                            {b.status}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Movement log */}
      <Card>
        <CardHeader title="Inventory Movement Log" subtitle="Recent transfers, receipts, and dispatches" action={<ArrowRight className="h-4 w-4 text-ink-400" />} />
        <div className="pt-3">
          <Table columns={moveColumns} data={displayMovementLogs} rowKey={(m) => m.id} />
        </div>
      </Card>
    </div>
  );
}
