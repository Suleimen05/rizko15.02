import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  Link2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Иконки платформ
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Mock данные видео (потом заменим на Official API)
const mockVideos = [
  {
    id: '1',
    thumbnail: 'https://picsum.photos/seed/vid1/300/400',
    title: 'Morning workout routine 💪',
    views: 125000,
    likes: 8200,
    comments: 423,
    shares: 156,
    engagement: 6.5,
    postedAt: '2024-01-28',
    platform: 'tiktok',
  },
  {
    id: '2',
    thumbnail: 'https://picsum.photos/seed/vid2/300/400',
    title: 'Healthy breakfast ideas',
    views: 89000,
    likes: 5100,
    comments: 287,
    shares: 98,
    engagement: 5.7,
    postedAt: '2024-01-25',
    platform: 'tiktok',
  },
  {
    id: '3',
    thumbnail: 'https://picsum.photos/seed/vid3/300/400',
    title: '5 min ab workout 🔥',
    views: 234000,
    likes: 15300,
    comments: 892,
    shares: 445,
    engagement: 6.5,
    postedAt: '2024-01-20',
    platform: 'tiktok',
  },
  {
    id: '4',
    thumbnail: 'https://picsum.photos/seed/vid4/300/400',
    title: 'My supplement stack',
    views: 67000,
    likes: 4200,
    comments: 312,
    shares: 87,
    engagement: 6.3,
    postedAt: '2024-01-18',
    platform: 'tiktok',
  },
  {
    id: '5',
    thumbnail: 'https://picsum.photos/seed/vid5/300/400',
    title: 'Full body stretch routine',
    views: 156000,
    likes: 9800,
    comments: 567,
    shares: 234,
    engagement: 6.3,
    postedAt: '2024-01-15',
    platform: 'tiktok',
  },
  {
    id: '6',
    thumbnail: 'https://picsum.photos/seed/vid6/300/400',
    title: 'Protein shake recipe',
    views: 98000,
    likes: 6100,
    comments: 398,
    shares: 156,
    engagement: 6.2,
    postedAt: '2024-01-12',
    platform: 'tiktok',
  },
];

// Форматирование чисел
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Относительное время
const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

type Platform = 'tiktok' | 'instagram' | 'youtube';

interface ConnectedAccount {
  platform: Platform;
  username: string;
  connected: boolean;
}

export function MyVideosPage() {
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('tiktok');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock: подключенные аккаунты (потом из API)
  const [connectedAccounts] = useState<ConnectedAccount[]>([
    { platform: 'tiktok', username: '@fitgirl_kz', connected: true },
    { platform: 'instagram', username: '', connected: false },
    { platform: 'youtube', username: '', connected: false },
  ]);

  const currentAccount = connectedAccounts.find(a => a.platform === selectedPlatform);
  const hasConnectedAccount = currentAccount?.connected;

  // Обновить данные
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Fetch from Official API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  // Статистика
  const totalViews = mockVideos.reduce((sum, v) => sum + v.views, 0);
  const totalLikes = mockVideos.reduce((sum, v) => sum + v.likes, 0);
  const avgEngagement = mockVideos.reduce((sum, v) => sum + v.engagement, 0) / mockVideos.length;

  const platformConfig = {
    tiktok: { name: 'TikTok', icon: TikTokIcon, color: 'bg-black' },
    instagram: { name: 'Instagram', icon: InstagramIcon, color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    youtube: { name: 'YouTube', icon: YouTubeIcon, color: 'bg-red-600' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-7 w-7" />
            My Posts
          </h1>
          <p className="text-muted-foreground">
            View and analyze your post performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Platform Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {(() => {
                  const config = platformConfig[selectedPlatform];
                  const Icon = config.icon;
                  return (
                    <>
                      <div className={cn('p-1 rounded', config.color, 'text-white')}>
                        <Icon />
                      </div>
                      {config.name}
                      <ChevronDown className="h-4 w-4" />
                    </>
                  );
                })()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(platformConfig).map(([key, config]) => {
                const Icon = config.icon;
                const account = connectedAccounts.find(a => a.platform === key);
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSelectedPlatform(key as Platform)}
                    className="gap-2"
                  >
                    <div className={cn('p-1 rounded', config.color, 'text-white')}>
                      <Icon />
                    </div>
                    {config.name}
                    {!account?.connected && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        Not connected
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || !hasConnectedAccount}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {!hasConnectedAccount ? (
        /* No Account Connected */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No {platformConfig[selectedPlatform].name} account connected</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Connect your {platformConfig[selectedPlatform].name} account to see your videos and analytics here.
            </p>
            <Button onClick={() => navigate('/dashboard/connect-accounts')}>
              <Link2 className="h-4 w-4 mr-2" />
              Connect Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Video className="h-4 w-4" />
                  <span className="text-sm">Total Videos</span>
                </div>
                <p className="text-2xl font-bold">{mockVideos.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Total Views</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(totalViews)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">Total Likes</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(totalLikes)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Avg Engagement</span>
                </div>
                <p className="text-2xl font-bold">{avgEngagement.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Videos Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Your Videos</CardTitle>
              <CardDescription>
                Showing {mockVideos.length} videos from your {platformConfig[selectedPlatform].name} account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockVideos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-muted rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[9/16] relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>

                      {/* Stats Row */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(video.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(video.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(video.comments)}
                        </span>
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-xs">
                          {video.engagement}% eng
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getRelativeTime(video.postedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
