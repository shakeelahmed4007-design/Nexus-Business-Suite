import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { integrationAccountService } from '../services/integrationAccountService';
import { oauthService } from '../services/oauthService';
import { incomingMessageService } from '../services/incomingMessageService';
import { outgoingMessageService } from '../services/outgoingMessageService';
import { unifiedInboxService } from '../services/unifiedInboxService';
import { verifyMetaWebhookSignature } from '../utils/encryption';
import { supabaseAdmin } from '../config/supabaseAdmin';

export class IntegrationController {
  /**
   * GET /api/integrations/accounts
   * List connected accounts for current shop
   */
  public async getAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const accounts = await integrationAccountService.getAccountsByShop(shopId);
      return res.json({ success: true, accounts });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/integrations/oauth/:provider/connect
   * Initiate OAuth authorization flow
   */
  public async initiateOAuth(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const provider = req.params.provider;
      const redirectUri = (req.query.redirect_uri as string) || `${req.protocol}://${req.get('host')}/api/integrations/oauth/${provider}/callback`;

      const authUrl = oauthService.getAuthorizationUrl(provider, shopId, redirectUri);
      return res.json({ success: true, auth_url: authUrl, provider, shop_id: shopId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET/POST /api/integrations/oauth/:provider/callback
   * Exchange code for tokens and save account
   */
  public async handleOAuthCallback(req: AuthenticatedRequest, res: Response) {
    try {
      const provider = req.params.provider as any;
      const code = (req.query.code as string) || req.body.code;
      const stateBase64 = (req.query.state as string) || req.body.state;

      let shopId = req.user?.shop_id || 'shop-001';
      if (stateBase64) {
        try {
          const parsedState = JSON.parse(Buffer.from(stateBase64, 'base64').toString('utf8'));
          if (parsedState.shop_id) shopId = parsedState.shop_id;
        } catch (e) {
          // fallback
        }
      }

      if (!code) {
        return res.status(400).json({ success: false, error: 'Missing OAuth authorization code' });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/${provider}/callback`;
      const tokenResult = await oauthService.exchangeCodeForTokens(provider, code, redirectUri);

      const accountId = await integrationAccountService.connectAccount({
        shop_id: shopId,
        provider,
        account_identifier: tokenResult.account_identifier || `${provider}_line`,
        account_name: tokenResult.account_name || `${provider.toUpperCase()} Business`,
        access_token: tokenResult.access_token,
        refresh_token: tokenResult.refresh_token,
        expires_in_seconds: tokenResult.expires_in,
        metadata: tokenResult.metadata,
        is_primary: true,
      });

      // If requested via browser GET redirect, send html popup success page
      if (req.method === 'GET') {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
              <h2 style="color: #10b981;">🎉 Integration Connected Successfully!</h2>
              <p>${provider.toUpperCase()} account has been linked to your CRM.</p>
              <p>You may now close this window and return to your dashboard.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'INTEGRATION_CONNECTED', provider: '${provider}', accountId: '${accountId}' }, '*');
                  setTimeout(() => window.close(), 2500);
                }
              </script>
            </body>
          </html>
        `);
      }

      return res.json({ success: true, account_id: accountId, message: 'Account connected successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/integrations/accounts/:id/primary
   */
  public async setPrimaryAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const accountId = req.params.id;
      await integrationAccountService.setPrimaryAccount(shopId, accountId);
      return res.json({ success: true, message: 'Account set as primary successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/integrations/accounts/:id
   */
  public async disconnectAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const accountId = req.params.id;
      await integrationAccountService.disconnectAccount(shopId, accountId);
      return res.json({ success: true, message: 'Account disconnected' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/integrations/accounts/:id/test
   */
  public async testConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const accountId = req.params.id;
      const result = await integrationAccountService.testConnection(shopId, accountId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET / POST /api/integrations/webhooks/whatsapp
   * Meta WhatsApp Business Webhook handler
   */
  public async handleWhatsAppWebhook(req: any, res: Response) {
    if (req.method === 'GET') {
      // Verification challenge from Meta
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'nexus_meta_webhook_token_2026';

      if (mode === 'subscribe' && token === expectedToken) {
        console.log('✅ WhatsApp Webhook verified successfully');
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Verification token mismatch');
    }

    // POST: Incoming messages or status updates
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const appSecret = process.env.META_APP_SECRET;

      if (appSecret && signature) {
        const isValid = verifyMetaWebhookSignature(req.rawBody || JSON.stringify(req.body), signature, appSecret);
        if (!isValid) {
          console.warn('⚠️ Rejected WhatsApp Webhook: Invalid HMAC signature');
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      }

      const body = req.body;
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const metadata = value.metadata || {};
          const phoneId = metadata.phone_number_id;

          // Find shop matching phoneId or default shop
          let shopId = 'shop-001';
          let accId: string | undefined;

          if (phoneId) {
            const { data: acc } = await supabaseAdmin
              .from('integration_accounts')
              .select('id, shop_id')
              .eq('provider', 'whatsapp')
              .eq('status', 'active')
              .filter('metadata->>phone_number_id', 'eq', phoneId)
              .maybeSingle();

            if (acc) {
              shopId = acc.shop_id;
              accId = acc.id;
            }
          }

          // Handle incoming messages
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              const fromPhone = msg.from;
              const text = msg.text?.body || msg.caption || `[Attachment: ${msg.type}]`;

              await incomingMessageService.processIncomingMessage({
                shop_id: shopId,
                provider: 'whatsapp',
                integration_account_id: accId,
                sender_identifier: `+${fromPhone}`,
                sender_name: value.contacts?.[0]?.profile?.name || `+${fromPhone}`,
                external_message_id: msg.id,
                message_text: text,
                message_type: msg.type || 'text',
                raw_payload: msg,
              });
            }
          }

          // Handle message delivery / read status callbacks
          if (value.statuses && value.statuses.length > 0) {
            for (const statusObj of value.statuses) {
              const extId = statusObj.id;
              const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
              if (['delivered', 'read', 'failed'].includes(status)) {
                await outgoingMessageService.updateMessageStatus(
                  extId,
                  status as any,
                  statusObj.timestamp ? new Date(parseInt(statusObj.timestamp) * 1000).toISOString() : undefined
                );
              }
            }
          }
        }
      }

      return res.status(200).json({ status: 'success' });
    } catch (err: any) {
      console.error('❌ Error handling WhatsApp webhook:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET / POST /api/integrations/webhooks/facebook
   * Facebook Messenger & Instagram Direct Webhook handler
   */
  public async handleFacebookWebhook(req: any, res: Response) {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'nexus_meta_webhook_token_2026';

      if (mode === 'subscribe' && token === expectedToken) {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Verification token mismatch');
    }

    try {
      const body = req.body;
      const entries = body.entry || [];

      for (const entry of entries) {
        const messaging = entry.messaging || entry.standby || [];
        for (const event of messaging) {
          const senderId = event.sender?.id;
          const messageText = event.message?.text || '[Media content]';
          const provider = entry.id?.startsWith('ig_') || event.message?.is_echo ? 'instagram' : 'facebook';

          if (senderId && event.message && !event.message.is_echo) {
            await incomingMessageService.processIncomingMessage({
              shop_id: 'shop-001',
              provider,
              sender_identifier: senderId,
              sender_name: `Social User (${senderId.slice(-4)})`,
              external_message_id: event.message.mid || `mid_${Date.now()}`,
              message_text: messageText,
              raw_payload: event,
            });
          }
        }
      }
      return res.status(200).json({ status: 'success' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/integrations/webhooks/website/:apiKey
   * Contact form submission from external website embed
   */
  public async handleWebsiteWebhook(req: any, res: Response) {
    try {
      const apiKey = req.params.apiKey;
      const { name, email, phone, message, form_name, subject } = req.body;

      // Validate website API key
      let keyRecord: any = null;
      try {
        const { data, error } = await supabaseAdmin
          .from('website_api_keys')
          .select('*')
          .eq('api_key', apiKey)
          .eq('status', 'active')
          .maybeSingle();

        if (!error && data) {
          keyRecord = data;
        } else {
          const keys = await integrationAccountService.getWebsiteApiKeys('');
          keyRecord = keys.find((k: any) => k.api_key === apiKey && k.status === 'active');
        }
      } catch (e) {
        const keys = await integrationAccountService.getWebsiteApiKeys('');
        keyRecord = keys.find((k: any) => k.api_key === apiKey && k.status === 'active');
      }

      if (!keyRecord) {
        return res.status(401).json({ success: false, error: 'Invalid or revoked website API key' });
      }

      const shopId = keyRecord.shop_id;
      const senderIdentifier = email || phone || `web_guest_${Date.now()}`;
      const senderName = name || 'Website Visitor';
      const bodyText = message || `New form submission from ${keyRecord.form_name || 'Website Contact Form'}`;

      const messageRecord = await incomingMessageService.processIncomingMessage({
        shop_id: shopId,
        provider: 'website',
        sender_identifier: senderIdentifier,
        sender_name: senderName,
        subject: subject || `Website Form: ${keyRecord.form_name || form_name || 'Inquiry'}`,
        message_text: bodyText,
        message_type: 'form_submission',
        raw_payload: req.body,
      });

      return res.status(200).json({
        success: true,
        message: 'Form submission received and lead created',
        lead_id: messageRecord.lead_id,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/integrations/inbox/threads
   */
  public async getInboxThreads(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const { provider, is_read, search, limit, offset } = req.query;

      const result = await unifiedInboxService.getThreads(shopId, {
        provider: provider as string,
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/integrations/inbox/threads/:threadId/messages
   */
  public async getThreadMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const threadId = req.params.threadId;
      const messages = await unifiedInboxService.getThreadMessages(shopId, threadId);
      return res.json({ success: true, messages });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/integrations/inbox/unread-counts
   */
  public async getUnreadCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const counts = await unifiedInboxService.getUnreadCounts(shopId);
      return res.json({ success: true, counts });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/integrations/messages/send
   */
  public async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const userId = req.user?.id;
      const { thread_id, provider, recipient_identifier, message_text, subject, integration_account_id } = req.body;

      if (!thread_id || !provider || !recipient_identifier || !message_text) {
        return res.status(400).json({ success: false, error: 'Missing required message parameters' });
      }

      const messageRecord = await outgoingMessageService.sendMessage({
        shop_id: shopId,
        thread_id,
        provider,
        recipient_identifier,
        message_text,
        subject,
        integration_account_id,
        user_id: userId,
      });

      return res.json({ success: true, message: messageRecord });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PATCH /api/integrations/messages/:id/read
   */
  public async markMessageRead(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const messageId = req.params.id;
      await unifiedInboxService.markAsRead(shopId, messageId);
      return res.json({ success: true, message: 'Message marked as read' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET / POST / DELETE Website API Keys
   */
  public async getWebsiteApiKeys(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const keys = await integrationAccountService.getWebsiteApiKeys(shopId);
      return res.json({ success: true, keys });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async generateWebsiteApiKey(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const { form_name } = req.body;
      const keyRecord = await integrationAccountService.generateWebsiteApiKey(shopId, form_name);
      return res.json({ success: true, key: keyRecord });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async revokeWebsiteApiKey(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const keyId = req.params.id;
      await integrationAccountService.revokeWebsiteApiKey(shopId, keyId);
      return res.json({ success: true, message: 'Website API key revoked' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/integrations/logs
   */
  public async getLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = req.user?.shop_id || 'shop-001';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await integrationAccountService.getLogs(shopId, limit);
      return res.json({ success: true, logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const integrationController = new IntegrationController();
