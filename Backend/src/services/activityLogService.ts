import { supabaseAdmin } from '../config/supabaseAdmin';
import { CRMModule } from '../models/activityLog';

export class ActivityLogService {
  async log(
    userId: string,
    shopId: string,
    action: string,
    module: CRMModule,
    entityId: string | null,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      if (!shopId || !userId) return;
      await supabaseAdmin.from('activity_logs').insert({
        shop_id: shopId,
        user_id: userId,
        action,
        module,
        entity_id: entityId,
        details: details || {},
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('ActivityLog error:', err);
    }
  }
}
