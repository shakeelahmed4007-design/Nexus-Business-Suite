export function toSafeUUID(id: string | null | undefined): string {
  if (!id) return '00000000-0000-0000-0000-000000000001';
  const clean = String(id).trim();
  if (clean === 'admin@nexus.com' || clean === 'super-admin-01' || clean === 'shop-001' || clean === 'superadmin') {
    return '00000000-0000-0000-0000-000000000001';
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) return clean;

  const padded = clean.replace(/[^a-zA-Z0-9]/g, '').padEnd(32, '0').slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}
