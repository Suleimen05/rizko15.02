import { useState, useEffect, useCallback } from 'react';
import type { TikTokVideo, Hashtag, TrendAnalysis, AIScript, Competitor, DashboardStats, SearchFilters, Trend, ProfileReport, CompetitorData } from '@/types';
import { apiService } from '@/services/api';

export function useTrendingVideos(region = 'US', count = 30) {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.searchTrendingVideos(region);
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending videos');
    } finally {
      setLoading(false);
    }
  }, [region, count]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}

export function useTrendingHashtags(region = 'US', count = 50) {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHashtags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getTrendingHashtags();
      setHashtags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending hashtags');
    } finally {
      setLoading(false);
    }
  }, [region, count]);

  useEffect(() => {
    fetchHashtags();
  }, [fetchHashtags]);

  return { hashtags, loading, error, refetch: fetchHashtags };
}

export function useVideoSearch(hashtag: string, count = 50) {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!hashtag.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.searchByHashtag(hashtag);
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search videos');
    } finally {
      setLoading(false);
    }
  }, [hashtag, count]);

  useEffect(() => {
    search();
  }, [search]);

  return { videos, loading, error, search };
}

export function useVideoDetails(videoId: string) {
  const [video, setVideo] = useState<TikTokVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) return;

      try {
        setLoading(true);
        const data = await apiService.getVideoDetails(videoId);
        setVideo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch video details');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  return { video, loading, error };
}

export function useUserProfile(username: string) {
  const [profile, setProfile] = useState<Competitor | null>(null);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);
        const [profileData, videosData] = await Promise.all([
          apiService.getUserProfile(username),
          apiService.getUserVideos(username),
        ]);
        setProfile(profileData);
        setVideos(videosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  return { profile, videos, loading, error };
}

export function useTrendAnalysis(hashtag: string) {
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!hashtag.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.analyzeTrend(hashtag);
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze trend');
    } finally {
      setLoading(false);
    }
  }, [hashtag]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  return { analysis, loading, error, analyze };
}

export function useAIScriptGenerator() {
  const [script, setScript] = useState<AIScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    video_description: string,
    video_stats: {
      playCount: number;
      diggCount: number;
      commentCount: number;
      shareCount: number;
    },
    tone: string = 'engaging',
    niche: string = 'general',
    duration_seconds: number = 30
  ) => {
    if (!video_description.trim()) {
      setError('Video description is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generateAIScript(
        video_description,
        video_stats,
        tone,
        niche,
        duration_seconds
      );
      setScript(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI script');
    } finally {
      setLoading(false);
    }
  }, []);

  return { script, loading, error, generate };
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

