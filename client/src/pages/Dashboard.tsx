import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  Users,
  Eye,
  Heart,
  Video,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Target,
  Zap,
  ChevronRight,
  Clock,
  Play,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, GradientCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { accountsApi, type Account, type VideoData, type DashboardStats } from '@/services/accounts';
import { getAllPlatforms } from '@/constants/platforms';
import type { Platform } from '@/types';
import { toast } from 'sonner';
import { REVIEW_MODE } from '@/config/features';

// AI Insights (mock for now — would come from AI service)
const AI_INSIGHTS = [
  {
    id: 1,
    type: 'trend',
    title: 'Post a video with trend "gym motivation"',
    description: 'This trend is gaining 340% traction in your niche',
    action: 'View examples',
    icon: TrendingUp,
  },
  {
    id: 2,
    type: 'engagement',
    title: 'Reply to 10 comments',
    description: 'Your engagement rate is dropping by 2.1%',
    action: 'Check comments',
    icon: Target,
  },
  {
    id: 3,
    type: 'sound',
    title: 'Use sound "Eye of the Tiger remix"',
    description: 'Trending in your niche with high completion rate',
    action: 'Preview',
    icon: Zap,
  },
];

// Format numbers
// Format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// ===== MOCK DATA (while backend /accounts/ is not ready) =====
const MOCK_ACCOUNT: Account = {
  id: 1,
  platform: 'tiktok',
  username: 'fitgirl_kz',
  display_name: 'Айгерим | Фитнес 💪',
  avatar_url: '',
  bio: 'Fitness & lifestyle content creator from KZ 🇰🇿',
  is_active: true,
  last_synced_at: new Date().toISOString(),
  stats: {
    followers: 125400,
    following: 340,
    total_videos: 287,
    total_views: 14200000,
    total_likes: 890000,
    engagement_rate: 8.7,
    avg_views: 48500,
  },
};

const MOCK_STATS: DashboardStats = {
  total_followers: 125400,
  total_videos: 287,
  avg_views: 48500,
  engagement_rate: 8.7,
  views_change: 5.1,
  followers_change: 12.3,
  engagement_change: -2.1,
  videos_change: 15,
};

const MOCK_VIDEOS: VideoData[] = [
  { id: 'v1', cover_url: '', views: 1250000, likes: 98000, comments: 3400, shares: 12000, created_at: '2025-01-28T10:00:00Z', uts_score: 87, url: '#' },
  { id: 'v2', cover_url: '', views: 890000, likes: 72000, comments: 2800, shares: 8500, created_at: '2025-01-25T14:00:00Z', uts_score: 82, url: '#' },
  { id: 'v3', cover_url: '', views: 654000, likes: 54000, comments: 1900, shares: 6200, created_at: '2025-01-22T09:00:00Z', uts_score: 76, url: '#' },
  { id: 'v4', cover_url: '', views: 432000, likes: 38000, comments: 1200, shares: 4100, created_at: '2025-01-19T16:00:00Z', uts_score: 71, url: '#' },
  { id: 'v5', cover_url: '', views: 287000, likes: 24000, comments: 890, shares: 2800, created_at: '2025-01-16T11:00:00Z', uts_score: 65, url: '#' },
];

