-- ============================================================================
-- PHASE 4: INTEGRATIONS MIGRATION
-- Multi-Tenant Integrations: WhatsApp, Gmail/Email, FB Messenger, IG DMs, Website Forms
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. INTEGRATION ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.integration_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('whatsapp', 'email', 'facebook', 'instagram', 'website')),
    account_identifier VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    is_primary BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_auth', 'error', 'disconnected')),
    error_message TEXT,
    last_used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant lookup & active accounts
CREATE INDEX IF NOT EXISTS idx_integration_accounts_shop_provider ON public.integration_accounts(shop_id, provider);

-- 2. WEBSITE FORM API KEYS TABLE
CREATE TABLE IF NOT EXISTS public.website_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    api_key VARCHAR(100) NOT NULL UNIQUE,
    form_name VARCHAR(255) DEFAULT 'Contact Form',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_api_keys_key ON public.website_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_website_api_keys_shop ON public.website_api_keys(shop_id);

-- 3. INTEGRATION MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.integration_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    integration_account_id UUID REFERENCES public.integration_accounts(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    sender_identifier VARCHAR(255) NOT NULL,
    recipient_identifier VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    thread_id VARCHAR(255) NOT NULL,
    external_message_id VARCHAR(255),
    subject TEXT,
    message_text TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    attachments JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_messages_shop_thread ON public.integration_messages(shop_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_integration_messages_customer ON public.integration_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_integration_messages_lead ON public.integration_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_integration_messages_ext_id ON public.integration_messages(external_message_id);

-- 4. INTEGRATION WEBHOOKS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.integration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) DEFAULT 'shop-001',
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    payload JSONB DEFAULT '{}'::jsonb,
    signature TEXT,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INTEGRATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id VARCHAR(100) NOT NULL DEFAULT 'shop-001',
    provider VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_shop_timestamp ON public.integration_logs(shop_id, timestamp DESC);
