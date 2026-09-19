import { Request, Response, NextFunction } from 'express';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error);

  const message = error?.message || 'An unexpected server error occurred';

  if (message.includes('not found')) {
    return res.status(404).json({ success: false, error: message, code: 'NOT_FOUND' });
  }

  if (message.includes('Invalid') || message.includes('required') || message.includes('already exists')) {
    return res.status(400).json({ success: false, error: message, code: 'BAD_REQUEST' });
  }

  if (message.includes('Unauthorized')) {
    return res.status(401).json({ success: false, error: message, code: 'UNAUTHORIZED' });
  }

  if (message.includes('Forbidden') || message.includes('unauthorized')) {
    return res.status(403).json({ success: false, error: message, code: 'FORBIDDEN' });
  }

  return res.status(500).json({
    success: false,
    error: message,
    code: 'SERVER_ERROR',
  });
};
