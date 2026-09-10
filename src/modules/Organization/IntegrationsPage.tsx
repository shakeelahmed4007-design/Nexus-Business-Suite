import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Mail,
  Facebook,
  Instagram,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Plus,
  Key,
  ShieldCheck,
  Zap,
  Activity,
  Send,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api/integrations';

interface IntegrationAccount {
  id: string;
  provider: 'whatsapp' | 'email' | 'facebook' | 'instagram' | 'website';
  account_identifier: string;
  account_name: string;
  is_primary: boolean;
  status: 'active' | 'expired' | 'pending_auth' | 'error' | 'disconnected';
  last_used_at?: string;
  has_token?: boolean;
}

interface WebsiteApiKey {
  id: string;
  api_key: string;
  form_name: string;
  status: 'active' | 'revoked';
  created_at: string;
}

export function IntegrationsPage() {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [apiKeys, setApiKeys] = useState<WebsiteApiKey[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [newFormName, setNewFormName] = useState('Website Contact Form');

  const getHeaders = () => {
    const mockSession = btoa(JSON.stringify({ id: 'admin-001', role: 'shop_admin', shop_id: 'shop-001' }));
    return {
      'x-mock-session': mockSession,
      'Content-Type': 'application/json',
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, keysRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/accounts`, { headers: getHeaders() }).then((r) => r.json()),
        fetch(`${API_BASE}/website-keys`, { headers: getHeaders() }).then((r) => r.json()),
        fetch(`${API_BASE}/logs`, { headers: getHeaders() }).then((r) => r.json()),
      ]);

      if (accRes.success) setAccounts(accRes.accounts || []);
      if (keysRes.success) setApiKeys(keysRes.keys || []);
      if (logsRes.success) setLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to fetch integrations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnectOAuth = async (provider: string) => {
    try {
      const redirectUri = window.location.origin + `/api/integrations/oauth/${provider}/callback`;
      const res = await fetch(`${API_BASE}/oauth/${provider}/connect?redirect_uri=${encodeURIComponent(redirectUri)}`, {
        headers: getHeaders(),
      }).then((r) => r.json());

      if (res.success && res.auth_url) {
        window.open(res.auth_url, 'OAuthConnect', 'width=600,height=700');
        // Poll accounts after connect
        setTimeout(() => fetchData(), 3000);
      }
    } catch (err: any) {
      alert('OAuth initiation error: ' + err.message);
    }
  };

  const handleTestConnection = async (accountId: string) => {
    setTestingId(accountId);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/accounts/${accountId}/test`, {
        method: 'POST',
        headers: getHeaders(),
      }).then((r) => r.json());

      if (res.success) {
        setTestResult(res.message);
        fetchData();
      }
    } catch (err: any) {
      setTestResult('Connection check failed: ' + err.message);
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration account?')) return;
    try {
      await fetch(`${API_BASE}/accounts/${accountId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      fetchData();
    } catch (err: any) {
      alert('Failed to disconnect account');
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const res = await fetch(`${API_BASE}/website-keys`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ form_name: newFormName }),
      }).then((r) => r.json());

      if (res.success) {
        setNewFormName('Website Contact Form');
        fetchData();
      }
    } catch (err: any) {
      alert('Failed to generate website API key');
    }
  };

  const handleCopySnippet = (key: string) => {
    const snippet = `<form action="http://localhost:5000/api/integrations/webhooks/website/${key}" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <input type="tel" name="phone" placeholder="Your Phone Number" />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <button type="submit">Submit Inquiry</button>
</form>`;
    navigator.clipboard.writeText(snippet);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const channelConfig = [
    {
      provider: 'whatsapp' as const,
      name: 'WhatsApp Business API',
      description: 'Receive & reply to customer messages from your official WhatsApp Business number.',
      icon: MessageCircle,
      bgColor: 'bg-emerald-500',
      color: '#10B981',
    },
    {
      provider: 'email' as const,
      name: 'Gmail & Email Sync',
      description: 'Auto-poll unread emails every 5 mins and reply directly from CRM timeline.',
      icon: Mail,
      bgColor: 'bg-red-500',
      color: '#EF4444',
    },
    {
      provider: 'facebook' as const,
      name: 'Facebook Messenger',
      description: 'Capture Facebook page messages into CRM inbox with automatic lead linking.',
      icon: Facebook,
      bgColor: 'bg-blue-600',
      color: '#2563EB',
    },
    {
      provider: 'instagram' as const,
      name: 'Instagram Direct Messages',
      description: 'Manage customer DMs and inquiries from your Instagram Business profile.',
      icon: Instagram,
      bgColor: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600',
      color: '#EC4899',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Channel Integrations"
        subtitle="Connect WhatsApp, Gmail, Facebook, Instagram, and Website forms with multi-tenant account control."
      >
        <Button size="sm" onClick={() => fetchData()}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </Button>
      </PageHeader>

      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{testResult}</span>
        </motion.div>
      )}

      {/* Integration Channel Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-2">
        {channelConfig.map((ch, idx) => {
          const connectedAcc = accounts.find((a) => a.provider === ch.provider && a.status === 'active');
          const Icon = ch.icon;

          return (
            <motion.div
              key={ch.provider}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md ${ch.bgColor}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-ink-900 dark:text-ink-50">{ch.name}</h3>
                        <p className="text-xs text-ink-500 dark:text-ink-400">{ch.description}</p>
                      </div>
                    </div>
                    {connectedAcc ? (
                      <Badge tone="green">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge tone="gray">Disconnected</Badge>
                    )}
                  </div>

                  {connectedAcc && (
                    <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-xs dark:border-ink-800 dark:bg-ink-900/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink-700 dark:text-ink-300">Identifier:</span>
                        <span className="font-mono text-ink-900 dark:text-ink-100">{connectedAcc.account_identifier}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-semibold text-ink-700 dark:text-ink-300">Account:</span>
                        <span className="text-ink-900 dark:text-ink-100">{connectedAcc.account_name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
                  {connectedAcc ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={testingId === connectedAcc.id}
                        onClick={() => handleTestConnection(connectedAcc.id)}
                      >
                        <Zap className={`h-3.5 w-3.5 ${testingId === connectedAcc.id ? 'animate-bounce text-amber-500' : ''}`} />
                        {testingId === connectedAcc.id ? 'Testing...' : 'Test Connection'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDisconnect(connectedAcc.id)}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => handleConnectOAuth(ch.provider)}>
                      <Plus className="h-4 w-4" /> Connect {ch.name.split(' ')[0]} Account
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Website Contact Form Embed API Keys Section */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100 pb-4 dark:border-ink-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-ink-900 dark:text-ink-50">Website Contact Form Integration</h3>
              <p className="text-xs text-ink-500">Capture leads instantly from your website forms via secure API keys.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
              placeholder="Form Name (e.g. Landing Page Form)"
              className="h-9 rounded-lg border border-ink-200 bg-ink-50 px-3 text-xs dark:border-ink-700 dark:bg-ink-800"
            />
            <Button size="sm" onClick={handleGenerateApiKey}>
              <Key className="h-3.5 w-3.5" /> Generate API Key
            </Button>
          </div>
        </div>

        {apiKeys.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-400">No active website API keys found. Click "Generate API Key" to create one.</p>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((k) => (
              <div key={k.id} className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 dark:border-ink-800 dark:bg-ink-900/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-bold text-sm text-ink-900 dark:text-ink-100">{k.form_name}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded">
                        {k.api_key}
                      </span>
                      <Badge tone={k.status === 'active' ? 'green' : 'gray'}>{k.status}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleCopySnippet(k.api_key)}>
                    <Copy className="h-3.5 w-3.5" /> {copiedKey === k.api_key ? 'Copied HTML Embed!' : 'Copy Form HTML Embed'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Integration Diagnostic Logs */}
      <Card className="p-6">
        <CardHeader title="Integration Security & Activity Logs" subtitle="Recent OAuth connections, webhooks, and status events." />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-600 dark:text-ink-300">
            <thead className="border-b border-ink-200 bg-ink-50 uppercase text-[10px] text-ink-400 dark:border-ink-800 dark:bg-ink-900">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Action Event</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-ink-400">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 10).map((l) => (
                  <tr key={l.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                    <td className="p-3 whitespace-nowrap text-ink-400">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-semibold uppercase">{l.provider}</td>
                    <td className="p-3 font-mono text-brand-600 dark:text-brand-400">{l.action}</td>
                    <td className="p-3 font-mono text-[11px] truncate max-w-[250px]">{JSON.stringify(l.details)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
