import axios, { type AxiosInstance } from 'axios';
import type { Trend, ProfileReport, CompetitorData, TikTokVideo, Hashtag, TrendAnalysis, AIScript, Competitor, DashboardStats } from '@/types';

// Backend API configuration
const getApiUrl = () => {
  // Use environment variable or default to localhost
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If working locally
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api';
  }
  // For production (if deployed)
  return 'https://xtrend-app.onrender.com/api';
};

const API_URL = getApiUrl();

// Create axios instance for backend API
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds (2 minutes) for Render Free Tier
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = error.message?.includes('Network Error') || (!error.response && !error.request);
      
      let message = 'Backend server may be down or unreachable';
      if (isTimeout) {
        message = 'Backend server is waking up. This may take up to 2 minutes. Please wait and try again.';
      } else if (isNetworkError) {
        message = 'Network error: Cannot reach backend server. The server may be sleeping. Please wait 30-60 seconds and try again.';
      }
      
      console.error('API Error: No response from server', {
        url: error.config?.url,
        message,
        errorCode: error.code,
        errorMessage: error.message,
      });
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

class ApiService {
  // ============================================
  // TRENDS API (matching backend function names)
  // ============================================

  /**
   * Search trends - POST /api/trends/search
   * Matches backend: search_trends()
   */
  async searchTrends(params: {
    target?: string;
    keywords?: string[];
    mode?: 'keywords' | 'username';
    business_desc?: string;
    is_deep?: boolean;
    time_window?: string;
    rescan_hours?: number;
  }): Promise<{ status: string; items: Trend[] }> {
    try {
      const response = await apiClient.post('/trends/search', {
        target: params.target,
        keywords: params.keywords || [],
        mode: params.mode || 'keywords',
        business_desc: params.business_desc || '',
        is_deep: params.is_deep || false,
        time_window: params.time_window,
        rescan_hours: params.rescan_hours || 24,
      });
      return response.data;
    } catch (error) {
      console.error('Error searching trends:', error);
      throw error;
    }
  }

