import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Search, Trash2, Tag, ExternalLink, Eye, Heart, Share2, TrendingUp, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface SavedTrend {
  id: number;
  trend_id: number;
  notes: string | null;
  tags: string[];
  created_at: string;
  trend: {
    id: number;
    platform_id: string;
    url: string;
    description: string;
    cover_url: string;
    author_username: string;
    stats: {
      playCount: number;
      diggCount: number;
      commentCount: number;
      shareCount: number;
    };
    uts_score: number;
  };
}

export function Saved() {
  const { user: _user } = useAuth();
  const [favorites, setFavorites] = useState<SavedTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const loadFavorites = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params: { page: number; per_page: number; tag?: string } = {
        page: pageNum,
        per_page: 12,
      };

      if (selectedTag && selectedTag !== 'all') {
        params.tag = selectedTag;
      }

      const response = await apiService.getFavorites(params);

      if (append) {
        setFavorites(prev => [...prev, ...response.items]);
      } else {
        setFavorites(response.items);
      }

      setHasMore(response.has_more);
      setTotal(response.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      toast.error('Failed to load saved videos');
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  const loadTags = useCallback(async () => {
    try {
      const tags = await apiService.getFavoriteTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, []);

  useEffect(() => {
    loadFavorites(1);
    loadTags();
  }, [loadFavorites, loadTags]);

  useEffect(() => {
    loadFavorites(1);
  }, [selectedTag, loadFavorites]);

  const handleDelete = async (favoriteId: number) => {
    try {
      await apiService.removeFavorite(favoriteId);
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      setTotal(prev => prev - 1);
      toast.success('Video removed from saved');
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      toast.error('Failed to remove video');
    } finally {
      setDeleteId(null);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-red-500 to-orange-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-blue-500 to-purple-500';
    return 'from-gray-400 to-gray-500';
  };

  const filteredFavorites = favorites.filter(fav => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      fav.trend.description?.toLowerCase().includes(query) ||
      fav.trend.author_username?.toLowerCase().includes(query) ||
      fav.notes?.toLowerCase().includes(query) ||
      fav.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-purple-600" />
            Saved Videos
          </h1>
          <p className="text-muted-foreground mt-1">
            {total} saved video{total !== 1 ? 's' : ''} in your collection
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-[180px]">
            <Tag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading && favorites.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : filteredFavorites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved videos yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchQuery || selectedTag !== 'all'
                ? 'No videos match your filters. Try adjusting your search.'
                : 'Start saving videos from Discover or Deep Analysis to build your collection.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFavorites.map((favorite) => (
              <Card
                key={favorite.id}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                  {favorite.trend.cover_url ? (
                    <img
                      src={favorite.trend.cover_url}
                      alt={favorite.trend.description}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-video.svg';
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-500">
                      <Bookmark className="h-16 w-16" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                  {/* UTS Score */}
                  {favorite.trend.uts_score > 0 && (
                    <Badge
                      className={cn(
                        "absolute top-2 left-2 text-white border-0 font-bold",
                        `bg-gradient-to-r ${getScoreColor(favorite.trend.uts_score)}`
                      )}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {favorite.trend.uts_score.toFixed(0)}
                    </Badge>
                  )}

                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(favorite.trend.url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-black/50 hover:bg-red-500/70 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(favorite.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Tags */}
                  {favorite.tags.length > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                      {favorite.tags.slice(0, 2).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-white/20 text-white backdrop-blur-sm"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {favorite.tags.length > 2 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-white/20 text-white backdrop-blur-sm"
                        >
                          +{favorite.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-3 space-y-2">
                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      {favorite.trend.author_username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium truncate">
                      @{favorite.trend.author_username || 'unknown'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {favorite.trend.description || 'No description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(favorite.trend.stats?.playCount || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(favorite.trend.stats?.diggCount || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {formatNumber(favorite.trend.stats?.shareCount || 0)}
                    </span>
                  </div>

                  {/* Notes */}
                  {favorite.notes && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 italic truncate">
                      Note: {favorite.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadFavorites(page + 1, true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from saved?</AlertDialogTitle>
            <AlertDialogDescription>
              This video will be removed from your saved collection. You can always save it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
