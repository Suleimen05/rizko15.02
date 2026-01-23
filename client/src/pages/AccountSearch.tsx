import { useState } from 'react';
import { Search, Users, UserPlus, TrendingUp, Eye, Video, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import type { ProfileReport } from '@/types';
import { toast } from 'sonner';

interface SearchResult {
  username: string;
  report: ProfileReport | null;
  loading: boolean;
  error: string | null;
}

export function AccountSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const extractUsername = (input: string): string => {
    // Remove whitespace
    let cleaned = input.trim();

    // If it's a URL, extract username from it
    if (cleaned.includes('tiktok.com') || cleaned.includes('://')) {
      try {
        // Extract username from URL patterns:
        // https://www.tiktok.com/@username
        // https://www.tiktok.com/@username?...
        // https://www.tiktok.com/@username/video/...
        const match = cleaned.match(/@([a-zA-Z0-9._]+)/);
        if (match && match[1]) {
          return match[1].toLowerCase();
        }

        // Try to extract from /username pattern
        const pathMatch = cleaned.match(/tiktok\.com\/([a-zA-Z0-9._]+)/);
        if (pathMatch && pathMatch[1] && !pathMatch[1].startsWith('@')) {
          return pathMatch[1].toLowerCase();
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }

    // Otherwise, just clean the username
    return cleaned.toLowerCase().replace('@', '').replace(/[^a-z0-9._]/g, '');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a username or TikTok URL to search');
      return;
    }

    const cleanUsername = extractUsername(searchQuery);

    // Check if already searched
    const existingResult = searchResults.find(r => r.username === cleanUsername);
    if (existingResult) {
      toast.info('This account is already in the results');
      return;
    }

    // Add placeholder result
    const newResult: SearchResult = {
      username: cleanUsername,
      report: null,
      loading: true,
      error: null,
    };

    setSearchResults([newResult, ...searchResults]);
    setSearching(true);

    try {
      const report = await apiService.getProfileReport(cleanUsername);

      setSearchResults(prev =>
        prev.map(r =>
          r.username === cleanUsername
            ? { ...r, report, loading: false }
            : r
        )
      );

      toast.success(`Found account: @${cleanUsername}`);
    } catch (error) {
      console.error('Error searching account:', error);

      setSearchResults(prev =>
        prev.map(r =>
          r.username === cleanUsername
            ? { ...r, loading: false, error: 'Account not found or error loading data' }
            : r
        )
      );

      toast.error('Failed to load account data');
    } finally {
      setSearching(false);
      setSearchQuery('');
    }
  };

  const handleAddAsCompetitor = async (username: string) => {
    // Find the report data that's already loaded
    const result = searchResults.find(r => r.username === username);

    if (!result || !result.report) {
      toast.error('No data available for this account');
      return;
    }

    try {
      // Get existing competitors from localStorage
      const storedCompetitors = localStorage.getItem('competitors');
      const competitors = storedCompetitors ? JSON.parse(storedCompetitors) : [];

      // Check if already added
      if (competitors.some((c: any) => c.username === username)) {
        toast.info(`@${username} is already in competitors list`);
        return;
      }

      // Transform ProfileReport to Competitor format without making new API call
      const newCompetitor = {
        id: `competitor_${Date.now()}`,
        username: result.report.author.username,
        nickname: result.report.author.nickname,
        avatar: result.report.author.avatar,
        followerCount: result.report.author.followers,
        videoCount: result.report.full_feed.length,
        avgViews: result.report.metrics.avg_views,
        engagementRate: result.report.metrics.engagement_rate,
        topVideos: result.report.top_3_hits,
        growthTrend: result.report.metrics.status === 'Rising' ? 'up' : 'stable',
        lastActivity: new Date().toISOString(),
      };

      // Save to localStorage
      competitors.push(newCompetitor);
      localStorage.setItem('competitors', JSON.stringify(competitors));

      toast.success(`Added @${username} to competitors list`);
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast.error('Failed to add as competitor');
    }
  };

  const removeResult = (username: string) => {
    setSearchResults(prev => prev.filter(r => r.username !== username));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-7 w-7" />
            Account Search
          </h1>
          <p className="text-muted-foreground">
            Search and analyze TikTok accounts by username
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Search for Accounts</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter TikTok username (e.g., @username or username)..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={searching}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Search Results ({searchResults.length})
          </h2>
          {searchResults.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchResults([])}
            >
              Clear All
            </Button>
          )}
        </div>

        {searchResults.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No searches yet</h3>
              <p className="text-muted-foreground">
                Enter a TikTok username above to analyze an account
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {searchResults.map((result) => (
              <SearchResultCard
                key={result.username}
                result={result}
                onAddAsCompetitor={handleAddAsCompetitor}
                onRemove={removeResult}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  onAddAsCompetitor: (username: string) => void;
  onRemove: (username: string) => void;
  formatNumber: (num: number) => string;
}

function SearchResultCard({ result, onAddAsCompetitor, onRemove, formatNumber }: SearchResultCardProps) {
  const [showAllVideos, setShowAllVideos] = useState(false);

  if (result.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.error || !result.report) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">@{result.username}</h3>
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onRemove(result.username)}
            >
              ×
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const report = result.report;
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('rising')) return 'bg-green-100 text-green-700 border-green-300';
    if (statusLower.includes('falling')) return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('rising')) return TrendingUp;
    return BarChart3;
  };

  const StatusIcon = getStatusIcon(report.metrics.status);
  const videosToShow = showAllVideos ? report.full_feed : report.full_feed.slice(0, 6);

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-2">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={report.author.avatar || '/avatar-placeholder.svg'}
              alt={report.author.nickname}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-purple-100"
            />
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2">
              <Video className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold">{report.author.nickname}</h3>
                <p className="text-muted-foreground">@{report.author.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onAddAsCompetitor(result.username)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add to Competitors
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onRemove(result.username)}
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3 mb-4">
              <Badge className={cn('flex items-center gap-1.5 px-3 py-1', getStatusColor(report.metrics.status))}>
                <StatusIcon className="h-4 w-4" />
                {report.metrics.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Efficiency: {report.metrics.efficiency_score.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                Viral Lift: {report.metrics.avg_viral_lift.toFixed(1)}x
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Followers</p>
                </div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatNumber(report.author.followers)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Avg Views</p>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatNumber(report.metrics.avg_views)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Engagement</p>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {report.metrics.engagement_rate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 p-4 rounded-xl border border-pink-200 dark:border-pink-800">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Videos</p>
                </div>
                <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">
                  {report.full_feed.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Section */}
        {report.full_feed.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">
                Recent Videos ({report.full_feed.length})
              </h4>
              {report.full_feed.length > 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllVideos(!showAllVideos)}
                >
                  {showAllVideos ? 'Show Less' : `Show All ${report.full_feed.length}`}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {videosToShow.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-[9/16] rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-purple-500 transition-all shadow-md hover:shadow-xl"
                >
                  <img
                    src={video.cover_url || '/video-placeholder.svg'}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-white text-xs font-semibold">
                        <Eye className="h-3 w-3" />
                        {formatNumber(video.views)}
                      </div>
                      <div className="text-white text-xs font-medium bg-purple-600/90 px-2 py-0.5 rounded inline-block">
                        UTS: {video.uts_score.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  {/* Top corner badge for top 3 */}
                  {report.top_3_hits.some(top => top.id === video.id) && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      TOP
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
