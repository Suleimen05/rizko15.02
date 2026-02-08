import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Search, Tag, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { VideoCard } from '@/components/VideoCard';
import type { TikTokVideo } from '@/types';

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
    play_addr?: string;  // Direct CDN video URL
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

  // Convert SavedTrend to TikTokVideo format for VideoCard
  const convertToTikTokVideo = (savedTrend: SavedTrend): TikTokVideo => {
    return {
      id: savedTrend.trend.platform_id,
      trend_id: savedTrend.trend_id,
      title: savedTrend.trend.description || '',
      description: savedTrend.trend.description || '',
      author: {
        id: savedTrend.trend.author_username || '',
        uniqueId: savedTrend.trend.author_username || '',
        nickname: savedTrend.trend.author_username || '',
        avatar: '',
        followerCount: 0,
        followingCount: 0,
        heartCount: 0,
        videoCount: 0,
        verified: false,
      },
      stats: {
        playCount: savedTrend.trend.stats?.playCount || 0,
        diggCount: savedTrend.trend.stats?.diggCount || 0,
        shareCount: savedTrend.trend.stats?.shareCount || 0,
        commentCount: savedTrend.trend.stats?.commentCount || 0,
      },
      video: {
        duration: 0,
        ratio: '9:16',
        cover: savedTrend.trend.cover_url || '',
        playAddr: savedTrend.trend.play_addr || '',  // Direct CDN URL for inline playback
        downloadAddr: '',
      },
      music: {
        id: '',
        title: '',
        authorName: '',
        original: false,
        playUrl: '',
      },
      hashtags: [],
      createdAt: savedTrend.created_at,
      uts_score: savedTrend.trend.uts_score,
      cover_url: savedTrend.trend.cover_url,
      url: savedTrend.trend.url,
      play_addr: savedTrend.trend.play_addr,  // Also on top level for VideoCard
      author_username: savedTrend.trend.author_username,
    };
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
          {/* Grid - Using VideoCard like Discover and Competitors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFavorites.map((favorite) => (
              <VideoCard
                key={favorite.id}
                video={convertToTikTokVideo(favorite)}
                mode="light"
                showStats
                size="medium"
              />
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
