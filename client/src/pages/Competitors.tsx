import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Competitor } from '@/types';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { proxyAvatarUrl } from '@/utils/imageProxy';
import { useProject } from '@/contexts/ProjectContext';
import i18n from '@/lib/i18n';

interface CompetitorCardProps {
  competitor: Competitor;
  onRemove: (competitor: Competitor) => void;
  onViewDetails: (competitor: Competitor) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function CompetitorCard({ competitor, onRemove, onViewDetails, t }: CompetitorCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return t('timeAgoMinutes', { count: diffMinutes });
    if (diffHours < 24) return t('timeAgoHours', { count: diffHours });
    return t('timeAgoDays', { count: Math.floor(diffHours / 24) });
  };

  // Mock: check if competitor has new videos (you'll get this from backend later)
  const hasNewVideos = competitor.lastActivity &&
    new Date(competitor.lastActivity).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  return (
    <Card
      className="group hover:shadow-lg hover:border-purple-600/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
      onClick={() => onViewDetails(competitor)}
    >
      {/* New Videos Indicator */}
      {hasNewVideos && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-red-500 text-white text-xs animate-pulse">
            {t('newBadge')}
          </Badge>
        </div>
      )}

      <CardContent className="p-4">
        {/* Avatar + Username */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <img
              src={proxyAvatarUrl(competitor.avatar)}
              alt={competitor.username}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-purple-600/20 group-hover:ring-purple-600/50 transition-all"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-avatar.svg';
              }}
            />
            {/* Platform badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-background border-2 border-background flex items-center justify-center">
              {competitor.platform === 'instagram' ? (
                <span className="text-base">📸</span>
              ) : (
                <svg className="w-3.5 h-3.5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate text-base">@{competitor.username}</p>
            {competitor.nickname && competitor.nickname !== competitor.username && (
              <p className="text-xs text-muted-foreground truncate">{competitor.nickname}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-bold text-sm">{formatNumber(competitor.followerCount)}</div>
            <div className="text-muted-foreground">{t('statsFollowers')}</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-bold text-sm">{competitor.videoCount}</div>
            <div className="text-muted-foreground">{t('statsVideos')}</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-bold text-sm">{formatNumber(competitor.avgViews)}</div>
            <div className="text-muted-foreground">{t('statsAvgViews')}</div>
          </div>
        </div>

        {/* Status */}
        <div className="mb-3 p-2 bg-muted/30 rounded text-xs">
          {hasNewVideos ? (
            <div className="flex items-center gap-1 text-red-500 font-medium">
              <span>🆕</span>
              <span>{t('newVideo', { time: formatTimeAgo(competitor.lastActivity) })}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>✅</span>
              <span>{t('upToDate', { time: formatTimeAgo(competitor.lastActivity) })}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(competitor);
            }}
          >
            {t('viewFeed')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(t('removeConfirm', { username: competitor.username }))) {
                onRemove(competitor);
              }
            }}
          >
            {t('untrack')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Competitors() {
  const { t } = useTranslation('competitors');
  const { activeProject } = useProject();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchPlatform, setSearchPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
  const [_showFilters, _setShowFilters] = useState(false);
  const [_filterPlatform, _setFilterPlatform] = useState<'all' | 'tiktok' | 'instagram'>('all');
  const [_filterSort, _setFilterSort] = useState<'recent' | 'followers' | 'engagement'>('recent');

  // Загрузить список competitors из API
  const loadCompetitors = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/competitors/');
      // Handle both paginated and array response
      const items = response.data.items || response.data;
      setCompetitors(items.map((c: any) => ({
        id: c.id.toString(),
        username: c.username,
        nickname: c.display_name,
        avatar: c.avatar_url || '/placeholder-avatar.svg',
        followerCount: c.followers_count,
        videoCount: c.total_videos,
        avgViews: c.avg_views,
        engagementRate: c.engagement_rate,
        topVideos: [],
        growthTrend: 'stable' as const,
        lastActivity: c.updated_at,
        platform: c.platform || 'tiktok', // Add platform field
      })));
    } catch (error) {
      console.error('Error loading competitors:', error);
      toast.error(i18n.t('toasts:competitors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузить при монтировании
  useEffect(() => {
    loadCompetitors();
  }, []);

  // Извлечь username из URL или вернуть как есть
  const extractUsername = (input: string): string => {
    const trimmed = input.trim();

    // Если это TikTok URL, извлекаем username
    const tiktokMatch = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    if (tiktokMatch) {
      return tiktokMatch[1];
    }

    // Если это Instagram URL, извлекаем username
    // Поддерживаем: instagram.com/username, instagram.com/username/, instagram.com/username/reels/
    const instagramMatch = trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (instagramMatch) {
      return instagramMatch[1];
    }

    // Убираем @ и слэши если есть
    return trimmed.replace('@', '').replace(/\/$/, '');
  };

  // Поиск канала
  const handleSearchChannel = async () => {
    if (!searchQuery.trim()) return;

    const cleanUsername = extractUsername(searchQuery);

    try {
      setIsSearching(true);
      setSearchResults(null);
      const response = await apiClient.get(`/competitors/search/${cleanUsername}?platform=${searchPlatform}`);
      setSearchResults(response.data);
    } catch (error: any) {
      console.error('Search error:', error);
      if (error.response?.status === 404) {
        const platform = searchPlatform === 'instagram' ? 'Instagram' : 'TikTok';
        toast.error(i18n.t('toasts:competitors.channelNotFound', { platform, username: cleanUsername }));
      } else {
        toast.error(i18n.t('toasts:competitors.searchFailed'));
      }
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Добавить канал в список (с оптимизацией - передаем данные поиска)
  const handleAddChannel = async (channel: any) => {
    try {
      setIsAdding(true);
      // Передаем search_data чтобы избежать повторного запроса к Apify
      await apiClient.post('/competitors/', {
        username: channel.username,
        platform: channel.platform || searchPlatform,
        notes: '',
        search_data: {
          avatar: channel.avatar,
          follower_count: channel.follower_count,
          video_count: channel.video_count,
          nickname: channel.nickname || channel.username
        },
        ...(activeProject?.id && { project_id: activeProject.id }),
      });
      toast.success(i18n.t('toasts:competitors.addSuccess', { username: channel.username }));
      setSearchQuery('');
      setSearchResults(null);
      loadCompetitors(); // Обновить список
    } catch (error: any) {
      console.error('Add error:', error);
      if (error.response?.status === 400) {
        toast.error(i18n.t('toasts:competitors.alreadyExists', { username: channel.username }));
      } else {
        toast.error(i18n.t('toasts:competitors.addFailed'));
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Удалить канал
  const handleRemoveChannel = async (competitor: Competitor) => {
    try {
      await apiClient.delete(`/competitors/${competitor.username}`);
      toast.success(i18n.t('toasts:competitors.removeSuccess', { username: competitor.username }));
      loadCompetitors(); // Обновить список
    } catch (error) {
      console.error('Remove error:', error);
      toast.error(i18n.t('toasts:competitors.removeFailed'));
    }
  };

  const handleViewDetails = (competitor: Competitor) => {
    // Navigate to feed page
    window.location.href = `/dashboard/competitors/${competitor.username}/feed`;
  };

  const filteredCompetitors = competitors;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
            <Badge variant="secondary" className="text-sm">
              {t('channelsCount', { count: competitors.length })}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {t('pageDescription')}
          </p>
        </div>
      </div>

      {/* Search Box */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('searchTitle')}
        </h3>

        {/* Platform Selector */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={searchPlatform === 'tiktok' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchPlatform('tiktok')}
            className="gap-2"
          >
            🎵 TikTok
          </Button>
          <Button
            variant={searchPlatform === 'instagram' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchPlatform('instagram')}
            className="gap-2"
          >
            📸 Instagram
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlatform === 'instagram' ? t('searchPlaceholderInstagram') : t('searchPlaceholderTiktok')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchChannel()}
              disabled={isSearching}
            />
          </div>
          <Button
            onClick={handleSearchChannel}
            disabled={!searchQuery.trim() || isSearching}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('searching')}
              </>
            ) : (
              t('searchButton')
            )}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">{t('searchResult')}</p>
            <div className="flex items-center gap-4">
              <img
                src={proxyAvatarUrl(searchResults.avatar)}
                alt={searchResults.username}
                className="h-12 w-12 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-avatar.svg';
                }}
              />
              <div className="flex-1">
                <p className="font-semibold">@{searchResults.username}</p>
                <p className="text-sm text-muted-foreground">
                  {(searchResults.follower_count || 0).toLocaleString()} {t('followers')} •
                  {searchResults.video_count || 0} {t('videos')}
                </p>
              </div>
              <Button
                onClick={() => handleAddChannel(searchResults)}
                disabled={isAdding}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('adding')}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('add')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* My Competitors Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">{t('myCompetitors')}</h2>
      </div>

      {/* Competitors Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : filteredCompetitors.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('emptyDescription')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCompetitors.map((competitor) => (
            <CompetitorCard
              key={competitor.id}
              competitor={competitor}
              onRemove={handleRemoveChannel}
              onViewDetails={handleViewDetails}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