export function useSearchWithFilters(filters: SearchFilters & { 
  is_deep?: boolean; 
  user_tier?: string;
}) {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('light');
  const [clusters, setClusters] = useState<any[]>([]);

  // search принимает keyword напрямую чтобы избежать race condition с React state
  const search = useCallback(async (keyword?: string) => {
    // Используем переданный keyword или берём из filters.niche
    const searchTerm = keyword || filters.niche;
    
    // Don't search if no keyword/niche provided
    if (!searchTerm || !searchTerm.trim()) {
      setVideos([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use backend API for search with Light/Deep mode
      // NO artificial delays - show real progress only
      const result = await apiService.searchTrends({
        target: searchTerm,
        mode: 'keywords',
        is_deep: filters.is_deep || false,
        user_tier: filters.user_tier || 'pro',
      });
      
      setMode(result.mode || 'light');
      setClusters(result.clusters || []);

      // Convert trends to TikTokVideos (with Deep Analyze fields if available)
      const converted = result.items.map((trend: any) => ({
        id: trend.id || trend.platform_id,  // platform_id for video display
        // Database ID for favorites - trend_id from deep mode, or numeric id from cached results
        trend_id: trend.trend_id || (typeof trend.id === 'number' ? trend.id : null),
        title: trend.description || 'No description',
        description: trend.description || '',
        author: {
          id: `user_${trend.author_username}`,
          uniqueId: trend.author_username,
          nickname: trend.author_username,
          avatar: '',
          followerCount: 0,
          followingCount: 0,
          heartCount: 0,
          videoCount: 0,
          verified: false,
        },
        stats: {
          playCount: trend.stats?.playCount || 0,
          diggCount: trend.stats?.diggCount || 0,
          shareCount: trend.stats?.shareCount || 0,
          commentCount: trend.stats?.commentCount || 0,
          saveCount: trend.stats?.saveCount || 0,
        },
        video: {
          duration: 0,
          ratio: '9:16',
          cover: trend.cover_url || '',
          playAddr: trend.url || '',
          downloadAddr: '',
        },
        music: {
          id: trend.music_id || '',
          title: trend.music_title || 'Original Sound',
          authorName: 'Unknown',
          original: true,
          playUrl: '',
        },
        hashtags: [],
        createdAt: new Date().toISOString(),
        // Light mode returns viralScore, Deep mode returns uts_score
        viralScore: trend.viralScore || trend.uts_score || 0,
        uts_score: trend.uts_score || trend.viralScore || 0,
        engagementRate: trend.engagementRate || 0,
        cover_url: trend.cover_url,
        url: trend.url,
        author_username: trend.author_username,
        // ✅ DEEP ANALYZE FIELDS (only present in deep mode)
        uts_breakdown: trend.uts_breakdown || null,
        saturation_score: trend.saturation_score,
        cascade_count: trend.cascade_count,
        cascade_score: trend.cascade_score,
        velocity_score: trend.velocity_score,
        cluster_id: trend.cluster_id,
      }));

      let filtered = [...converted];

      // Apply filters
      if (filters.minViews) {
        filtered = filtered.filter(v => v.stats.playCount >= filters.minViews!);
      }
      if (filters.maxViews) {
        filtered = filtered.filter(v => v.stats.playCount <= filters.maxViews!);
      }
      if (filters.minDuration) {
        filtered = filtered.filter(v => v.video.duration >= filters.minDuration! * 1000);
      }
      if (filters.maxDuration) {
        filtered = filtered.filter(v => v.video.duration <= filters.maxDuration! * 1000);
      }

      // Sort
      if (filters.sortBy === 'views') {
        filtered.sort((a, b) => b.stats.playCount - a.stats.playCount);
      } else if (filters.sortBy === 'engagement') {
        filtered.sort((a, b) => ((b as any).engagementRate || 0) - ((a as any).engagementRate || 0));
      } else if (filters.sortBy === 'viral') {
        filtered.sort((a, b) => (b.uts_score || b.viralScore || 0) - (a.uts_score || a.viralScore || 0));
      }

      setVideos(filtered);
      return filtered; // Return results for saving to history
    } catch (err: any) {
      if (err.isUpgradeRequired) {
        // Let the component handle upgrade modal
        throw err;
      }
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters.niche, filters.sortBy, filters.dateRange, filters.minViews, filters.maxViews, filters.minDuration, filters.maxDuration, filters.is_deep, filters.user_tier]);

  // REMOVED auto-search on mount to prevent infinite loop
  // Users must click "Search" or "Apply Filters" button

  return { videos, loading, error, mode, clusters, refetch: search };
}

// New hook for Deep Scan (using backend API)
export function useDeepScan(keyword: string, mode: 'keywords' | 'username' = 'keywords', isDeep = true) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!keyword.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const result = await apiService.searchTrends({
        target: keyword,
        mode,
        is_deep: isDeep,
        rescan_hours: 24,
      });
      setTrends(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deep scan failed');
    } finally {
      setLoading(false);
    }
  }, [keyword, mode, isDeep]);

  return { trends, loading, error, search };
}

// New hook for Competitor Spy (using backend API)
export function useCompetitorSpy(username: string) {
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spy = useCallback(async () => {
    if (!username.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.spyCompetitor(username);
      setCompetitorData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spy competitor');
    } finally {
      setLoading(false);
    }
  }, [username]);

  return { competitorData, loading, error, spy };
}

// New hook for Profile Report (using backend API)
export function useProfileReport(username: string) {
  const [profileReport, setProfileReport] = useState<ProfileReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!username.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProfileReport(username);
      setProfileReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile report');
    } finally {
      setLoading(false);
    }
  }, [username]);

  return { profileReport, loading, error, fetchReport };
}
