import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/supabaseAdmin';

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ status: 'success', user: req.user });
};

export const createShopAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, fullName, shopName } = req.body;

  if (!email || !password || !shopName) {
    return res.status(400).json({ error: 'email, password, and shopName are required' });
  }

  try {
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .insert({
        name: shopName,
        status: 'active',
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (shopError) {
      return res.status(400).json({ error: 'Failed to create shop', details: shopError.message });
    }

    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        role: 'shop_admin',
        shop_id: shop.id,
      },
    });

    if (createUserError) {
      return res.status(400).json({ error: 'Failed to create user', details: createUserError.message });
    }

    return res.status(201).json({
      message: 'Shop Admin created successfully',
      shop,
      user: authUser.user,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error creating shop admin', details: err.message });
  }
};
