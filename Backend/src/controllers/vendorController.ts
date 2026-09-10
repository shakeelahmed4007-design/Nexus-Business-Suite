import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { VendorService } from '../services/vendorService';

const vendorService = new VendorService();

export const createVendor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const { vendor_name, contact_number, email, address, bank_details, rating } = req.body;

    if (!vendor_name) {
      return res.status(400).json({ error: 'vendor_name is required' });
    }

    const vendor = await vendorService.createVendor({
      shop_id: shopId,
      vendor_name,
      contact_number,
      email,
      address,
      bank_details,
      rating,
    });

    return res.status(201).json({ success: true, vendor });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getVendors = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = (req.query.shop_id as string) || req.user?.shop_id || 'shop-001';
    const vendors = await vendorService.getVendorsByShop(shopId);
    return res.json({ success: true, vendors });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateVendor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { vendor_id } = req.params;
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';
    const updates = req.body;

    const updated = await vendorService.updateVendor(vendor_id, shopId, updates);
    return res.json({ success: true, vendor: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const approveVendor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { vendor_id } = req.params;
    const { approval_status } = req.body;
    const shopId = req.body.shop_id || req.user?.shop_id || 'shop-001';

    if (!['Approved', 'Rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'approval_status must be Approved or Rejected' });
    }

    const updated = await vendorService.approveVendor(vendor_id, shopId, approval_status);
    return res.json({ success: true, vendor: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};