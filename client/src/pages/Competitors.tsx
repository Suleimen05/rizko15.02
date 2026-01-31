import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Competitor } from '@/types';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

interface CompetitorCardProps {
  competitor: Competitor;
  onRemove: (competitor: Competitor) => void;
  onViewDetails: (competitor: Competitor) => void;
}

function CompetitorCard({ competitor, onRemove, onViewDetails }: CompetitorCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => onViewDetails(competitor)}>
      <CardContent className="p-4">
        {/* Avatar + Username */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <img
              src={competitor.avatar || '/placeholder-avatar.svg'}
              alt={competitor.username}
              className="h-12 w-12 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-avatar.svg';
              }}
            />
            {/* TikTok badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background border border-background flex items-center justify-center">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">@{competitor.username}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(competitor.followerCount)} followers
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Videos:</span>
            <span className="font-medium">{competitor.videoCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Avg Views:</span>
            <span className="font-medium">{formatNumber(competitor.avgViews)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(competitor);
            }}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(competitor);
            }}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Competitors() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
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
      })));
    } catch (error) {
      console.error('Error loading competitors:', error);
      toast.error('Failed to load competitors');
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

    // Убираем @ если есть
    return trimmed.replace('@', '');
  };

  // Поиск канала
  const handleSearchChannel = async () => {
    if (!searchQuery.trim()) return;

    const cleanUsername = extractUsername(searchQuery);

    try {
      setIsSearching(true);
      setSearchResults(null);
      const response = await apiClient.get(`/competitors/search/${cleanUsername}`);
      setSearchResults(response.data);
    } catch (error: any) {
      console.error('Search error:', error);
      if (error.response?.status === 404) {
        toast.error(`Channel @${cleanUsername} not found`);
      } else {
        toast.error('Search failed. Try again.');
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
        notes: '',
        search_data: {
          avatar: channel.avatar,
          follower_count: channel.follower_count,
          video_count: channel.video_count,
          nickname: channel.nickname || channel.username
        }
      });
      toast.success(`@${channel.username} added to your list`);
      setSearchQuery('');
      setSearchResults(null);
      loadCompetitors(); // Обновить список
    } catch (error: any) {
      console.error('Add error:', error);
      if (error.response?.status === 400) {
        toast.error(`@${channel.username} already in your list`);
      } else {
        toast.error('Failed to add channel');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Удалить канал
  const handleRemoveChannel = async (competitor: Competitor) => {
    try {
      await apiClient.delete(`/competitors/${competitor.username}`);
      toast.success(`@${competitor.username} removed`);
      loadCompetitors(); // Обновить список
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove channel');
    }
  };

  const handleViewDetails = (competitor: Competitor) => {
    // Navigate to details page or open modal
    toast.info(`Viewing details for @${competitor.username}`);
  };

  const filteredCompetitors = competitors;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
            <Badge variant="secondary" className="text-sm">
              {competitors.length} channels
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Search and track competitor channels
          </p>
        </div>
      </div>

      {/* Search Box */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search & Add Channels
        </h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter @username..."
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
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">Search Result:</p>
            <div className="flex items-center gap-4">
              <img
                src={searchResults.avatar || '/placeholder-avatar.svg'}
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
                  {(searchResults.follower_count || 0).toLocaleString()} followers • 
                  {searchResults.video_count || 0} videos
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
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* My Competitors Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">My Competitors</h2>
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
            <h3 className="text-lg font-semibold mb-2">No competitors yet</h3>
            <p className="text-muted-foreground mb-4">
              Search for channels above to add them to your list
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
