import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Warehouse as WarehouseIcon,
  Grid3x3,
  Boxes,
  ArrowRight,
  Plus,
  Building2,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Table, type Column } from '@/shared/components/ui/Table';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { warehouses as defaultWarehouses, bins, movementLog, type Warehouse, type Bin } from '@/modules/Inventory/warehouse';
import { clsx } from 'clsx';

const BACKEND_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api';

const binStatusConfig = {
  Full: { tone: 'green' as const, color: 'bg-emerald-500', text: 'text-white' },
  Partial: { tone: 'brand' as const, color: 'bg-brand-500', text: 'text-white' },
  Empty: { tone: 'gray' as const, color: 'bg-ink-300 dark:bg-ink-700', text: 'text-ink-500' },
};

export function WarehousePage() {
  const { hasAccess } = useDataAccess('warehouse');

  // Warehouses state loaded from local cache and synced with Backend API
  const [warehouseList, setWarehouseList] = useState<Warehouse[]>(() => {
    const saved = localStorage.getItem('nexus_custom_warehouses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return [...defaultWarehouses, ...parsed];
      } catch (e) {
        // ignore
      }
    }
    return defaultWarehouses;
  });

  const [selectedWh, setSelectedWh] = useState<string>(() => {
    return defaultWarehouses[0]?.id || 'WH-A';
  });

  // Fetch backend locations on mount to sync multi-location system
  useEffect(() => {
    const loadBackendLocations = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/v1/locations`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.locations) && json.locations.length > 0) {
            const mapped: Warehouse[] = json.locations.map((loc: any) => ({
              id: loc.location_id,
              name: loc.location_name,
              location: loc.address || (loc.location_type === 'WAREHOUSE' ? 'Main Storage Facility' : 'Retail Outlet'),
              capacity: 5000,
              used: 0,
              bins: 36,
              racks: 8,
            }));

            setWarehouseList((prev) => {
              const existingIds = new Set(prev.map((w) => w.id));
              const newItems = mapped.filter((m) => !existingIds.has(m.id));
              if (newItems.length === 0) return prev;
              return [...prev, ...newItems];
            });
          }
        }
      } catch (e) {
        // backend optional offline mode
      }
    };

    loadBackendLocations();
  }, []);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'WAREHOUSE' | 'RETAIL_SHOP' | 'DISTRIBUTION_CENTER' | 'OTHER'>('WAREHOUSE');
  const [formAddress, setFormAddress] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formManager, setFormManager] = useState('');
  const [formCapacity, setFormCapacity] = useState('5000');
  const [formRacks, setFormRacks] = useState('12');
  const [formBins, setFormBins] = useState('48');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const displayWarehouses = hasAccess ? warehouseList : [];
  const displayMovementLogs = hasAccess ? movementLog : [];

  const wh = displayWarehouses.find((w) => w.id === selectedWh) || displayWarehouses[0];

  // Dynamically resolve bins for either preset or newly created warehouses
  const whBins: Bin[] = useMemo(() => {
    if (!hasAccess || !wh) return [];

    const matched = bins.filter((b) => b.id.startsWith(wh.id.replace('WH-', '').charAt(0)));
    if (matched.length > 0) return matched;

    // Generate realistic starting bins for newly added custom warehouses
    const generated: Bin[] = [];
    const prefix = wh.id.replace(/[^A-Z]/g, '').slice(0, 1) || 'W';
    const numRacks = Math.min(wh.racks || 6, 6);
    const binsPerRack = Math.min(Math.ceil((wh.bins || 24) / numRacks), 6);

    for (let r = 1; r <= numRacks; r++) {
      for (let b = 1; b <= binsPerRack; b++) {
        generated.push({
          id: `${prefix}-R${r}-B${b}`,
          rack: `R${r}`,
          row: prefix,
          item: `Storage Slot ${r}-${b}`,
          quantity: 0,
          capacity: 50,
          status: 'Empty',
        });
      }
    }
    return generated;
  }, [hasAccess, wh]);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Warehouse or location name is required');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const abbr = formName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'LOC';
    const newId = `WH-${abbr}-${Date.now().toString().slice(-3)}`;
    const cap = parseInt(formCapacity, 10) || 5000;
    const rks = parseInt(formRacks, 10) || 12;
    const bns = parseInt(formBins, 10) || 48;

    const newWarehouse: Warehouse = {
      id: newId,
      name: formName.trim(),
      location: formAddress.trim() || 'Central Hub, Pakistan',
      capacity: cap,
      used: 0,
      bins: bns,
      racks: rks,
    };

    // 1. Sync with backend API
    try {
      await fetch(`${BACKEND_URL}/v1/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_name: formName.trim(),
          location_type: formType,
          address: formAddress.trim() || undefined,
          contact_person: formContactPerson.trim() || undefined,
          contact_phone: formContactPhone.trim() || undefined,
          manager_id: formManager.trim() || undefined,
        }),
      });
    } catch (err) {
      console.warn('Backend warehouse creation fallback:', err);
    }

    // 2. Persist to local state & localStorage
    setWarehouseList((prev) => {
      const updated = [newWarehouse, ...prev];
      const customOnly = updated.filter((w) => !defaultWarehouses.some((dw) => dw.id === w.id));
      localStorage.setItem('nexus_custom_warehouses', JSON.stringify(customOnly));
      return updated;
    });

    setSelectedWh(newId);
    setSuccessMsg(`Warehouse "${formName}" created and added successfully!`);
    setTimeout(() => setSuccessMsg(''), 4000);

    // Reset Form
    setFormName('');
    setFormAddress('');
    setFormContactPerson('');
    setFormContactPhone('');
    setFormManager('');
    setFormCapacity('5000');
    setFormRacks('12');
    setFormBins('48');
    setSubmitting(false);
    setIsAddModalOpen(false);
  };

  const moveColumns: Column<(typeof movementLog)[number]>[] = [
    { key: 'id', header: 'ID', render: (m) => <span className="font-mono text-xs text-ink-500">{m.id}</span> },
    { key: 'item', header: 'Item' },
    {
      key: 'type',
      header: 'Type',
      render: (m) => (
        <Badge tone={m.type === 'In' ? 'green' : m.type === 'Out' ? 'rose' : 'brand'}>{m.type}</Badge>
      ),
    },
    { key: 'qty', header: 'Qty', align: 'center', render: (m) => <span className="font-semibold">{m.qty}</span> },
    { key: 'from', header: 'From', render: (m) => <span className="text-xs text-ink-500">{m.from}</span> },
    { key: 'to', header: 'To', render: (m) => <span className="text-xs text-ink-500">{m.to}</span> },
    { key: 'date', header: 'Date', render: (m) => <span className="text-xs text-ink-500">{m.date}</span> },
  ];

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Warehouse Management" subtitle="Visualize bin locations, racks, and inventory movements." />
        <AccessPendingBanner
          title="Warehouse Access Required"
          subtitle="You do not have permission to view this module. Please contact your administrator."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Warehouse Action */}
      <PageHeader
        title="Warehouse Management"
        subtitle="Manage warehouses, physical storage locations, bin layouts, and inventory movements."
      >
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Warehouse
        </Button>
      </PageHeader>

      {/* Success Notification */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Warehouse selector cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {displayWarehouses.map((w, i) => {
          const pct = Math.round((w.used / (w.capacity || 1)) * 100);
          const isSelected = selectedWh === w.id;

          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4 }}
            >
              <Card
                hover
                className={clsx(
                  'cursor-pointer p-5 transition-all',
                  isSelected
                    ? 'ring-2 ring-brand-500 shadow-md border-brand-300 dark:border-brand-700'
                    : 'border-ink-200 dark:border-ink-800'
                )}
                onClick={() => setSelectedWh(w.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                    <WarehouseIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-ink-400 bg-ink-100 dark:bg-ink-800 px-2 py-0.5 rounded-md">
                    {w.id}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-ink-900 dark:text-ink-50 truncate">{w.name}</p>
                <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {w.location}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-400">Capacity</span>
                    <span className="font-medium">
                      {w.used}/{w.capacity}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                      className={clsx(
                        'h-full rounded-full',
                        pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-ink-500">
                  <span className="flex items-center gap-1">
                    <Grid3x3 className="h-3.5 w-3.5" /> {w.racks} racks
                  </span>
                  <span className="flex items-center gap-1">
                    <Boxes className="h-3.5 w-3.5" /> {w.bins} bins
                  </span>
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
            subtitle={`${whBins.length} bins configured across ${new Set(whBins.map((b) => b.rack)).size} racks`}
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
                  <p className="mb-2 text-xs font-semibold text-ink-400">
                    Row {rackBins[0].row} — Rack {rackBins[0].rack}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {rackBins.map((b) => {
                      const cfg = binStatusConfig[b.status];
                      const fillPct = (b.quantity / (b.capacity || 1)) * 100;
                      return (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          className="group relative overflow-hidden rounded-lg border border-ink-200 p-3 dark:border-ink-700 bg-white dark:bg-ink-900 shadow-sm"
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
                          <p className="mt-1 text-xs text-ink-500">
                            {b.quantity}/{b.capacity}
                          </p>
                          <div
                            className={clsx(
                              'mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                              cfg.color,
                              cfg.text
                            )}
                          >
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
        <CardHeader
          title="Inventory Movement Log"
          subtitle="Recent transfers, receipts, and dispatches across facilities"
          action={<ArrowRight className="h-4 w-4 text-ink-400" />}
        />
        <div className="pt-3">
          <Table columns={moveColumns} data={displayMovementLogs} rowKey={(m) => m.id} />
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* ADD WAREHOUSE MODAL */}
      {/* ==================================================================== */}
      <Modal
        open={isAddModalOpen}
        onClose={() => !submitting && setIsAddModalOpen(false)}
        title="Add New Warehouse / Location"
        subtitle="Register a physical warehouse, retail shop, or storage depot into the multi-location system."
        size="lg"
      >
        <form onSubmit={handleAddWarehouse} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">
                Warehouse / Location Name *
              </label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Main Godown Karachi"
                  required
                  className="h-10 w-full rounded-xl border border-ink-200 pl-9 pr-3 text-sm dark:border-ink-700 dark:bg-ink-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Location Type *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
              >
                <option value="WAREHOUSE">Warehouse / Godown (Main Storage)</option>
                <option value="RETAIL_SHOP">Retail Shop (Branch Outlet)</option>
                <option value="DISTRIBUTION_CENTER">Distribution Center (Regional Hub)</option>
                <option value="OTHER">Other Storage / Transit Facility</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Physical Address / City *</label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="e.g. Plot 42, Sector 15, Korangi Industrial Area, Karachi"
                className="h-10 w-full rounded-xl border border-ink-200 pl-9 pr-3 text-sm dark:border-ink-700 dark:bg-ink-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Contact Person</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  placeholder="e.g. Muhammad Usman"
                  className="h-10 w-full rounded-xl border border-ink-200 pl-9 pr-3 text-sm dark:border-ink-700 dark:bg-ink-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Contact Phone</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={formContactPhone}
                  onChange={(e) => setFormContactPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="h-10 w-full rounded-xl border border-ink-200 pl-9 pr-3 text-sm dark:border-ink-700 dark:bg-ink-800"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Total Capacity (Units)</label>
              <input
                type="number"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                min="100"
                className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Racks Count</label>
              <input
                type="number"
                value={formRacks}
                onChange={(e) => setFormRacks(e.target.value)}
                min="1"
                className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-700 dark:text-ink-200">Bins Count</label>
              <input
                type="number"
                value={formBins}
                onChange={(e) => setFormBins(e.target.value)}
                min="1"
                className="mt-1 h-10 w-full rounded-xl border border-ink-200 px-3 text-sm dark:border-ink-700 dark:bg-ink-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-200 dark:border-ink-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
