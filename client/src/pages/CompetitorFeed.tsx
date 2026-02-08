import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Bell, Loader2, TrendingUp, Users, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompetitorVideoCard } from '@/components/CompetitorVideoCard';
// import { AIScriptGenerator } from '@/components/AIScriptGenerator'; // TODO: wire up
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

interface CompetitorProfile {
  username: string;
  nickname: string;
  avatar: string;
  bio: string;
  followerCount: number;
  videoCount: number;
  avgViews: number;
  engagementRate: number;
  tracking_since: string;
  last_checked: string;
}

interface CompetitorVideo {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  stats: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
    saveCount?: number;
  };
  posted_at: string;
  uts_score?: number;
  is_new?: boolean;
}

export function CompetitorFeed() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<CompetitorProfile | null>(null);
  const [videos, setVideos] = useState<CompetitorVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // const [selectedVideo, setSelectedVideo] = useState<CompetitorVideo | null>(null); // TODO: wire up AI script
  // const [showAIScript, setShowAIScript] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'trending'>('all');
  const [autoRefreshed, setAutoRefreshed] = useState(false);

  // Load competitor data
  useEffect(() => {
    if (!username) return;
    loadCompetitorData();
  }, [username]);

  // Auto-refresh if data is stale (no images loading)
  useEffect(() => {
    if (videos.length > 0 && !autoRefreshed) {
      // Check if any videos have thumbnail_url
      const hasValidThumbnails = videos.some(v => v.thumbnail_url);

      if (!hasValidThumbnails) {
        console.log('⚠️ No valid thumbnails detected - auto-refreshing competitor data...');
        setAutoRefreshed(true);
        handleRefresh();
      }
    }
  }, [videos, autoRefreshed]);

  const loadCompetitorData = async () => {
    if (!username) return;

    try {
      setIsLoading(true);

      // Get competitor feed from backend
      const response = await apiClient.get(`/competitors/${username}/feed`);

      // Profile data
      setProfile({
        username: response.data.profile.username,
        nickname: response.data.profile.nickname || response.data.profile.username,
        avatar: response.data.profile.avatar_url,
        bio: response.data.profile.bio || '',
        followerCount: response.data.profile.followers_count || 0,
        videoCount: response.data.profile.total_videos || 0,
        avgViews: response.data.profile.avg_views || 0,
        engagementRate: response.data.profile.engagement_rate || 0,
        tracking_since: response.data.profile.created_at,
        last_checked: response.data.profile.last_checked_at || new Date().toISOString(),
      });

      // Videos data
      const videosList = response.data.videos || [];

      // DEBUG: Check what API returned
      console.log('🔍 API Response videos count:', videosList.length);
      if (videosList.length > 0) {
        console.log('🔍 First video from API:', videosList[0]);
        console.log('🔍 First video thumbnail_url:', videosList[0].thumbnail_url);
        console.log('🔍 First video cover_url:', videosList[0].cover_url);
        console.log('🔍 Full API response:', response.data);
      }

      const mappedVideos = videosList.map((v: any) => ({
        id: v.id,
        title: v.title || v.description,
        description: v.description || '',
        thumbnail_url: v.thumbnail_url || v.cover_url,
        video_url: v.video_url || v.url,  // CDN video URL for playback (fallback to TikTok page)
        stats: {
          playCount: v.stats?.playCount || v.stats?.views || 0,
          diggCount: v.stats?.diggCount || v.stats?.likes || 0,
          commentCount: v.stats?.commentCount || v.stats?.comments || 0,
          shareCount: v.stats?.shareCount || v.stats?.shares || 0,
          saveCount: v.stats?.saveCount || v.stats?.bookmarks || 0,
        },
        posted_at: v.posted_at || v.created_at,
        uts_score: v.uts_score,
        is_new: v.is_new || false,
      }));

      // DEBUG: Check mapped videos
      if (mappedVideos.length > 0) {
        console.log('🔍 First mapped video:', mappedVideos[0]);
        console.log('🔍 First mapped thumbnail_url:', mappedVideos[0].thumbnail_url);
      }

      setVideos(mappedVideos);
    } catch (error: any) {
      console.error('Error loading competitor feed:', error);
      if (error.response?.status === 404) {
        toast.error(`Competitor @${username} not found`);
        navigate('/dashboard/competitors');
      } else {
        toast.error('Failed to load competitor feed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!username) return;

    try {
      setIsRefreshing(true);
      await apiClient.put(`/competitors/${username}/refresh`);
      toast.success('Refreshing competitor data...');

      // Reload after 2 seconds to give backend time to fetch
      setTimeout(() => {
        loadCompetitorData();
      }, 2000);
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh. Try again later.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveVideo = async (video: CompetitorVideo) => {
    try {
      // Save to favorites (reuse existing favorites API)
      await apiClient.post('/favorites/', {
        trend_id: parseInt(video.id),
        notes: `From competitor @${username}`,
        tags: ['competitor', username],
      });
      toast.success('Video saved to favorites!');
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.info('Video already in favorites');
      } else {
        toast.error('Failed to save video');
      }
    }
  };

  const handleGenerateScript = (_video: CompetitorVideo) => {
    // TODO: wire up with AI script generator
    toast.info('AI Script generation coming soon!');
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Don't use proxy - direct image loading works fine
  const getProxiedImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    return url;
  };

  // Filter videos
  const filteredVideos = videos.filter((video) => {
    if (filter === 'new') return video.is_new;
    if (filter === 'trending') return (video.uts_score || 0) >= 7;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Competitor not found</p>
        <Button onClick={() => navigate('/dashboard/competitors')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Competitors
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/competitors')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Competitors
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={profile.avatar ? getProxiedImageUrl(profile.avatar) : '/placeholder-avatar.svg'}
                alt={profile.username}
                className="h-24 w-24 md:h-32 md:w-32 rounded-full object-cover ring-4 ring-purple-600/20"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-avatar.svg';
                }}
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold">@{profile.username}</h1>
                {profile.nickname && profile.nickname !== profile.username && (
                  <p className="text-xl text-muted-foreground">{profile.nickname}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground max-w-2xl">{profile.bio}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Followers
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(profile.followerCount)}</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    Avg Views
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(profile.avgViews)}</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Videos
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(profile.videoCount)}</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Heart className="h-4 w-4" />
                    Engagement
                  </div>
                  <div className="text-2xl font-bold">{profile.engagementRate.toFixed(1)}%</div>
                </div>
              </div>

              {/* Tracking Info */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t text-sm text-muted-foreground">
                <span>✅ Tracking since {formatDate(profile.tracking_since)}</span>
                <span>•</span>
                <span>Last checked: {formatDate(profile.last_checked)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <Button variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {videos.filter((v) => v.is_new).length > 0 && (
        <Card className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-purple-600/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 text-white rounded-full p-2">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">New Activity!</p>
                  <p className="text-sm text-muted-foreground">
                    {videos.filter((v) => v.is_new).length} new videos in the last 24 hours
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('new')}
              >
                View New Videos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Recent Videos ({filteredVideos.length})
        </h2>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('new')}
          >
            🆕 New Only
          </Button>
          <Button
            variant={filter === 'trending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('trending')}
          >
            🔥 Trending
          </Button>
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos found</h3>
            <p className="text-muted-foreground">
              {filter === 'new'
                ? 'No new videos yet. Check back later!'
                : filter === 'trending'
                ? 'No trending videos at the moment.'
                : 'This competitor has no videos yet.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredVideos.map((video) => (
            <CompetitorVideoCard
              key={video.id}
              video={video}
              onSave={handleSaveVideo}
              onGenerateScript={handleGenerateScript}
            />
          ))}
        </div>
      )}

      {/* AI Script Generator Modal - TODO: wire up with useAIScriptGenerator hook */}
    </div>
  );
}
