import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'super_admin' | 'shop_admin' | 'staff';
    shop_id: string | null;
  };
}

// ─── Mock Session Bypass ──────────────────────────────────────────────────────
// When the frontend uses local/mock auth (no real Supabase JWT), it sends
// user info as a base64-encoded JSON in X-Mock-Session header.

// Well-known UUIDs for demo accounts (deterministic mapping)
const MOCK_UUID_MAP: Record<string, string> = {
  'super-admin-01': '00000000-0000-0000-0000-000000000001',
  'super-admin':    '00000000-0000-0000-0000-000000000001',
};

function toSafeUUID(id: string): string {
  if (MOCK_UUID_MAP[id]) return MOCK_UUID_MAP[id];
  // Check if already a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  // Convert any string ID to a deterministic UUID-shaped string
  const padded = id.replace(/[^a-zA-Z0-9]/g, '').padEnd(32, '0').slice(0, 32);
  return `${padded.slice(0,8)}-${padded.slice(8,12)}-${padded.slice(12,16)}-${padded.slice(16,20)}-${padded.slice(20,32)}`;
}

function parseMockSession(header: string): AuthenticatedRequest['user'] | null {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed.id || !parsed.role) return null;

    // Normalize role: 'admin' -> 'shop_admin'
    let role = parsed.role as string;
    if (role === 'admin') role = 'shop_admin';
    if (!['super_admin', 'shop_admin', 'staff'].includes(role)) role = 'staff';

    return {
      id: toSafeUUID(parsed.id),
      email: parsed.email || '',
      role: role as 'super_admin' | 'shop_admin' | 'staff',
      shop_id: parsed.shop_id || null,
    };
  } catch {
    return null;
  }
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // ── Path 1: Mock session header (local/demo auth) ────────────────────────
  const mockHeader = req.headers['x-mock-session'] as string | undefined;
  if (mockHeader) {
    const mockUser = parseMockSession(mockHeader);
    if (!mockUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid mock session' });
    }

    // Try to find the real Supabase user by email to get a valid UUID
    try {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const realUser = listData?.users?.find(u => u.email?.toLowerCase() === mockUser.email.toLowerCase());
      if (realUser?.id) {
        mockUser.id = realUser.id;
        // Also get shop_id from their profile if not provided
        if (!mockUser.shop_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('shop_id')
            .eq('id', realUser.id)
            .maybeSingle();
          if (profile?.shop_id) mockUser.shop_id = profile.shop_id;
        }
      }
    } catch (e) {
      // Non-fatal: use UUID-mapped ID
    }

    req.user = mockUser;

    // For super_admin without a shop, find/create a system shop
    if (mockUser.role === 'super_admin' && !mockUser.shop_id) {
      try {
        const { data: existingShop } = await supabaseAdmin
          .from('shops')
          .select('id')
          .eq('name', 'Super Admin System Shop')
          .maybeSingle();

        if (existingShop?.id) {
          req.user.shop_id = existingShop.id;
        } else {
          const { data: newShop } = await supabaseAdmin
            .from('shops')
            .insert({ name: 'Super Admin System Shop', status: 'active' })
            .select('id')
            .single();
          if (newShop?.id) req.user.shop_id = newShop.id;
        }
      } catch (e) {
        // proceed — will fail at business logic with a clear message
      }
    }

    return next();
  }

  // ── Path 2: Real Supabase JWT ────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, shop_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Forbidden: Profile record not found' });
    }

    req.user = profile;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal auth verification error', details: err.message });
  }
};

export const requireRoles = (allowedRoles: ('super_admin' | 'shop_admin' | 'staff')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this action' });
    }
    next();
  };
};
