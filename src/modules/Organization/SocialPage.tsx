import { motion } from 'framer-motion';
import { Instagram, Facebook, Linkedin, Twitter, Heart, MessageCircle, Share2, Plus, Link2 } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { socialAccounts, socialEngagement, socialPosts } from '@/modules/Organization/social';
import { clsx } from 'clsx';

const platformIcons: Record<string, typeof Instagram> = {
  Instagram: Instagram,
  Facebook: Facebook,
  LinkedIn: Linkedin,
  'Twitter / X': Twitter,
  TikTok: Instagram,
};

const chartTooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgba(16,24,40,0.12)', fontSize: 12 };

export function SocialPage() {
  const { hasAccess, canCreate } = useDataAccess('social');

  const displayAccounts = hasAccess ? socialAccounts : [];
  const displayPosts = hasAccess ? socialPosts : [];
  const displayEngagement = hasAccess ? socialEngagement : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Social Media Integration" subtitle="Manage connected accounts and track engagement.">
        {canCreate && (
          <Button size="sm" onClick={() => alert('Opening connection dialog...')}><Plus className="h-4 w-4" /> Connect Account</Button>
        )}
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      {/* Connected accounts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayAccounts.map((acc, i) => {
          const Icon = platformIcons[acc.platform] || Instagram;
          return (
            <motion.div key={acc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
              <Card hover className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: acc.color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-50">{acc.platform}</p>
                      <p className="text-xs text-ink-500">{acc.handle}</p>
                    </div>
                  </div>
                  {acc.connected ? (
                    <Badge tone="green"><Link2 className="h-3 w-3" /> Connected</Badge>
                  ) : (
                    <Badge tone="gray">Not Connected</Badge>
                  )}
                </div>

                {acc.connected && (
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4 dark:border-ink-800">
                    <Stat label="Followers" value={acc.followers >= 1000 ? `${(acc.followers / 1000).toFixed(1)}K` : String(acc.followers)} />
                    <Stat label="Posts" value={String(acc.posts)} />
                    <Stat label="Engagement" value={`${acc.engagement}%`} />
                  </div>
                )}

                {!acc.connected && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => alert('Connecting ' + acc.platform + '...')}><Link2 className="h-4 w-4" /> Connect</Button>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Engagement chart */}
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly Engagement" subtitle="Likes, comments, and shares by platform" />
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={displayEngagement} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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

        {/* Recent posts */}
        <Card>
          <CardHeader title="Recent Posts" subtitle="Latest social activity" />
          <div className="p-5 pt-3 space-y-3">
            {displayPosts.map((post, i) => (
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{value}</p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  );
}
