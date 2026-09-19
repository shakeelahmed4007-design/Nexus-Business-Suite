import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/supabaseAdmin';

export const listShops = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabaseAdmin.from('shops').select('*');

    if (req.user?.role !== 'super_admin') {
      query = query.eq('id', req.user?.shop_id || '');
    }

    const { data: shops, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ shops });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateModuleAccess = async (req: AuthenticatedRequest, res: Response) => {
  const { shopId } = req.params;
  const { moduleAccess } = req.body;

  if (!Array.isArray(moduleAccess)) {
    return res.status(400).json({ error: 'moduleAccess must be an array of string module names' });
  }

  try {
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .update({ module_access: moduleAccess, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ message: 'Module access updated successfully', shop });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