  /**
   * Get saved results - GET /api/trends/results
   * Matches backend: get_saved_results()
   */
  async getSavedResults(keyword: string, mode: 'keywords' | 'username' = 'keywords'): Promise<{ status: string; items: Trend[] }> {
    try {
      const response = await apiClient.get('/trends/results', {
        params: {
          keyword,
          mode,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting saved results:', error);
      throw error;
    }
  }

  // ============================================
  // PROFILES API (matching backend function names)
  // ============================================

  /**
   * Get unified profile report - GET /api/profiles/{username}
   * Matches backend: get_unified_profile_report()
   */
  async getProfileReport(username: string): Promise<ProfileReport> {
    try {
      const cleanUsername = username.toLowerCase().trim().replace('@', '');
      const response = await apiClient.get(`/profiles/${cleanUsername}`);
      return response.data;
    } catch (error) {
      console.error('Error getting profile report:', error);
      throw error;
    }
  }

  /**
   * Spy competitor - GET /api/profiles/{username}/spy
   * Matches backend: spy_competitor()
   */
  async spyCompetitor(username: string): Promise<CompetitorData> {
    try {
      const cleanUsername = username.toLowerCase().trim().replace('@', '');
      const response = await apiClient.get(`/profiles/${cleanUsername}/spy`);
      return response.data;
    } catch (error) {
      console.error('Error spying competitor:', error);
      throw error;
    }
  }

  // ============================================
  // LEGACY METHODS (for backward compatibility)
  // ============================================

  /**
   * Search trending videos (legacy - maps to searchTrends)
   */
  async searchTrendingVideos(region = 'US'): Promise<TikTokVideo[]> {
    try {
      const result = await this.searchTrends({
        target: region,
        mode: 'keywords',
        is_deep: false,
      });
      return this.convertTrendsToTikTokVideos(result.items);
    } catch (error) {
      console.error('Error fetching trending videos:', error);
      return this.getMockTrendingVideos();
    }
  }

  /**
   * Search videos by hashtag (legacy - maps to searchTrends)
   */
  async searchByHashtag(hashtag: string): Promise<TikTokVideo[]> {
    try {
      const result = await this.searchTrends({
        target: hashtag,
        mode: 'keywords',
        is_deep: false,
      });
      return this.convertTrendsToTikTokVideos(result.items);
    } catch (error) {
      console.error('Error searching by hashtag:', error);
      return this.getMockHashtagVideos(hashtag);
    }
  }

  /**
   * Get trending hashtags (legacy - not in backend, return mock)
   */
  async getTrendingHashtags(): Promise<Hashtag[]> {
    // This endpoint doesn't exist in backend, return mock data
    return this.getMockTrendingHashtags();
  }

  /**
   * Get video details (legacy - not in backend, return mock)
   */
  async getVideoDetails(videoId: string): Promise<TikTokVideo | null> {
    // This endpoint doesn't exist in backend, return mock data
    return this.getMockVideo(videoId);
  }

  /**
   * Get user profile (legacy - maps to getProfileReport)
   */
  async getUserProfile(username: string): Promise<Competitor | null> {
    try {
      const report = await this.getProfileReport(username);
      return this.convertProfileReportToCompetitor(report);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return this.getMockCompetitor(username);
    }
  }

  /**
   * Get user's videos (legacy - maps to getProfileReport)
   */
  async getUserVideos(username: string): Promise<TikTokVideo[]> {
    try {
      const report = await this.getProfileReport(username);
      return this.convertProfileFeedToTikTokVideos(report.full_feed);
    } catch (error) {
      console.error('Error fetching user videos:', error);
      return this.getMockUserVideos(username);
    }
  }

  /**
   * Analyze trend (legacy - not in backend, return mock)
   */
  async analyzeTrend(hashtag: string): Promise<TrendAnalysis> {
    // This endpoint doesn't exist in backend, return mock data
    return this.getMockTrendAnalysis(hashtag);
  }

  /**
   * Generate AI script (legacy - not in backend, return mock)
   */
  async generateAIScript(videoId: string): Promise<AIScript> {
    // This endpoint doesn't exist in backend, return mock data
    return this.getMockAIScript(videoId);
  }

  /**
   * Get dashboard stats (legacy - not in backend, return mock)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    // This endpoint doesn't exist in backend, return mock data
    return this.getMockDashboardStats();
  }

  // ============================================
  // CONVERSION HELPERS
  // ============================================

  /**
   * Convert backend Trend[] to TikTokVideo[]
   */
  private convertTrendsToTikTokVideos(trends: Trend[]): TikTokVideo[] {
    return trends.map((trend) => ({
      id: trend.platform_id || String(trend.id),
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
        saveCount: 0,
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
      viralScore: trend.uts_score,
      uts_score: trend.uts_score,
      cover_url: trend.cover_url,
      url: trend.url,
      author_username: trend.author_username,
    }));
  }

  /**
   * Convert ProfileReport to Competitor
   */
  private convertProfileReportToCompetitor(report: ProfileReport): Competitor {
    return {
      id: `user_${report.author.username}`,
      username: report.author.username,
      nickname: report.author.nickname,
      avatar: report.author.avatar,
      followerCount: report.author.followers,
      videoCount: report.full_feed.length,
      avgViews: report.metrics.avg_views,
      engagementRate: report.metrics.engagement_rate,
      topVideos: this.convertProfileFeedToTikTokVideos(report.top_3_hits),
      growthTrend: report.metrics.status === 'Rising' ? 'up' : report.metrics.status === 'Falling' ? 'down' : 'stable',
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Convert profile feed items to TikTokVideo[]
   */
  private convertProfileFeedToTikTokVideos(feed: ProfileReport['full_feed']): TikTokVideo[] {
    return feed.map((item) => ({
      id: item.id,
      title: item.title || 'No description',
      description: item.title || '',
      author: {
        id: `user_${item.id}`,
        uniqueId: '',
        nickname: '',
        avatar: '',
        followerCount: 0,
        followingCount: 0,
        heartCount: 0,
        videoCount: 0,
        verified: false,
      },
      stats: {
        playCount: item.views,
        diggCount: item.stats.likes,
        shareCount: item.stats.shares,
        commentCount: item.stats.comments,
        saveCount: item.stats.bookmarks,
      },
      video: {
        duration: 0,
        ratio: '9:16',
        cover: item.cover_url || '',
        playAddr: item.url || '',
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
      createdAt: new Date(item.uploaded_at * 1000).toISOString(),
      viralScore: item.uts_score,
      uts_score: item.uts_score,
      cover_url: item.cover_url,
      url: item.url,
    }));
  }

  // ============================================
  // MOCK DATA GENERATORS (fallbacks)
  // ============================================

  private getMockTrendingVideos(): TikTokVideo[] {
    return Array.from({ length: 20 }, (_, i) => ({
      id: `mock_video_${i}`,
      title: `Trending Video ${i + 1}`,
      description: `This is a trending video with amazing content #trending #viral #fyp`,
      author: {
        id: `user_${i}`,
        uniqueId: `creator_${i}`,
        nickname: `Creator ${i + 1}`,
        avatar: '/avatar-placeholder.svg',
        followerCount: Math.floor(Math.random() * 1000000),
        followingCount: Math.floor(Math.random() * 1000),
        heartCount: Math.floor(Math.random() * 10000000),
        videoCount: Math.floor(Math.random() * 500),
        verified: Math.random() > 0.5,
      },
      stats: {
        playCount: Math.floor(Math.random() * 10000000) + 10000,
        diggCount: Math.floor(Math.random() * 1000000) + 1000,
        shareCount: Math.floor(Math.random() * 100000) + 100,
        commentCount: Math.floor(Math.random() * 50000) + 50,
        saveCount: Math.floor(Math.random() * 50000),
      },
      video: {
        duration: Math.floor(Math.random() * 30000) + 5000,
        ratio: '9:16',
        cover: '/video-placeholder.svg',
        playAddr: '',
        downloadAddr: '',
      },
      music: {
        id: `music_${i}`,
        title: `Trending Sound ${i + 1}`,
        authorName: 'Artist Name',
        original: Math.random() > 0.5,
        playUrl: '',
      },
      hashtags: [
        { id: '1', name: 'trending', title: 'trending', desc: '', stats: { videoCount: 1000000, viewCount: 100000000 } },
        { id: '2', name: 'viral', title: 'viral', desc: '', stats: { videoCount: 500000, viewCount: 50000000 } },
      ],
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      engagementRate: Math.random() * 15,
      viralScore: Math.random() * 100,
    }));
  }

  private getMockHashtagVideos(hashtag: string): TikTokVideo[] {
    return this.getMockTrendingVideos().map(video => ({
      ...video,
      description: `${video.description} #${hashtag}`,
      hashtags: [...video.hashtags, { id: hashtag, name: hashtag, title: hashtag, desc: '', stats: { videoCount: 100000, viewCount: 10000000 } }],
    }));
  }

  private getMockTrendingHashtags(): Hashtag[] {
    const hashtags = ['fyp', 'viral', 'trending', 'comedy', 'dance', 'food', 'travel', 'fashion', 'beauty', 'fitness', 'pet', 'art', 'music'];
    return hashtags.map((name, i) => ({
      id: `hashtag_${i}`,
      name,
      title: name,
      desc: `Popular hashtag for ${name} content`,
      stats: {
        videoCount: Math.floor(Math.random() * 10000000) + 10000,
        viewCount: Math.floor(Math.random() * 1000000000) + 100000,
      },
      trending: i < 5,
      growthRate: Math.random() * 100 - 20,
    }));
  }

  private getMockVideo(videoId: string): TikTokVideo {
    return {
      id: videoId,
      title: 'Sample Video',
      description: 'This is a sample video description with #hashtags',
      author: {
        id: 'user_1',
        uniqueId: 'sample_user',
        nickname: 'Sample Creator',
        avatar: '/avatar-placeholder.svg',
        followerCount: 100000,
        followingCount: 500,
        heartCount: 2000000,
        videoCount: 150,
        verified: true,
      },
      stats: {
        playCount: 5000000,
        diggCount: 300000,
        shareCount: 50000,
        commentCount: 25000,
        saveCount: 10000,
      },
      video: {
        duration: 15000,
        ratio: '9:16',
        cover: '/video-placeholder.svg',
        playAddr: '',
        downloadAddr: '',
      },
      music: {
        id: 'music_1',
        title: 'Original Sound',
        authorName: 'Sample Artist',
        original: true,
        playUrl: '',
      },
      hashtags: [],
      createdAt: new Date().toISOString(),
      engagementRate: 7.5,
      viralScore: 85,
    };
  }

  private getMockCompetitor(username: string): Competitor {
    return {
      id: `user_${username}`,
      username,
      nickname: username.charAt(0).toUpperCase() + username.slice(1),
      avatar: '/avatar-placeholder.svg',
      followerCount: Math.floor(Math.random() * 1000000),
      videoCount: Math.floor(Math.random() * 500),
      avgViews: Math.floor(Math.random() * 100000),
      engagementRate: Math.random() * 10,
      topVideos: this.getMockTrendingVideos().slice(0, 5),
      growthTrend: 'stable',
      lastActivity: new Date().toISOString(),
    };
  }

  private getMockUserVideos(_username: string): TikTokVideo[] {
    return this.getMockTrendingVideos().slice(0, 10);
  }

  private getMockTrendAnalysis(hashtag: string): TrendAnalysis {
    return {
      id: `trend_${hashtag}_${Date.now()}`,
      hashtag,
      currentViews: Math.floor(Math.random() * 1000000000),
      previousViews: Math.floor(Math.random() * 700000000),
      growthRate: Math.random() * 100 - 20,
      velocity: Math.random() * 100,
      prediction: Math.random() > 0.3 ? 'rising' : Math.random() > 0.5 ? 'stable' : 'falling',
      relatedVideos: this.getMockTrendingVideos().slice(0, 10),
      peakTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private getMockAIScript(videoId: string): AIScript {
    return {
      id: `script_${videoId}_${Date.now()}`,
      originalVideoId: videoId,
      hook: "Stop scrolling! Here's something that will change your perspective...",
      body: [
        "[Opening: Hook the viewer in first 3 seconds]",
        "[Middle: Deliver value and keep them engaged]",
        "[Climax: Build tension or excitement]",
        "[Closing: Wrap up with key takeaway]",
      ],
      callToAction: "Follow for more content like this!",
      duration: 15,
      tone: 'engaging',
      niche: 'general',
      viralElements: ["Short duration", "Trending sound", "Eye-catching thumbnail"],
      tips: [
        "Use trending audio to boost reach",
        "Add text overlay for accessibility",
        "Post during peak hours",
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  private getMockDashboardStats(): DashboardStats {
    return {
      totalVideosAnalyzed: 1250,
      trendingHashtags: 342,
      viralOpportunities: 87,
      engagementRate: 8.7,
      topPerformingNiche: 'Entertainment',
      weeklyGrowth: 15.3,
    };
  }
}

export const apiService = new ApiService();
