import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Linkedin, Twitter, Heart, MessageCircle, Share2, Plus, Link2, Zap, RefreshCw } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { socialEngagement, socialPosts } from '@/modules/Organization/social';
import { useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api/integrations';

const platformIcons: Record<string, typeof Instagram> = {
  Instagram: Instagram,
  Facebook: Facebook,
  LinkedIn: Linkedin,
  'Twitter / X': Twitter,
  WhatsApp: MessageCircle,
};

const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

export function SocialPage() {
  const { hasAccess, canCreate } = useDataAccess('social');
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);

  const getHeaders = () => {
    const mockSession = btoa(JSON.stringify({ id: 'admin-001', role: 'shop_admin', shop_id: 'shop-001' }));
    return {
      'x-mock-session': mockSession,
      'Content-Type': 'application/json',
    };
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/accounts`, { headers: getHeaders() }).then((r) => r.json());
      if (res.success) setAccounts(res.accounts || []);
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const defaultSocialPlatforms = [
    { platform: 'Instagram', provider: 'instagram', handle: '@nexus_shop_official', color: '#E1306C' },
    { platform: 'Facebook', provider: 'facebook', handle: 'nexus_official_fb_page', color: '#1877F2' },
    { platform: 'WhatsApp', provider: 'whatsapp', handle: '+15559876543', color: '#10B981' },
  ];

  const handleConnect = async (provider: string) => {
    try {
      const redirectUri = window.location.origin + `/api/integrations/oauth/${provider}/callback`;
      const res = await fetch(`${API_BASE}/oauth/${provider}/connect?redirect_uri=${encodeURIComponent(redirectUri)}`, {
        headers: getHeaders(),
      }).then((r) => r.json());

      if (res.success && res.auth_url) {
        window.open(res.auth_url, 'OAuthConnect', 'width=600,height=700');
        setTimeout(() => fetchAccounts(), 3000);
      }
    } catch (e) {
      navigate('/integrations');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Social Media & Channel Integration" subtitle="Manage connected social channels and track real-time engagement.">
        {canCreate && (
          <Button size="sm" onClick={() => navigate('/integrations')}>
            <Plus className="h-4 w-4" /> Manage Integrations Center
          </Button>
        )}
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {/* Connected Accounts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {defaultSocialPlatforms.map((plat, i) => {
          const Icon = platformIcons[plat.platform] || Instagram;
          const liveAcc = accounts.find((a) => a.provider === plat.provider && a.status === 'active');
          const isConnected = !!liveAcc;

          return (
            <motion.div key={plat.platform} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
              <Card hover className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: plat.color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-50">{plat.platform}</p>
                      <p className="text-xs text-ink-500">{liveAcc ? liveAcc.account_identifier : plat.handle}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge tone="green"><Link2 className="h-3 w-3" /> Connected</Badge>
                  ) : (
                    <Badge tone="gray">Disconnected</Badge>
                  )}
                </div>

                {isConnected ? (
                  <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800 flex items-center justify-between text-xs">
                    <span className="text-ink-500">Channel Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Sync Active
                    </span>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleConnect(plat.provider)}>
                      <Link2 className="h-4 w-4" /> Connect Channel
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly Engagement Analytics" subtitle="Likes, inquiries, and interactions by channel" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={socialEngagement} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(103,113,141,0.15)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#67718d' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="instagram" stroke="#E1306C" strokeWidth={2} dot={{ r: 3 }} name="Instagram" />
                <Line type="monotone" dataKey="facebook" stroke="#1877F2" strokeWidth={2} dot={{ r: 3 }} name="Facebook" />
                <Line type="monotone" dataKey="linkedin" stroke="#0A66C2" strokeWidth={2} dot={{ r: 3 }} name="LinkedIn" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Channel Activity" subtitle="Latest social & messaging events" />
          <div className="p-5 pt-3 space-y-3">
            {socialPosts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                <div className="flex items-center justify-between">
                  <Badge tone="brand">{post.platform}</Badge>
                  <span className="text-xs text-ink-400">{post.date}</span>
                </div>
                <p className="mt-2 text-xs text-ink-600 dark:text-ink-300">{post.content}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {post.comments}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> {post.shares}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
