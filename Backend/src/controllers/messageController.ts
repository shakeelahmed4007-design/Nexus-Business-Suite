import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { MessageService } from '../services/messageService';

const messageService = new MessageService();

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user?.id || '';
    const senderRole = req.user?.role || 'staff';
    const senderName = req.user?.email || 'User';
    const shopId = req.user?.shop_id || '';

    const { receiverId, receiverRole, subject, content } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ success: false, error: 'Subject and Content are required' });
    }

    const msg = await messageService.sendMessage(senderId, senderRole, senderName, shopId, {
      receiverId,
      receiverRole,
      subject,
      content,
    });

    return res.status(201).json({ success: true, data: msg, message: 'Message sent successfully' });
  } catch (err) {
    next(err);
  }
};

export const getMyMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const userRole = req.user?.role || 'staff';
    const shopId = req.user?.shop_id || '';

    const messages = await messageService.getMyMessages(userId, userRole, shopId);
    return res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const { id } = req.params;

    await messageService.markAsRead(userId, id);
    return res.json({ success: true, message: 'Message marked as read' });
  } catch (err) {
    next(err);
  }
};
