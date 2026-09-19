import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { SmartFollowupService } from '../services/smartFollowupService';

const followupService = new SmartFollowupService();

/**
 * GET /api/crm/smart-followup or /api/v1/crm/smart-followup
 * Returns AI-prioritized actionable follow-up suggestions across CRM, Leads, Invoices, Tasks, and Inventory.
 */
export const getFollowupSuggestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = (req.user?.shop_id as string) || (req.headers['x-shop-id'] as string) || 'shop-001';
    const result = await followupService.generateFollowupSuggestions(shopId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/crm/smart-followup/:id/dismiss
 * Dismisses or snoozes a follow-up suggestion.
 */
export const dismissFollowupSuggestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const suggestionId = req.params.id;
    const hours = parseInt(req.body.hours as string, 10) || 24;

    if (!suggestionId) {
      return res.status(400).json({ success: false, error: 'Suggestion ID is required' });
    }

    const result = followupService.dismissSuggestion(suggestionId, hours);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Suggestion dismissed successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/crm/smart-followup/:id/restore
 * Restores a previously dismissed suggestion.
 */
export const restoreFollowupSuggestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const suggestionId = req.params.id;

    if (!suggestionId) {
      return res.status(400).json({ success: false, error: 'Suggestion ID is required' });
    }

    const result = followupService.restoreSuggestion(suggestionId);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Suggestion restored successfully',
    });
  } catch (err) {
    next(err);
  }
};
