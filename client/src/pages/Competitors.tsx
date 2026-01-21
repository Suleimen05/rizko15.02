import { useState } from 'react';
import { Users, UserPlus, TrendingUp, TrendingDown, BarChart3, Eye, Video, Calendar, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import type { Competitor, TikTokVideo } from '@/types';

// Mock data
const mockCompetitors: Competitor[] = [
  {
    id: '1',
    username: 'viralcreator1',
    nickname: 'Viral Creator',
    avatar: '/avatar-placeholder.svg',
    followerCount: 2500000,
    videoCount: 342,
    avgViews: 450000,
    engagementRate: 8.5,
    topVideos: [] as TikTokVideo[],
    growthTrend: 'up',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '2',
    username: 'edutainment',
    nickname: 'EduTainment',
    avatar: '/avatar-placeholder.svg',
    followerCount: 1800000,
    videoCount: 567,
    avgViews: 320000,
    engagementRate: 12.3,
    topVideos: [] as TikTokVideo[],
    growthTrend: 'up',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '3',
    username: 'biztips',
    nickname: 'Business Tips',
    avatar: '/avatar-placeholder.svg',
    followerCount: 890000,
    videoCount: 189,
    avgViews: 180000,
    engagementRate: 6.8,
    topVideos: [] as TikTokVideo[],
    growthTrend: 'stable',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

interface CompetitorCardProps {
  competitor: Competitor;
  isSelected: boolean;
  onSelect: (competitor: Competitor) => void;
  onRemove: (id: string) => void;
}

function CompetitorCard({ competitor, isSelected, onSelect, onRemove }: CompetitorCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const growthIcon = competitor.growthTrend === 'up' ? TrendingUp : competitor.growthTrend === 'down' ? TrendingDown : Minus;
  const GrowthIcon = growthIcon;
  const growthColor = competitor.growthTrend === 'up' ? 'text-green-600' : competitor.growthTrend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-lg',
        isSelected && 'ring-2 ring-purple-500'
      )}
      onClick={() => onSelect(competitor)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={competitor.avatar}
              alt={competitor.nickname}
              className="h-16 w-16 rounded-full object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
              competitor.growthTrend === 'up' ? 'bg-green-500' : 
              competitor.growthTrend === 'down' ? 'bg-red-500' : 'bg-gray-500'
            }`}>
              <GrowthIcon className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">{competitor.nickname}</h3>
                <p className="text-sm text-muted-foreground">@{competitor.username}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(competitor.id);
                }}
              >
                ×
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-lg font-bold">{formatNumber(competitor.followerCount)}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="text-lg font-bold">{formatNumber(competitor.avgViews)}</p>
                <p className="text-xs text-muted-foreground">Avg Views</p>
              </div>
              <div>
                <p className="text-lg font-bold">{competitor.engagementRate}%</p>
                <p className="text-xs text-muted-foreground">Engagement</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className={growthColor}>
                <GrowthIcon className="h-3 w-3 mr-1" />
                {competitor.growthTrend}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last post: {new Date(competitor.lastActivity).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompetitorDetailsProps {
  competitor: Competitor | null;
}

function CompetitorDetails({ competitor }: CompetitorDetailsProps) {
  if (!competitor) {
    return (
      <Card className="sticky top-24 p-12">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Select a competitor to view detailed analytics
          </p>
        </div>
      </Card>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Mock video data
  const topVideos: TikTokVideo[] = [
    {
      id: 'vid1',
      title: 'Viral video title here',
      description: 'Description',
      author: {
        id: competitor.id,
        uniqueId: competitor.username,
        nickname: competitor.nickname,
        avatar: competitor.avatar,
        followerCount: competitor.followerCount,
        followingCount: 500,
        heartCount: competitor.followerCount * 10,
        videoCount: competitor.videoCount,
        verified: true,
      },
      stats: {
        playCount: competitor.avgViews * 2,
        diggCount: competitor.avgViews * 0.1,
        shareCount: competitor.avgViews * 0.02,
        commentCount: competitor.avgViews * 0.05,
      },
      video: {
        duration: 15000,
        ratio: '9:16',
        cover: '/video-placeholder.svg',
        playAddr: '',
        downloadAddr: '',
      },
      music: {
        id: 'music1',
        title: 'Original Sound',
        authorName: 'Artist',
        original: true,
        playUrl: '',
      },
      hashtags: [],
      createdAt: new Date().toISOString(),
      engagementRate: competitor.engagementRate,
    },
  ];

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <div className="flex items-center gap-4">
          <img
            src={competitor.avatar}
            alt={competitor.nickname}
            className="h-16 w-16 rounded-full object-cover"
          />
          <div>
            <CardTitle>{competitor.nickname}</CardTitle>
            <p className="text-muted-foreground">@{competitor.username}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <p className="text-2xl font-bold">{formatNumber(competitor.followerCount)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <Video className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Videos</p>
            </div>
            <p className="text-2xl font-bold">{competitor.videoCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Avg Views</p>
            </div>
            <p className="text-2xl font-bold">{formatNumber(competitor.avgViews)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-pink-500" />
              <p className="text-sm text-muted-foreground">Engagement</p>
            </div>
            <p className="text-2xl font-bold">{competitor.engagementRate}%</p>
          </div>
        </div>

        {/* Growth Chart Placeholder */}
        <div>
          <h4 className="font-semibold mb-3">Growth Trend</h4>
          <div className="h-32 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Follower growth chart</p>
            </div>
          </div>
        </div>

        {/* Top Videos */}
        <div>
          <h4 className="font-semibold mb-3">Top Performing Videos</h4>
          <div className="space-y-3">
            {topVideos.map((video) => (
              <div key={video.id} className="flex gap-3 p-3 rounded-lg bg-muted">
                <div className="w-20 h-28 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    src={video.video.cover}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-2">{video.title}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(video.stats.playCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {formatNumber(video.stats.diggCount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div>
          <h4 className="font-semibold mb-3">Recent Activity</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Last post: {new Date(competitor.lastActivity).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Growth trend: {competitor.growthTrend}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Competitors() {
  const [competitors, setCompetitors] = useState<Competitor[]>(mockCompetitors);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCompetitor = async (username: string) => {
    if (!username.trim()) return;
    
    try {
      // Use backend API to get competitor data
      const spyData = await apiService.spyCompetitor(username);
      
      const newCompetitor: Competitor = {
        id: Date.now().toString(),
        username: spyData.username,
        nickname: spyData.channel_data.nickName || spyData.username,
        avatar: spyData.channel_data.avatarThumb || '/avatar-placeholder.svg',
        followerCount: spyData.channel_data.fans || 0,
        videoCount: spyData.channel_data.videos || 0,
        avgViews: spyData.metrics.avg_views || 0,
        engagementRate: spyData.metrics.engagement_rate || 0,
        topVideos: spyData.top_3_hits.map((v: any) => ({
          id: v.id,
          title: v.title || 'No title',
          description: v.title || '',
          author: {
            id: `user_${v.author.username}`,
            uniqueId: v.author.username,
            nickname: v.author.username,
            avatar: v.author.avatar || '',
            followerCount: v.author.followers || 0,
            followingCount: 0,
            heartCount: 0,
            videoCount: 0,
            verified: false,
          },
          stats: {
            playCount: v.views || 0,
            diggCount: v.stats.diggCount || 0,
            shareCount: v.stats.shareCount || 0,
            commentCount: v.stats.commentCount || 0,
            saveCount: 0,
          },
          video: {
            duration: 0,
            ratio: '9:16',
            cover: v.cover_url || '',
            playAddr: v.url || '',
            downloadAddr: '',
          },
          music: {
            id: '',
            title: 'Original Sound',
            authorName: 'Unknown',
            original: true,
            playUrl: '',
          },
          hashtags: [],
          createdAt: new Date(v.uploaded_at * 1000).toISOString(),
          viralScore: v.uts_score,
          uts_score: v.uts_score,
          cover_url: v.cover_url,
          url: v.url,
        })),
        growthTrend: 'stable',
        lastActivity: new Date().toISOString(),
      };
      setCompetitors([...competitors, newCompetitor]);
      setShowAddForm(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to add competitor:', error);
      alert('Failed to add competitor. Please check the username and try again.');
    }
  };

  const handleRemoveCompetitor = (id: string) => {
    setCompetitors(competitors.filter(c => c.id !== id));
    if (selectedCompetitor?.id === id) {
      setSelectedCompetitor(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7" />
            Competitor Analysis
          </h1>
          <p className="text-muted-foreground">
            Track and analyze your competitors' performance
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Competitor
        </Button>
      </div>

      {/* Add Competitor Form */}
      {showAddForm && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Add New Competitor</h3>
          <div className="flex gap-3">
            <Input
              placeholder="Enter TikTok username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor(searchQuery)}
            />
            <Button onClick={() => handleAddCompetitor(searchQuery)}>
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setSearchQuery('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitor List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Tracked Competitors ({competitors.length})
            </h2>
            <Badge variant="secondary">
              {competitors.filter(c => c.growthTrend === 'up').length} growing
            </Badge>
          </div>

          {competitors.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No competitors tracked</h3>
                <p className="text-muted-foreground mb-4">
                  Add competitors to track their performance and discover their strategies
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Competitor
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {competitors.map((competitor) => (
                <CompetitorCard
                  key={competitor.id}
                  competitor={competitor}
                  isSelected={selectedCompetitor?.id === competitor.id}
                  onSelect={setSelectedCompetitor}
                  onRemove={handleRemoveCompetitor}
                />
              ))}
            </div>
          )}
        </div>

        {/* Competitor Details */}
        <div className="lg:col-span-1">
          <CompetitorDetails competitor={selectedCompetitor} />
        </div>
      </div>
    </div>
  );
}
