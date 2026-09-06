export type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
  followers: number;
  engagement: number;
  posts: number;
  connected: boolean;
  color: string;
  icon: string;
};

export const socialAccounts: SocialAccount[] = [
  { id: 'SOC-001', platform: 'Instagram', handle: '@nexus_official', followers: 24500, engagement: 4.8, posts: 342, connected: true, color: '#E1306C', icon: 'instagram' },
  { id: 'SOC-002', platform: 'Facebook', handle: 'Nexus Business', followers: 18200, engagement: 3.2, posts: 560, connected: true, color: '#1877F2', icon: 'facebook' },
  { id: 'SOC-003', platform: 'LinkedIn', handle: 'Nexus Suite', followers: 8900, engagement: 6.1, posts: 180, connected: true, color: '#0A66C2', icon: 'linkedin' },
  { id: 'SOC-004', platform: 'Twitter / X', handle: '@nexushq', followers: 12300, engagement: 2.9, posts: 1200, connected: true, color: '#000000', icon: 'twitter' },
  { id: 'SOC-005', platform: 'TikTok', handle: '@nexus.trends', followers: 0, engagement: 0, posts: 0, connected: false, color: '#00F2EA', icon: 'tiktok' },
];

export const socialEngagement = [
  { day: 'Mon', instagram: 1200, facebook: 800, linkedin: 450 },
  { day: 'Tue', instagram: 1500, facebook: 920, linkedin: 520 },
  { day: 'Wed', instagram: 1800, facebook: 1100, linkedin: 680 },
  { day: 'Thu', instagram: 2100, facebook: 1300, linkedin: 890 },
  { day: 'Fri', instagram: 2800, facebook: 1600, linkedin: 1100 },
  { day: 'Sat', instagram: 3200, facebook: 1900, linkedin: 950 },
  { day: 'Sun', instagram: 2400, facebook: 1400, linkedin: 720 },
];

export type SocialPost = {
  id: string;
  platform: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  date: string;
};

export const socialPosts: SocialPost[] = [
  { id: 'SP-001', platform: 'Instagram', content: 'New product launch! Check out our latest wireless collection.', likes: 1240, comments: 89, shares: 45, date: '2026-08-30' },
  { id: 'SP-002', platform: 'Facebook', content: 'Weekend sale — up to 30% off on all accessories!', likes: 680, comments: 120, shares: 210, date: '2026-08-29' },
  { id: 'SP-003', platform: 'LinkedIn', content: 'We are hiring! Senior sales executive position open.', likes: 340, comments: 56, shares: 78, date: '2026-08-28' },
  { id: 'SP-004', platform: 'Instagram', content: 'Behind the scenes: our warehouse team at work.', likes: 890, comments: 34, shares: 12, date: '2026-08-27' },
];
