import { supabaseAdmin } from '../config/supabaseAdmin';

export interface VendorInput {
  shop_id: string;
  vendor_name: string;
  contact_number?: string;
  email?: string;
  address?: string;
  bank_details?: any;
  status?: 'Active' | 'Inactive' | 'Blocked';
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  rating?: number;
}

export class VendorService {
  async createVendor(data: VendorInput) {
    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .insert({
        shop_id: data.shop_id,
        vendor_name: data.vendor_name,
        contact_number: data.contact_number || null,
        email: data.email || null,
        address: data.address || null,
        bank_details: data.bank_details || {},
        status: data.status || 'Active',
        approval_status: data.approval_status || 'Pending',
        rating: data.rating !== undefined ? data.rating : 5.00,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return vendor;
  }

  async getVendorsByShop(shopId: string) {
    const { data: vendors, error } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return vendors || [];
  }

  async updateVendor(vendorId: string, shopId: string, updates: Partial<VendorInput>) {
    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('vendor_id', vendorId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return vendor;
  }

  async approveVendor(vendorId: string, shopId: string, approvalStatus: 'Approved' | 'Rejected') {
    return this.updateVendor(vendorId, shopId, {
      approval_status: approvalStatus,
      status: approvalStatus === 'Approved' ? 'Active' : 'Inactive',
    });
  }
}
