import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, X, ChevronDown, Lock, Sparkles, Zap, Clock, TrendingUp, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { VideoCard } from '@/components/VideoCard';
import { AIScriptGenerator } from '@/components/AIScriptGenerator';
import { UpgradeModal } from '@/components/UpgradeModal';
import { DeepAnalyzeProgress } from '@/components/DeepAnalyzeProgress';
import { cn } from '@/lib/utils';
import { useSearchWithFilters } from '@/hooks/useTikTok';
import { useAIScriptGenerator } from '@/hooks/useTikTok';
import { useAuth } from '@/contexts/AuthContext';
import type { TikTokVideo, SearchFilters, AnalysisMode } from '@/types';

export function Discover() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TikTokVideo | null>(null);
  const [showAIScript, setShowAIScript] = useState(false);
  
  // Analysis Mode (Light vs Deep)
  const [analyzeMode, setAnalyzeMode] = useState<AnalysisMode>('light');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeepProgress, setShowDeepProgress] = useState(false);
  const userTier = user?.subscription || 'free';
  const canUseDeep = ['pro', 'agency'].includes(userTier);
  
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: (searchParams.get('sort') as SearchFilters['sortBy']) || 'viral',
    dateRange: (searchParams.get('time') as SearchFilters['dateRange']) || '7d',
    minViews: searchParams.get('minViews') ? Number(searchParams.get('minViews')) : undefined,
    maxViews: searchParams.get('maxViews') ? Number(searchParams.get('maxViews')) : undefined,
    minDuration: searchParams.get('minDuration') ? Number(searchParams.get('minDuration')) : undefined,
    maxDuration: searchParams.get('maxDuration') ? Number(searchParams.get('maxDuration')) : undefined,
  });

  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Search history - stored in localStorage
  const [searchHistory, setSearchHistory] = useState<Array<{
    query: string;
    timestamp: number;
    mode: AnalysisMode;
    resultsCount?: number;
  }>>([]);
  
  // Recent videos - last searched videos stored in localStorage
  const [recentVideos, setRecentVideos] = useState<TikTokVideo[]>([]);
  
  // Load search history and recent videos from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('trendscout_search_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setSearchHistory(parsed.slice(0, 10));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
    
    const savedVideos = localStorage.getItem('trendscout_recent_videos');
    if (savedVideos) {
      try {
        const parsed = JSON.parse(savedVideos);
        setRecentVideos(parsed.slice(0, 6)); // Keep last 6 videos for performance
      } catch (e) {
        console.error('Failed to parse recent videos:', e);
      }
    }
  }, []);
  
  // Save search to history
  const saveToHistory = (query: string, mode: AnalysisMode, resultsCount?: number) => {
    const newEntry = {
      query: query.trim(),
      timestamp: Date.now(),
      mode,
      resultsCount,
    };
    
    // Remove duplicates and add new entry at the beginning
    const updated = [
      newEntry,
      ...searchHistory.filter(h => h.query.toLowerCase() !== query.toLowerCase())
    ].slice(0, 10);
    
    setSearchHistory(updated);
    localStorage.setItem('trendscout_search_history', JSON.stringify(updated));
  };
  
  // Save recent videos to localStorage (limited data for performance)
  const saveRecentVideos = (newVideos: TikTokVideo[]) => {
    if (newVideos.length > 0) {
      // Only keep essential fields to reduce localStorage size
      const minimalVideos = newVideos.slice(0, 6).map(v => ({
        id: v.id,
        trend_id: v.trend_id,  // Database ID for favorites
        title: v.title,
        description: v.description?.slice(0, 200), // Truncate description
        author: { uniqueId: v.author.uniqueId, nickname: v.author.nickname, avatar: v.author.avatar },
        stats: v.stats,
        video: { cover: v.video.cover, duration: v.video.duration },
        viralScore: v.viralScore,
        uts_score: v.uts_score,
        engagementRate: v.engagementRate,
        cover_url: v.cover_url,
      }));
      
      // Merge with existing, remove duplicates
      const existingIds = new Set(recentVideos.map(v => v.id));
      const uniqueNew = minimalVideos.filter(v => !existingIds.has(v.id));
      const updated = [...uniqueNew, ...recentVideos].slice(0, 6);
      
      setRecentVideos(updated as TikTokVideo[]);
      localStorage.setItem('trendscout_recent_videos', JSON.stringify(updated));
    }
  };
  
  // Clear search history and recent videos
  const clearHistory = () => {
    setSearchHistory([]);
    setRecentVideos([]);
    localStorage.removeItem('trendscout_search_history');
    localStorage.removeItem('trendscout_recent_videos');
  };
  
  const { videos, loading, refetch } = useSearchWithFilters({
    ...filters,
    niche: searchQuery || searchKeyword,
    is_deep: analyzeMode === 'deep',
    user_tier: userTier,
  });
  
  const {
    script,
    loading: scriptLoading,
    generate,
  } = useAIScriptGenerator();

  // Update URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('q', searchQuery);
    if (filters.sortBy) newParams.set('sort', filters.sortBy);
    if (filters.dateRange) newParams.set('time', filters.dateRange);
    if (filters.minViews) newParams.set('minViews', filters.minViews.toString());
    if (filters.maxViews) newParams.set('maxViews', filters.maxViews.toString());
    if (filters.minDuration) newParams.set('minDuration', filters.minDuration.toString());
    if (filters.maxDuration) newParams.set('maxDuration', filters.maxDuration.toString());
    setSearchParams(newParams);
  }, [searchQuery, filters, setSearchParams]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    
    setSearchKeyword(searchQuery);
    
    // Show Deep Progress if Deep mode is selected
    if (analyzeMode === 'deep') {
      setShowDeepProgress(true);
    }
    
    try {
      // Передаём keyword напрямую чтобы избежать race condition с React state
      const results = await refetch(searchQuery);
      
      // Save to search history
      saveToHistory(searchQuery, analyzeMode, results?.length);
      
      // Save videos to recent
      if (results && results.length > 0) {
        saveRecentVideos(results);
      }
    } finally {
      // Hide Deep Progress when done
      setShowDeepProgress(false);
    }
  };
  
  // Quick search from history
  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setSearchKeyword(query);
    refetch(query);
    saveToHistory(query, analyzeMode);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'viral',
      dateRange: '7d',
    });
    setSearchQuery('');
  };

  const handleAnalyzeModeChange = (mode: AnalysisMode) => {
    if (mode === 'deep' && !canUseDeep) {
      setShowUpgradeModal(true);
      return;
    }
    setAnalyzeMode(mode);
  };

  const handleGenerateScript = async (video: TikTokVideo) => {
    setSelectedVideo(video);
    setShowAIScript(true);
    await generate(
      video.description || video.title || '',
      {
        playCount: video.stats.playCount,
        diggCount: video.stats.diggCount,
        commentCount: video.stats.commentCount,
        shareCount: video.stats.shareCount,
      },
      'engaging',
      'general',
      Math.floor((video.video?.duration || 30000) / 1000)
    );
  };

  const handleRegenerateScript = async () => {
    if (selectedVideo) {
      await generate(
        selectedVideo.description || selectedVideo.title || '',
        {
          playCount: selectedVideo.stats.playCount,
          diggCount: selectedVideo.stats.diggCount,
          commentCount: selectedVideo.stats.commentCount,
          shareCount: selectedVideo.stats.shareCount,
        },
        'engaging',
        'general',
        Math.floor((selectedVideo.video?.duration || 30000) / 1000)
      );
    }
  };

  const sortOptions = [
    { id: 'viral', label: 'Viral Score', icon: '🔥' },
    { id: 'views', label: 'Most Views', icon: '👁️' },
    { id: 'engagement', label: 'Engagement', icon: '❤️' },
    { id: 'recent', label: 'Most Recent', icon: '🕐' },
  ];

  const dateRangeOptions = [
    { id: '24h', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
  ];

  const activeFilterCount = [
    filters.minViews,
    filters.maxViews,
    filters.minDuration,
    filters.maxDuration,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-7 w-7" />
            Discover Videos
          </h1>
          <p className="text-muted-foreground">
            Search and filter through millions of viral videos
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-accent')}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-purple-600 text-white">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Analysis Mode Selector */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Analysis Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={analyzeMode} onValueChange={handleAnalyzeModeChange}>
            <div className="grid gap-3">
              {/* Light Analyze */}
              <div
                className={cn(
                  "flex items-center space-x-3 space-y-0 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-muted/50",
                  analyzeMode === 'light' && "border-blue-500 bg-blue-500/5"
                )}
                onClick={() => handleAnalyzeModeChange('light')}
              >
                <RadioGroupItem value="light" id="light" />
                <Label
                  htmlFor="light"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold">Light Analyze</span>
                    <Badge variant="outline" className="text-xs">FREE</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fast results with basic metrics (views, likes, engagement rate) - like other tools
                  </p>
                </Label>
              </div>

              {/* Deep Analyze */}
              <div
                className={cn(
                  "flex items-center space-x-3 space-y-0 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-muted/50 relative",
                  analyzeMode === 'deep' && "border-purple-500 bg-gradient-to-br from-purple-500/10 to-pink-500/10",
                  !canUseDeep && "opacity-75"
                )}
                onClick={() => handleAnalyzeModeChange('deep')}
              >
                <RadioGroupItem value="deep" id="deep" disabled={!canUseDeep} />
                <Label
                  htmlFor="deep"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="font-semibold">Deep Analyze</span>
                    <Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                      PRO
                    </Badge>
                    {!canUseDeep && <Lock className="h-4 w-4 text-muted-foreground ml-auto" />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    6-layer UTS breakdown, AI clustering, velocity tracking, saturation indicator
                  </p>
                  {!canUseDeep && (
                    <p className="text-xs text-purple-600 font-medium mt-1">
                      Unlock for $49/mo - Unique mathematical analysis no competitor has
                    </p>
                  )}
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by keyword, hashtag, or creator..."
          className="pl-10 pr-24"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
          onClick={handleSearch}
        >
          Search
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Advanced Filters
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sort By */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-background border border-input rounded-md px-3 py-2 text-sm"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-background border border-input rounded-md px-3 py-2 text-sm"
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                >
                  {dateRangeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Views Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Min Views</label>
              <select
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                value={filters.minViews || ''}
                onChange={(e) => handleFilterChange('minViews', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Any</option>
                <option value="10000">10K+</option>
                <option value="50000">50K+</option>
                <option value="100000">100K+</option>
                <option value="500000">500K+</option>
                <option value="1000000">1M+</option>
                <option value="10000000">10M+</option>
              </select>
            </div>

            {/* Duration Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <select
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                value={filters.maxDuration || ''}
                onChange={(e) => handleFilterChange('maxDuration', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Any</option>
                <option value="15">Under 15s</option>
                <option value="30">Under 30s</option>
                <option value="60">Under 1min</option>
                <option value="180">Under 3min</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => refetch(searchQuery || searchKeyword)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </Card>
      )}

      {/* AI Script Generator */}
      {showAIScript && (
        <AIScriptGenerator
          video={selectedVideo}
          script={script}
          loading={scriptLoading}
          onGenerate={async () => {
            if (selectedVideo) {
              await handleGenerateScript(selectedVideo);
            }
          }}
          onRegenerate={handleRegenerateScript}
        />
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {loading ? 'Loading...' : `${videos.length} videos found`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <Badge variant="secondary">
            {sortOptions.find(s => s.id === filters.sortBy)?.label}
          </Badge>
        </div>
      </div>

      {/* Deep Analyze Progress - shows ABOVE cards like AI Script Generator */}
      {showDeepProgress && (
        <DeepAnalyzeProgress isActive={true} />
      )}

      {/* Videos Grid */}
      {loading && analyzeMode !== 'deep' ? (
        // Light Analyze Loading - простой skeleton
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 && !loading ? (
        <div className="space-y-6">
          {/* Recent Videos Section - показываем карточки как после поиска */}
          {recentVideos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-lg">Recent Videos</h3>
                  <Badge variant="secondary">{recentVideos.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
              {/* Same grid as search results */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recentVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    mode={analyzeMode}
                    onGenerateScript={handleGenerateScript}
                    showStats
                    size="medium"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Search Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search History */}
            {searchHistory.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Search History</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs group hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleHistoryClick(item.query)}
                    >
                      <Hash className="h-3 w-3 mr-1 opacity-50" />
                      {item.query}
                      {item.mode === 'deep' && (
                        <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0">PRO</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Trending Suggestions */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <h3 className="font-medium text-sm">Trending</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['fitness', 'cooking', 'dance', 'fashion', 'comedy', 'beauty'].map((tag) => (
                  <Button
                    key={tag}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleHistoryClick(tag)}
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          {/* Empty State - only show if no recent videos and user searched */}
          {searchKeyword && recentVideos.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos found for "{searchKeyword}"</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters to find more content
                </p>
                <Button onClick={clearFilters}>Clear Filters</Button>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{
                animationDelay: `${index * 50}ms`,
                animationDuration: '500ms',
                animationFillMode: 'backwards',
              }}
            >
              <VideoCard
                video={video}
                mode={analyzeMode}
                onGenerateScript={handleGenerateScript}
                showStats
                size="medium"
              />
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && videos.length > 0 && (
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => refetch(searchQuery || searchKeyword)}
          >
            Load More Videos
          </Button>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Deep Analyze"
      />
    </div>
  );
}
