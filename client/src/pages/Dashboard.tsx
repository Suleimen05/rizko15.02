import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Users,
  Eye,
  Heart,
  Video,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Loader2,
  Mail,
  Settings,
  ChevronRight,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';
import { REVIEW_MODE } from '@/config/features';

// Platform icons
const platforms = [
  { id: 'tiktok', name: 'TikTok', icon: '🎵', available: true },
  { id: 'instagram', name: 'Insta', icon: '📸', available: false },
  { id: 'youtube', name: 'YouTube', icon: '📺', available: false },
  { id: 'twitter', name: 'Twitter', icon: '𝕏', available: false },
  { id: 'snapchat', name: 'Snapchat', icon: '👻', available: false },
];

interface UserAccount {
  id: number;
  platform: string;
  username: string;
  display_name: string;
  avatar_url: string;
  followers_count: number;
  total_videos: number;
  avg_views: number;
  engagement_rate: number;
  recent_videos: any[];
  last_synced_at: string;
}

interface TopVideo {
  id: string;
  cover_url: string;
  views: number;
  stats: {
    diggCount: number;
  };
  uts_score: number;
  url: string;
}

// Mock data for demo purposes
const MOCK_ACCOUNT: UserAccount = {
  id: 1,
  platform: 'tiktok',
  username: 'fitgirl_kz',
  display_name: 'Айгерим | Фитнес 💪',
  avatar_url: 'https://p16-sign-sg.tiktokcdn.com/aweme/100x100/tos-alisg-avt-0068/7c1f8cc0a1b9d4e5f6a7b8c9d0e1f2a3.jpeg',
  followers_count: 125400,
  total_videos: 287,
  avg_views: 48500,
  engagement_rate: 8.7,
  recent_videos: [
    {
      id: 'v1',
      cover_url: 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/oMBAEbdBzGIEQfRvpAL9fyAJB2gIGCfeCaAn1A',
      views: 1250000,
      stats: { diggCount: 98000 },
      uts_score: 87,
      url: 'https://tiktok.com/@fitgirl_kz/video/1',
    },
    {
      id: 'v2',
      cover_url: 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/oQEABdEbGzfIRvBpyACAL9JfgAnGICBeC1aM2n',
      views: 890000,
      stats: { diggCount: 72000 },
      uts_score: 82,
      url: 'https://tiktok.com/@fitgirl_kz/video/2',
    },
    {
      id: 'v3',
      cover_url: 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/CfAEBdGbIzRvBAL9pyAJf2gnGICeCaoM1nB2E',
      views: 654000,
      stats: { diggCount: 54000 },
      uts_score: 76,
      url: 'https://tiktok.com/@fitgirl_kz/video/3',
    },
    {
      id: 'v4',
      cover_url: 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/dEABGbIzRvBpyACL9f2gJnGIeCaCaoM1nB2EfA',
      views: 432000,
      stats: { diggCount: 38000 },
      uts_score: 71,
      url: 'https://tiktok.com/@fitgirl_kz/video/4',
    },
    {
      id: 'v5',
      cover_url: 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/EABGbIzRvBpyCL9f2gJnGIeCaCaoM1nB2EfAdB',
      views: 287000,
      stats: { diggCount: 24000 },
      uts_score: 65,
      url: 'https://tiktok.com/@fitgirl_kz/video/5',
    },
  ],
  last_synced_at: new Date().toISOString(),
};