// Set to false when backend /accounts/ endpoint is ready
const USE_MOCK_DATA = true;

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [accounts, setAccounts] = useState<Account[]>(USE_MOCK_DATA ? [MOCK_ACCOUNT] : []);
  const [stats, setStats] = useState<DashboardStats | null>(USE_MOCK_DATA ? MOCK_STATS : null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(USE_MOCK_DATA ? MOCK_ACCOUNT : null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('tiktok');
  const [recentVideos, setRecentVideos] = useState<VideoData[]>(USE_MOCK_DATA ? MOCK_VIDEOS : []);
  const [isLoading, setIsLoading] = useState(!USE_MOCK_DATA);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingDemo, setIsAddingDemo] = useState(false);

  const allPlatforms = getAllPlatforms();

  // Load data
  useEffect(() => {
    if (!USE_MOCK_DATA) {
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load accounts
      const accountsData = await accountsApi.getAccounts();
      setAccounts(accountsData);

      if (accountsData.length > 0) {
        // Select first active account
        const activeAccount = accountsData.find(a => a.is_active) || accountsData[0];
        setSelectedAccount(activeAccount);
        setSelectedPlatform((activeAccount.platform as Platform) || 'tiktok');

        // Load account details (with videos)
        const details = await accountsApi.getAccountDetails(activeAccount.id);
        setRecentVideos(details.recent_videos);

        // Load dashboard stats
        const statsData = await accountsApi.getDashboardStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;

    try {
      setIsSyncing(true);
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Account synced successfully');
      } else {
        await accountsApi.syncAccount(selectedAccount.id);
        toast.success('Account synced successfully');
        await loadDashboardData();
      }
    } catch (error) {
      toast.error('Failed to sync account');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddDemo = async () => {
    try {
      setIsAddingDemo(true);
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Demo account added');
      } else {
        await accountsApi.addDemoAccount();
        toast.success('Demo account added');
        await loadDashboardData();
      }
    } catch (error) {
      toast.error('Failed to add demo account');
    } finally {
      setIsAddingDemo(false);
    }
  };

  const handlePlatformSelect = (platformId: Platform) => {
    setSelectedPlatform(platformId);
    // Find account for this platform
    const platformAccount = accounts.find(a => a.platform === platformId);
    if (platformAccount) {
      setSelectedAccount(platformAccount);
    }
  };

  // Stats configuration
  const STATS_CONFIG = stats ? [
    {
      label: 'Followers',
      value: formatNumber(stats.total_followers),
      change: `+${stats.followers_change}%`,
      trend: 'up' as const,
      icon: Users,
      color: 'from-nl-indigo to-nl-purple',
    },
    {
      label: 'Avg Views',
      value: formatNumber(stats.avg_views),
      change: `+${stats.views_change}%`,
      trend: 'up' as const,
      icon: Eye,
      color: 'from-nl-purple to-nl-pink',
    },
    {
      label: 'Engagement',
      value: `${stats.engagement_rate}%`,
      change: `${stats.engagement_change}%`,
      trend: stats.engagement_change >= 0 ? 'up' as const : 'down' as const,
      icon: Heart,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Videos',
      value: stats.total_videos.toString(),
      change: `+${stats.videos_change}`,
      trend: 'up' as const,
      icon: Video,
      color: 'from-orange-500 to-amber-500',
    },
  ] : [];

  // ===== REVIEW MODE DASHBOARD =====
  if (REVIEW_MODE) {
    const connectedCount = 0;
    const totalPlatforms = 7;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your personal analytics hub with AI-powered insights
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold">{connectedCount} / {totalPlatforms}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Followers</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Video className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Videos</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Link2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Get Started</h2>
            <p className="text-muted-foreground mb-6">
              Connect your TikTok, Instagram, or YouTube account to unlock personalized AI insights and detailed analytics.
            </p>
            <Button
              size="lg"
              className="bg-black hover:bg-gray-800 text-white gap-2"
              onClick={() => navigate('/dashboard/connect-accounts')}
            >
              <Plus className="h-5 w-5" />
              Connect Your First Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  // ===== END REVIEW MODE =====

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center page-gradient">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nl-indigo to-nl-purple flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Empty state — no accounts
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen p-6 lg:p-8 page-gradient">
        <motion.div
          className="max-w-2xl mx-auto text-center pt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink flex items-center justify-center shadow-glow mb-6">
            <Link2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Connect Your Account</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Connect your TikTok account to start analyzing your content, discover trends, and grow your audience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/dashboard/connect-accounts')}>
              <Plus className="w-5 h-5 mr-2" />
              Connect Account
            </Button>
            <Button size="lg" variant="outline" onClick={handleAddDemo} disabled={isAddingDemo}>
              {isAddingDemo ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              Try Demo Account
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8 page-gradient">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Creator'}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your content today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
            Sync
          </Button>
          <Button size="sm" onClick={() => navigate('/dashboard/discover')}>
            <Plus className="w-4 h-4 mr-2" />
            New Search
          </Button>
        </div>
      </motion.div>

      {/* Platform Tabs */}
      <motion.div
        className="flex gap-2 flex-wrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {allPlatforms.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          const hasAccount = accounts.some(a => a.platform === platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => platform.enabled && handlePlatformSelect(platform.id)}
              disabled={!platform.enabled}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                isSelected
                  ? "glass-card bg-gradient-to-r shadow-glow-sm text-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
                !platform.enabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <span className="text-base">{platform.icon}</span>
              <span className="hidden sm:inline">{platform.name}</span>
              {hasAccount && <span className="w-2 h-2 rounded-full bg-green-500" />}
              {!platform.enabled && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  Soon
                </Badge>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Stats Grid */}
      {stats && (
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {STATS_CONFIG.map((stat) => (
            <Card key={stat.label} variant="glass" className="p-5 relative overflow-hidden group">
              <div className={cn(
                "absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-500",
                "bg-gradient-to-br",
                stat.color
              )} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    stat.color
                  )}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border-0",
                      stat.trend === 'up'
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="w-3 h-3 mr-1 inline" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1 inline" />
                    )}
                    {stat.change}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — 2/3 */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Recent Videos Table */}
          <Card variant="glass" className="overflow-hidden">
            <div className="p-6 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Recent Videos</h2>
                  <p className="text-sm text-muted-foreground">Your latest content performance</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/my-videos')}>
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase">Video</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Views</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Likes</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">UTS</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVideos.slice(0, 5).map((video, index) => (
                    <motion.tr
                      key={video.id}
                      className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {video.cover_url ? (
                              <img
                                src={video.cover_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/160x90';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-nl-indigo/20 to-nl-purple/20" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">Video {index + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(video.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-medium">{formatNumber(video.views)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm">{formatNumber(video.likes)}</span>
                      </td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell">
                        {video.uts_score ? (
                          <Badge className={cn(
                            "border-0",
                            video.uts_score >= 80 ? "bg-green-500/20 text-green-400" :
                            video.uts_score >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400"
                          )}>
                            {video.uts_score}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                          <a href={video.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                  {recentVideos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No videos yet. Connect your account to see your content here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* AI Insights */}
          <GradientCard className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI Recommendations</h2>
                <p className="text-sm text-muted-foreground">Personalized for your growth</p>
              </div>
            </div>

            <div className="space-y-4">
              {AI_INSIGHTS.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-background/50 hover:bg-background transition-colors cursor-pointer group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => navigate('/dashboard/trending')}
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <insight.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {insight.action}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </GradientCard>
        </motion.div>

        {/* Right Column — 1/3 */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Selected Account Card */}
          {selectedAccount && (
            <Card variant="glass" className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-nl-indigo to-nl-purple flex items-center justify-center text-2xl overflow-hidden">
                  {selectedAccount.avatar_url ? (
                    <img src={selectedAccount.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    '🎵'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">@{selectedAccount.username}</h3>
                  <p className="text-sm text-muted-foreground truncate">{selectedAccount.display_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>

              {selectedAccount.bio && (
                <p className="text-sm text-muted-foreground mb-4">{selectedAccount.bio}</p>
              )}

              <div className="flex gap-4 pt-4 border-t border-border/30">
                <div>
                  <p className="text-lg font-bold">{formatNumber(selectedAccount.stats.followers)}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{selectedAccount.stats.total_videos}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{selectedAccount.stats.engagement_rate}%</p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>

              {selectedAccount.last_synced_at && (
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Last synced: {new Date(selectedAccount.last_synced_at).toLocaleString()}
                </div>
              )}
            </Card>
          )}

          {/* Health Score */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Account Health</h3>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-0">
                Excellent
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted/20"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-primary"
                    strokeDasharray="78, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">78</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Your account is performing well! Keep posting consistently to improve your score.
                </p>
              </div>
            </div>
          </Card>

          {/* Credits */}
          <Card variant="gradient" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <p className="text-2xl font-bold mt-1">{user?.credits || 10}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/dashboard/pricing')}>
                Upgrade
              </Button>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                title: 'Trending',
                icon: TrendingUp,
                action: () => navigate('/dashboard/trending'),
              },
              {
                title: 'AI Scripts',
                icon: Sparkles,
                action: () => navigate('/dashboard/ai-scripts'),
              },
            ].map((item) => (
              <Button
                key={item.title}
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={item.action}
              >
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-xs">{item.title}</span>
              </Button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
