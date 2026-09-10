import { Router } from 'express';
import { integrationController } from '../controllers/integrationController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

// ─── Public Webhooks (External Platform Callbacks) ──────────────────────────
router.get('/webhooks/whatsapp', (req, res) => integrationController.handleWhatsAppWebhook(req, res));
router.post('/webhooks/whatsapp', (req, res) => integrationController.handleWhatsAppWebhook(req, res));

router.get('/webhooks/facebook', (req, res) => integrationController.handleFacebookWebhook(req, res));
router.post('/webhooks/facebook', (req, res) => integrationController.handleFacebookWebhook(req, res));

router.post('/webhooks/website/:apiKey', (req, res) => integrationController.handleWebsiteWebhook(req, res));

// ─── Public / Semi-Public OAuth Callbacks ──────────────────────────────────
router.get('/oauth/:provider/callback', (req: any, res) => integrationController.handleOAuthCallback(req, res));
router.post('/oauth/:provider/callback', (req: any, res) => integrationController.handleOAuthCallback(req, res));

// ─── Protected Routes (Requires Auth & Tenant Isolation) ─────────────────────
router.use(authenticateJWT as any);

// Integration Accounts Management
router.get('/accounts', (req: any, res) => integrationController.getAccounts(req, res));
router.get('/oauth/:provider/connect', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.initiateOAuth(req, res)
);
router.put('/accounts/:id/primary', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.setPrimaryAccount(req, res)
);
router.delete('/accounts/:id', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.disconnectAccount(req, res)
);
router.post('/accounts/:id/test', (req: any, res) => integrationController.testConnection(req, res));

// Unified Inbox & Messaging APIs
router.get('/inbox/threads', (req: any, res) => integrationController.getInboxThreads(req, res));
router.get('/inbox/threads/:threadId/messages', (req: any, res) => integrationController.getThreadMessages(req, res));
router.get('/inbox/unread-counts', (req: any, res) => integrationController.getUnreadCounts(req, res));
router.post('/messages/send', (req: any, res) => integrationController.sendMessage(req, res));
router.patch('/messages/:id/read', (req: any, res) => integrationController.markMessageRead(req, res));

// Website Contact Form API Keys
router.get('/website-keys', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.getWebsiteApiKeys(req, res)
);
router.post('/website-keys', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.generateWebsiteApiKey(req, res)
);
router.delete('/website-keys/:id', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.revokeWebsiteApiKey(req, res)
);

// Integration Activity & Diagnostic Logs
router.get('/logs', requireRoles(['super_admin', 'shop_admin']), (req: any, res) =>
  integrationController.getLogs(req, res)
);

export default router;