// Set to true to use mock data (no backend calls)
const USE_MOCK_DATA = true;

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<UserAccount[]>(USE_MOCK_DATA ? [MOCK_ACCOUNT] : []);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [isLoading, setIsLoading] = useState(!USE_MOCK_DATA);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // ===== REVIEW MODE DASHBOARD =====
  // Simplified dashboard for API Review (TikTok, Meta, Google)
  // Design based on screenshot: Stats cards + AI Insights + Get Started
  if (REVIEW_MODE) {
    // TODO: Get real connected accounts count from API/context
    const connectedCount = 0;
    const totalPlatforms = 3;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your personal analytics hub with AI-powered insights
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Connected */}
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

          {/* Followers */}
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

          {/* Total Views */}
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

          {/* Videos */}
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

        {/* AI Insights Section */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h3 className="font-semibold text-lg">AI Insights</h3>
            </div>
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              Powered by Gemini
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insight 1 - Connect */}
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Connect Social Accounts</span>
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5">Priority</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Linking accounts will unlock cross-promotion and analytics insights for optimized growth.
                  </p>
                </div>
              </div>
            </div>

            {/* Insight 2 - Analyze */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <span className="font-medium">Analyze Competitors</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Identify top-performing content in your niche and adapt those themes to attract viewers.
                  </p>
                </div>
              </div>
            </div>

            {/* Insight 3 - Test */}
            <div className="p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Test Posting Times</span>
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5">Priority</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Since there's no data, experiment with different posting times daily for a week, then analyze peak performance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Get Started Card */}
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
  // ===== END REVIEW MODE DASHBOARD =====

  // Load user accounts
  useEffect(() => {
    if (!USE_MOCK_DATA) {
      loadAccounts();
    }
  }, []);

  const loadAccounts = async () => {
    if (USE_MOCK_DATA) {
      setAccounts([MOCK_ACCOUNT]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // For now, we'll use competitors API as a proxy for user accounts
      // In future, create dedicated /api/accounts endpoint
      const response = await apiClient.get('/competitors/', {
        params: { active_only: true },
      });

      // Filter to show only user's "primary" accounts (tagged as "my_account")
      const myAccounts = response.data.items.filter(
        (c: any) => c.tags?.includes('my_account')
      );
      setAccounts(myAccounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newUsername.trim()) {
      toast.error('Введите имя пользователя');
      return;
    }

    try {
      setIsAdding(true);
      const cleanUsername = newUsername.toLowerCase().trim().replace('@', '');

      if (USE_MOCK_DATA) {
        // Mock добавление
        await new Promise(resolve => setTimeout(resolve, 1500));
        const newMockAccount: UserAccount = {
          id: Date.now(),
          platform: 'tiktok',
          username: cleanUsername,
          display_name: cleanUsername,
          avatar_url: 'https://p16-sign-sg.tiktokcdn.com/aweme/100x100/tos-alisg-avt-0068/default.jpeg',
          followers_count: Math.floor(Math.random() * 100000) + 10000,
          total_videos: Math.floor(Math.random() * 200) + 50,
          avg_views: Math.floor(Math.random() * 50000) + 5000,
          engagement_rate: Math.random() * 10 + 2,
          recent_videos: [],
          last_synced_at: new Date().toISOString(),
        };
        setAccounts(prev => [...prev, newMockAccount]);
        toast.success(`Аккаунт @${cleanUsername} добавлен!`);
        setNewUsername('');
        setShowAddModal(false);
        return;
      }

      // First search for the account
      const searchResponse = await apiClient.get(`/competitors/search/${cleanUsername}`);
      const searchData = searchResponse.data;

      // Add as competitor with special tag
      await apiClient.post('/competitors/', {
        username: cleanUsername,
        notes: 'My TikTok account',
        tags: ['my_account'],
        search_data: {
          avatar: searchData.avatar,
          follower_count: searchData.follower_count,
          video_count: searchData.video_count,
          nickname: searchData.nickname,
        },
      });

      toast.success(`Аккаунт @${cleanUsername} добавлен!`);
      setNewUsername('');
      setShowAddModal(false);
      loadAccounts();
    } catch (error: any) {
      console.error('Failed to add account:', error);
      if (error.response?.status === 400) {
        toast.error('Аккаунт уже добавлен');
      } else if (error.response?.status === 404) {
        toast.error('Аккаунт не найден в TikTok');
      } else {
        toast.error('Не удалось добавить аккаунт');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleSync = async (username: string) => {
    try {
      setIsSyncing(true);

      if (USE_MOCK_DATA) {
        // Mock синхронизация
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Аккаунт синхронизирован!');
        return;
      }

      await apiClient.put(`/competitors/${username}/refresh`);
      toast.success('Аккаунт синхронизирован!');
      loadAccounts();
    } catch (error) {
      console.error('Failed to sync:', error);
      toast.error('Не удалось синхронизировать');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const currentAccount = accounts.find((a) => a.platform === selectedPlatform) || accounts[0];

  // Calculate mock metrics for comparison (in future - get from API)
  const nicheAvg = {
    followers: 85000,
    engagement: 6.2,
    avgViews: 32000,
    postFreq: 5,
    growth: 18,
  };

  const getRank = (value: number, avg: number): string => {
    const ratio = value / avg;
    if (ratio >= 1.5) return 'Top 15%';
    if (ratio >= 1.2) return 'Top 20%';
    if (ratio >= 1.0) return 'Top 25%';
    if (ratio >= 0.8) return 'Top 40%';
    return 'Top 60%';
  };

  // No accounts state
  if (!isLoading && accounts.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your social media growth and get AI recommendations
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="flex gap-2 flex-wrap">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => platform.available && setSelectedPlatform(platform.id)}
              disabled={!platform.available}
              className={cn(
                'gap-2',
                !platform.available && 'opacity-50'
              )}
            >
              <span>{platform.icon}</span>
              <span>{platform.name}</span>
              {!platform.available && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  Soon
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Empty State */}
        <Card className="p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Add Your TikTok Account</h2>
            <p className="text-muted-foreground mb-6">
              Connect your TikTok account to track growth, get AI recommendations,
              and compare your performance with others in your niche.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <Input
                placeholder="@username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
              />
              <Button
                onClick={handleAddAccount}
                disabled={isAdding}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your social media growth and get AI recommendations
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAddModal(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 flex-wrap">
        {platforms.map((platform) => {
          const hasAccount = accounts.some((a) => a.platform === platform.id);
          return (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => platform.available && setSelectedPlatform(platform.id)}
              disabled={!platform.available}
              className={cn('gap-2', !platform.available && 'opacity-50')}
            >
              <span>{platform.icon}</span>
              <span>{platform.name}</span>
              {hasAccount && <span className="text-green-500">✓</span>}
              {!platform.available && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  Soon
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {currentAccount ? (
        <>
          {/* Profile Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={currentAccount.avatar_url || '/avatar-placeholder.svg'}
                  alt={currentAccount.username}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-purple-500/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">@{currentAccount.username}</h2>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {currentAccount.display_name || currentAccount.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(currentAccount.followers_count)} followers · {currentAccount.total_videos} videos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Health Score */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">78</div>
                  <p className="text-xs text-muted-foreground">Health Score</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(currentAccount.username)}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              label="Followers"
              value={formatNumber(currentAccount.followers_count)}
              change={12.3}
              icon={Users}
            />
            <MetricCard
              label="Avg Views"
              value={formatNumber(currentAccount.avg_views || 0)}
              change={5.1}
              icon={Eye}
            />
            <MetricCard
              label="Engagement"
              value={`${(currentAccount.engagement_rate || 0).toFixed(1)}%`}
              change={-2.1}
              icon={Heart}
            />
            <MetricCard
              label="Avg Likes"
              value={formatNumber(Math.round((currentAccount.avg_views || 0) * 0.08))}
              change={8.4}
              icon={Heart}
            />
            <MetricCard
              label="Videos"
              value={currentAccount.total_videos?.toString() || '0'}
              change={null}
              subtext="+15/мес"
              icon={Video}
            />
          </div>

          {/* Tasks for Today */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" />
                Do Today
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>→ {user?.email?.slice(0, 10)}***</span>
              </div>
            </div>
            <div className="space-y-2">
              <TaskItem
                number={1}
                icon="📹"
                text='Post a video with trend "gym motivation"'
                action="View examples"
              />
              <TaskItem
                number={2}
                icon="💬"
                text="Reply to 10 comments (engagement is dropping!)"
              />
              <TaskItem
                number={3}
                icon="🎵"
                text='Use sound "Eye of the Tiger remix" - trending in your niche'
              />
            </div>
          </Card>

          {/* Health Score & Niche Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Health Score */}
            <Card className="p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Health Score
              </h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-3xl font-bold">78%</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Good
                  </Badge>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div className="space-y-2">
                <HealthItem label="Content" value={92} status="excellent" />
                <HealthItem label="Engagement" value={78} status="good" />
                <HealthItem label="Posting" value={65} status="warning" />
                <HealthItem label="Growth" value={54} status="warning" />
              </div>
            </Card>

            {/* Niche Comparison */}
            <Card className="p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                You vs Niche "Fitness"
              </h3>
              <div className="space-y-3">
                <CompareRow
                  label="Followers"
                  you={formatNumber(currentAccount.followers_count)}
                  avg={formatNumber(nicheAvg.followers)}
                  rank={getRank(currentAccount.followers_count, nicheAvg.followers)}
                />
                <CompareRow
                  label="Engagement"
                  you={`${(currentAccount.engagement_rate || 8.5).toFixed(1)}%`}
                  avg={`${nicheAvg.engagement}%`}
                  rank={getRank(currentAccount.engagement_rate || 8.5, nicheAvg.engagement)}
                />
                <CompareRow
                  label="Avg Views"
                  you={formatNumber(currentAccount.avg_views || 45000)}
                  avg={formatNumber(nicheAvg.avgViews)}
                  rank={getRank(currentAccount.avg_views || 45000, nicheAvg.avgViews)}
                />
                <CompareRow
                  label="Post Freq."
                  you="3/week"
                  avg={`${nicheAvg.postFreq}/week`}
                  rank="Top 60%"
                />
              </div>
            </Card>
          </div>

          {/* Top Videos */}
          {currentAccount.recent_videos && currentAccount.recent_videos.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  🔥 Top Videos
                </h3>
                <Button variant="ghost" size="sm" className="gap-1">
                  All videos <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {currentAccount.recent_videos
                  .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
                  .slice(0, 5)
                  .map((video: TopVideo, index: number) => (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[9/16] rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={video.cover_url || '/video-placeholder.svg'}
                        alt={`Video ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2 text-white text-xs">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(video.views || 0)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatNumber(video.stats?.diggCount || 0)}
                          </div>
                          <Badge className="mt-1 text-[10px]">
                            UTS: {(video.uts_score || 0).toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded">
                        #{index + 1}
                      </div>
                    </a>
                  ))}
              </div>
            </Card>
          )}

          {/* AI Growth Plan */}
          <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                🤖 AI Growth Plan
              </h3>
              <Button variant="outline" size="sm" className="gap-2">
                💬 Chat with AI
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Based on your profile (Fitness, 18-25 F, humor style) AI recommends:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">📅 THIS WEEK:</p>
                <ul className="text-sm space-y-1">
                  <li>Mon - Motivation video</li>
                  <li>Wed - "What I eat in a day"</li>
                  <li>Fri - Funny gym video</li>
                  <li>Sun - Q&A with followers</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">🎵 SOUNDS FOR YOU:</p>
                <ul className="text-sm space-y-1">
                  <li>• "Eye of the Tiger remix"</li>
                  <li>• "Level Up - Ciara"</li>
                  <li>• "original - @gymshark"</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">🏷️ HASHTAGS:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">#fitnesshome</Badge>
                  <Badge variant="secondary">#weightloss</Badge>
                  <Badge variant="secondary">#workout</Badge>
                  <Badge variant="secondary">#fitnesskz</Badge>
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        // No account for selected platform
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No {selectedPlatform} account connected. Add one to see analytics!
          </p>
        </Card>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add TikTok Account</h2>
            <Input
              placeholder="@username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={isAdding}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Account
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper Components

function MetricCard({
  label,
  value,
  change,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: number | null;
  subtext?: string;
  icon: any;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change !== null ? (
        <p
          className={cn(
            'text-sm flex items-center gap-1',
            change >= 0 ? 'text-green-500' : 'text-red-500'
          )}
        >
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {change >= 0 ? '+' : ''}
          {change}%
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{subtext}</p>
      )}
    </Card>
  );
}

function TaskItem({
  number,
  icon,
  text,
  action,
}: {
  number: number;
  icon: string;
  text: string;
  action?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
      <span className="text-muted-foreground">{number}.</span>
      <span>{icon}</span>
      <span className="flex-1 text-sm">{text}</span>
      {action && (
        <Button variant="link" size="sm" className="text-purple-500 p-0 h-auto">
          {action} →
        </Button>
      )}
    </div>
  );
}

function HealthItem({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: 'excellent' | 'good' | 'warning';
}) {
  const statusConfig = {
    excellent: { icon: '✅', color: 'text-green-500' },
    good: { icon: '✅', color: 'text-green-500' },
    warning: { icon: '⚠️', color: 'text-yellow-500' },
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span>{statusConfig[status].icon}</span>
        <span>{label}:</span>
        <span className={statusConfig[status].color}>
          {status === 'excellent' ? 'Excellent' : status === 'good' ? 'Good' : 'Average'} ({value}%)
        </span>
      </span>
    </div>
  );
}

function CompareRow({
  label,
  you,
  avg,
  rank,
}: {
  label: string;
  you: string;
  avg: string;
  rank: string;
}) {
  return (
    <div className="flex items-center text-sm">
      <span className="w-24 text-muted-foreground">{label}</span>
      <span className="w-20 font-medium">{you}</span>
      <span className="w-20 text-muted-foreground">{avg}</span>
      <Badge variant="outline" className="ml-auto text-xs">
        {rank}
      </Badge>
    </div>
  );
}
