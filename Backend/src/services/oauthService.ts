import axios from 'axios';

export interface TokenExchangeResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  account_identifier?: string;
  account_name?: string;
  metadata?: Record<string, any>;
}

export class OAuthService {
  /**
   * Generates OAuth authorization URL for Meta (WhatsApp, Facebook, Instagram) or Google (Gmail)
   */
  public getAuthorizationUrl(provider: string, shopId: string, redirectUri: string): string {
    const state = Buffer.from(JSON.stringify({ shop_id: shopId, provider })).toString('base64');

    switch (provider.toLowerCase()) {
      case 'whatsapp':
      case 'facebook':
      case 'instagram': {
        const metaAppId = process.env.META_APP_ID || 'MOCK_META_APP_ID';
        if (metaAppId === 'MOCK_META_APP_ID') {
          // Development/Mock OAuth flow
          return `${redirectUri}?code=mock_meta_auth_code_${Date.now()}&state=${state}`;
        }
        const scope = 'whatsapp_business_management,whatsapp_business_messaging,pages_messaging,instagram_basic,instagram_manage_messages';
        return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
      }

      case 'email':
      case 'gmail': {
        const googleClientId = process.env.GOOGLE_CLIENT_ID || 'MOCK_GOOGLE_CLIENT_ID';
        if (googleClientId === 'MOCK_GOOGLE_CLIENT_ID') {
          // Development/Mock OAuth flow
          return `${redirectUri}?code=mock_google_auth_code_${Date.now()}&state=${state}`;
        }
        const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;
      }

      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Exchanges authorization code for access and refresh tokens
   */
  public async exchangeCodeForTokens(
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<TokenExchangeResult> {
    const isMock = code.startsWith('mock_') || !process.env.META_APP_SECRET;

    if (isMock) {
      const now = Date.now();
      const mockEmail = `shop_business_${provider}@nexus-demo.com`;
      const mockPhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

      return {
        access_token: `mock_access_token_${provider}_${now}`,
        refresh_token: `mock_refresh_token_${provider}_${now}`,
        expires_in: 60 * 60 * 24 * 60, // 60 days
        account_identifier: provider === 'email' ? mockEmail : mockPhone,
        account_name: `${provider.toUpperCase()} Business Line`,
        metadata: { is_mock: true, connected_at: new Date().toISOString() },
      };
    }

    switch (provider.toLowerCase()) {
      case 'whatsapp':
      case 'facebook':
      case 'instagram': {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;

        const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            client_id: appId,
            client_secret: appSecret,
            redirect_uri: redirectUri,
            code,
          },
        });

        const shortAccessToken = response.data.access_token;
        // Exchange for long-lived token (60 days)
        const longLivedResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortAccessToken,
          },
        });

        const longAccessToken = longLivedResp.data.access_token;
        const expiresIn = longLivedResp.data.expires_in || 5184000; // 60 days

        // Get user profile / WABA ID info
        const meResp = await axios.get('https://graph.facebook.com/v18.0/me', {
          params: { access_token: longAccessToken, fields: 'id,name,email' },
        });

        return {
          access_token: longAccessToken,
          refresh_token: longAccessToken, // Meta long-lived tokens act as refreshable access tokens
          expires_in: expiresIn,
          account_identifier: meResp.data.id || meResp.data.email || 'Meta-Business-Account',
          account_name: meResp.data.name || 'Meta Business Connection',
          metadata: meResp.data,
        };
      }

      case 'email':
      case 'gmail': {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        const tokenResp = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });

        const { access_token, refresh_token, expires_in } = tokenResp.data;

        // Fetch Google User Email
        const userResp = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        return {
          access_token,
          refresh_token: refresh_token || access_token,
          expires_in,
          account_identifier: userResp.data.email,
          account_name: userResp.data.name || userResp.data.email,
          metadata: userResp.data,
        };
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Refreshes access token before expiration
   */
  public async refreshAccessToken(provider: string, refreshToken: string): Promise<TokenExchangeResult> {
    if (refreshToken.startsWith('mock_')) {
      return {
        access_token: `mock_refreshed_access_${Date.now()}`,
        refresh_token: refreshToken,
        expires_in: 60 * 60 * 24 * 60,
      };
    }

    if (provider === 'email' || provider === 'gmail') {
      const tokenResp = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });
      return {
        access_token: tokenResp.data.access_token,
        expires_in: tokenResp.data.expires_in,
      };
    }

    // For Meta, extend long-lived token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const resp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: refreshToken,
      },
    });

    return {
      access_token: resp.data.access_token,
      expires_in: resp.data.expires_in || 5184000,
    };
  }
}

export const oauthService = new OAuthService();
