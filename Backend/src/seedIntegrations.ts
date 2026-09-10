import { supabaseAdmin } from './config/supabaseAdmin';
import { encryptToken, generateWebsiteApiKey } from './utils/encryption';

export async function seedIntegrations(shopId: string = 'shop-001') {
  console.log(`🌱 Seeding Phase 4 Integrations demo data for shop ${shopId}...`);

  const nowIso = new Date().toISOString();

  // 1. Seed Accounts
  const demoAccounts: any[] = [
    {
      shop_id: shopId,
      provider: 'whatsapp',
      account_identifier: '+15559876543',
      account_name: 'Main WhatsApp Business Line',
      access_token_encrypted: encryptToken('mock_wa_access_token_2026'),
      refresh_token_encrypted: encryptToken('mock_wa_refresh_token_2026'),
      token_expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      is_primary: true,
      status: 'active',
      last_used_at: nowIso,
      metadata: { phone_number_id: '1092837465' },
    },
    {
      shop_id: shopId,
      provider: 'email',
      account_identifier: 'support@nexus-suite.com',
      account_name: 'Customer Support Gmail',
      access_token_encrypted: encryptToken('mock_gmail_access_token_2026'),
      refresh_token_encrypted: encryptToken('mock_gmail_refresh_token_2026'),
      token_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      is_primary: true,
      status: 'active',
      last_used_at: nowIso,
      metadata: { email_type: 'Gmail API' },
    },
  ];

  try {
    for (const acc of demoAccounts) {
      await supabaseAdmin
        .from('integration_accounts')
        .upsert(acc, { onConflict: 'shop_id,provider,account_identifier' });
    }
  } catch (e) {
    // Non-fatal if table not created
  }

  // 2. Seed Website API Key
  try {
    const existingKey = await supabaseAdmin
      .from('website_api_keys')
      .select('id')
      .eq('shop_id', shopId)
      .limit(1);

    if (!existingKey.data || existingKey.data.length === 0) {
      await supabaseAdmin.from('website_api_keys').insert({
        shop_id: shopId,
        api_key: 'nx_live_demo_website_key_2026',
        form_name: 'Contact & Inquiry Form',
        status: 'active',
      });
    }
  } catch (e) {
    // Non-fatal
  }

  // 3. Seed Initial Demo Leads & Messages
  try {
    const demoMessages: any[] = [
      {
        shop_id: shopId,
        provider: 'whatsapp',
        direction: 'incoming',
        sender_identifier: '+923001234567',
        recipient_identifier: '+15559876543',
        thread_id: 'ident_whatsapp__923001234567',
        external_message_id: 'wamid.demo.001',
        message_text: 'Hi! Do you have Dell XPS laptops available in stock?',
        status: 'delivered',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        shop_id: shopId,
        provider: 'email',
        direction: 'incoming',
        sender_identifier: 'sarah.connor@cyberdyne.com',
        recipient_identifier: 'support@nexus-suite.com',
        thread_id: 'ident_email_sarah_connor_cyberdyne_com',
        external_message_id: 'gmail.demo.002',
        subject: 'Wholesale Hardware Catalog Inquiry',
        message_text: 'Please send over the updated price catalog for bulk workstation orders.',
        status: 'delivered',
        is_read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ];

    for (const msg of demoMessages) {
      await supabaseAdmin
        .from('integration_messages')
        .upsert(msg, { onConflict: 'external_message_id' });
    }
  } catch (e) {
    // Non-fatal
  }

  // 4. Seed Activity Logs
  try {
    await supabaseAdmin.from('integration_logs').insert([
      {
        shop_id: shopId,
        provider: 'whatsapp',
        action: 'OAUTH_CONNECT',
        details: { account_name: 'Main WhatsApp Business Line', status: 'active' },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        shop_id: shopId,
        provider: 'email',
        action: 'OAUTH_CONNECT',
        details: { account_name: 'Customer Support Gmail', status: 'active' },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  } catch (e) {
    // Non-fatal
  }

  console.log(`✅ Phase 4 Integrations demo data seeded successfully.`);
}
