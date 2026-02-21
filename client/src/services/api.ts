/**
 * Enterprise API Client
 *
 * Features:
 * - Automatic JWT token injection
 * - Token refresh on 401
 * - Request/Response interceptors
 * - Error handling with retry logic
 * - Type-safe API methods
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import type {
  Trend,
  ProfileReport,
  CompetitorData,
  TikTokVideo,
  Hashtag,
  TrendAnalysis,
  AIScript,
  Competitor,
  DashboardStats,
} from '@/types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api';
  }
  return 'https://api.rizko.ai/api';
};

const API_URL = getApiUrl();
const AUTH_STORAGE_KEY = 'rizko_auth';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

interface StoredAuthData {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  user: any;
}

function getStoredAuth(): StoredAuthData | null {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (!parsed.tokens?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function updateStoredTokens(accessToken: string, refreshToken?: string): void {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return;

    const parsed = JSON.parse(data);
    parsed.tokens.accessToken = accessToken;
    if (refreshToken) {
      parsed.tokens.refreshToken = refreshToken;
    }

    // Parse new expiry from token
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      parsed.tokens.expiresAt = payload.exp * 1000;
    } catch {
      parsed.tokens.expiresAt = Date.now() + 30 * 60 * 1000;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to update stored tokens:', error);
  }
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// =============================================================================
// AXIOS INSTANCE
// =============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for slow backends
});

// Track if we're currently refreshing tokens
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const auth = getStoredAuth();

    if (auth?.tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${auth.tokens.accessToken}`;
    }

    // Add request ID for tracing
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const auth = getStoredAuth();

      if (!auth?.tokens?.refreshToken) {
        isRefreshing = false;
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: auth.tokens.refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        updateStoredTokens(access_token, refresh_token);
        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 429 Too Many Requests - Rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.warn(`Rate limited. Retry after: ${retryAfter}s`);

      window.dispatchEvent(
        new CustomEvent('api:rate-limited', {
          detail: { retryAfter: parseInt(retryAfter) || 60 },
        })
      );
    }

    // Handle 503 Service Unavailable - Retry logic
    if (error.response?.status === 503 || error.code === 'ECONNABORTED') {
      const retryCount = originalRequest._retryCount || 0;

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        originalRequest._retryCount = retryCount + 1;

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount))
        );

        return apiClient(originalRequest);
      }
    }

    // Log errors for debugging
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: originalRequest?.url,
      });
    } else if (error.request) {
      const isTimeout = error.code === 'ECONNABORTED';
      console.error('API Error: No response', {
        url: originalRequest?.url,
        timeout: isTimeout,
      });
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// API SERVICE CLASS
// =============================================================================

class ApiService {
  // ===========================================================================
  // TRENDS API
  // ===========================================================================

  /**
   * Search trends with user isolation
   * POST /api/trends/search
   */
  async searchTrends(params: {
    target?: string;
    keywords?: string[];
    mode?: 'keywords' | 'username';
    platform?: 'tiktok' | 'instagram' | 'twitter' | 'reddit' | 'discord' | 'telegram' | 'youtube';  // Multi-platform support
    business_desc?: string;
    is_deep?: boolean;
    user_tier?: string;
    time_window?: string;
    rescan_hours?: number;
    project_id?: number;
  }): Promise<{
    status: string;
    items: Trend[];
    mode?: string;
    clusters?: any[];
  }> {
    const response = await apiClient.post('/trends/search', {
      target: params.target,
      keywords: params.keywords || [],
      mode: params.mode || 'keywords',
      platform: params.platform || 'tiktok',  // Default to TikTok
      business_desc: params.business_desc || '',
      is_deep: params.is_deep || false,
      user_tier: params.user_tier || 'free',
      time_window: params.time_window,
      rescan_hours: params.rescan_hours || 24,
      ...(params.project_id && { project_id: params.project_id }),
    });
    return response.data;
  }

  /**
   * Get user's saved trend results
   * GET /api/trends/results
   */
  async getSavedResults(
    keyword: string,
    mode: 'keywords' | 'username' = 'keywords'
  ): Promise<{ status: string; items: Trend[] }> {
    const response = await apiClient.get('/trends/results', {
      params: { keyword, mode },
    });
    return response.data;
  }

  /**
   * Get user's trend history
   * GET /api/trends/my-trends
   */
  async getMyTrends(params?: {
    page?: number;
    per_page?: number;
  }): Promise<{
    items: Trend[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const response = await apiClient.get('/trends/my-trends', { params });
    return response.data;
  }

  /**
   * Get user's search/feature limits
   * GET /api/trends/limits
   */
  async getLimits(): Promise<{
    searches_today: number;
    searches_limit: number;
    deep_analyze_today: number;
    deep_analyze_limit: number;
    subscription_tier: string;
    can_search: boolean;
    can_deep_analyze: boolean;
  }> {
    const response = await apiClient.get('/trends/limits');
    return response.data;
  }

  // ===========================================================================
  // FAVORITES API
  // ===========================================================================

  /**
   * Get user's favorites
   * GET /api/favorites
   */
  async getFavorites(params?: {
    page?: number;
    per_page?: number;
    tag?: string;
    project_id?: number;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const response = await apiClient.get('/favorites/', { params });
    return response.data;
  }

  /**
   * Add trend to favorites
   * POST /api/favorites
   */
  async addFavorite(data: {
    trend_id: number;
    notes?: string;
    tags?: string[];
    project_id?: number;
  }): Promise<any> {
    const response = await apiClient.post('/favorites/', data);
    return response.data;
  }

  /**
   * Update favorite
   * PATCH /api/favorites/:id
   */
  async updateFavorite(
    favoriteId: number,
    data: { notes?: string; tags?: string[] }
  ): Promise<any> {
    const response = await apiClient.patch(`/favorites/${favoriteId}`, data);
    return response.data;
  }

  /**
   * Remove from favorites
   * DELETE /api/favorites/:id
   */
  async removeFavorite(favoriteId: number): Promise<void> {
    await apiClient.delete(`/favorites/${favoriteId}`);
  }

  /**
   * Check if trend is favorited
   * GET /api/favorites/check/:trendId
   */
  async checkFavorite(trendId: number): Promise<{
    is_favorited: boolean;
    favorite_id: number | null;
  }> {
    const response = await apiClient.get(`/favorites/check/${trendId}`);
    return response.data;
  }

  /**
   * Save video directly to favorites (creates trend + favorite in one step)
   * POST /api/favorites/save-video
   */
  async saveVideo(data: {
    platform_id: string;
    url: string;
    description?: string;
    cover_url?: string;
    play_addr?: string;
    author_username?: string;
    stats?: Record<string, number>;
    viral_score?: number;
    notes?: string;
    tags?: string[];
    project_id?: number;
  }): Promise<{ id: number; trend_id: number; message: string }> {
    const response = await apiClient.post('/favorites/save-video', data);
    return response.data;
  }

  /**
   * Get all user's tags
   * GET /api/favorites/tags/all
   */
  async getFavoriteTags(): Promise<string[]> {
    const response = await apiClient.get('/favorites/tags/all');
    return response.data;
  }

  // ===========================================================================
  // COMPETITORS API
  // ===========================================================================

  /**
   * Get user's tracked competitors
   * GET /api/competitors
   */
  async getCompetitors(params?: {
    page?: number;
    per_page?: number;
    is_active?: boolean;
    project_id?: number;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const response = await apiClient.get('/competitors/', { params });
    return response.data;
  }

  /**
   * Add competitor to track
   * POST /api/competitors
   */
  async addCompetitor(data: {
    username: string;
    notes?: string;
    tags?: string[];
    project_id?: number;
  }): Promise<any> {
    const response = await apiClient.post('/competitors/', data);
    return response.data;
  }

  /**
   * Get competitor spy data
   * GET /api/competitors/:username/spy
   */
  async spyCompetitor(username: string): Promise<CompetitorData> {
    const cleanUsername = username.toLowerCase().trim().replace('@', '');
    const response = await apiClient.get(`/competitors/${cleanUsername}/spy`);
    return response.data;
  }

  /**
   * Refresh competitor data
   * PUT /api/competitors/:username/refresh
   */
  async refreshCompetitor(username: string): Promise<any> {
    const cleanUsername = username.toLowerCase().trim().replace('@', '');
    const response = await apiClient.put(`/competitors/${cleanUsername}/refresh`);
    return response.data;
  }

  /**
   * Remove competitor
   * DELETE /api/competitors/:username
   */
  async removeCompetitor(username: string): Promise<void> {
    const cleanUsername = username.toLowerCase().trim().replace('@', '');
    await apiClient.delete(`/competitors/${cleanUsername}`);
  }

  // ===========================================================================
  // PROFILES API
  // ===========================================================================

  /**
   * Get unified profile report
   * GET /api/profiles/:username
   */
  async getProfileReport(username: string): Promise<ProfileReport> {
    const cleanUsername = username.toLowerCase().trim().replace('@', '');
    const response = await apiClient.get(`/profiles/${cleanUsername}`);
    return response.data;
  }

  // ===========================================================================
  // USAGE API
  // ===========================================================================

  /**
   * Get usage statistics
   * GET /api/usage
   */
  async getUsageStats(): Promise<{
    plan: string;
    reset_date: string;
    credits: {
      monthly_used: number;
      monthly_limit: number;
      bonus: number;
      rollover: number;
      total_available: number;
    };
    stats: {
      scripts_generated: number;
      chat_messages: number;
      deep_analyze: number;
    };
    auto_mode: {
      enabled: boolean;
      savings: number;
    };
  }> {
    const response = await apiClient.get('/usage/');
    return response.data;
  }

  /**
   * Toggle Auto Mode
   * POST /api/usage/auto-mode
   */
  async toggleAutoMode(enabled: boolean): Promise<{
    enabled: boolean;
    message: string;
  }> {
    const response = await apiClient.post('/usage/auto-mode', { enabled });
    return response.data;
  }

  // ===========================================================================
  // AI SCRIPTS API
  // ===========================================================================

  /**
   * Generate AI script
   * POST /api/ai-scripts/generate
   */
  async generateAIScript(
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
  ): Promise<AIScript> {
    const response = await apiClient.post('/ai-scripts/generate', {
      video_description,
      video_stats,
      tone,
      niche,
      duration_seconds,
    });

    const data = response.data;
    return {
      id: `script_${Date.now()}`,
      originalVideoId: '',
      hook: data.hook,
      body: data.body,
      callToAction: data.cta,
      duration: data.duration,
      tone,
      niche,
      viralElements: data.viralElements,
      tips: data.tips,
      generatedAt: data.generatedAt,
    };
  }

  /**
   * Chat with AI assistant
   * POST /api/ai-scripts/chat
   */
  async chatWithAI(params: {
    message: string;
    context?: string;
    history?: Array<{ role: string; content: string }>;
    model?: string;
    mode?: string;
    language?: string;
    project_id?: number;
  }): Promise<{ response: string; credits_used: number; model_used: string }> {
    const response = await apiClient.post('/ai-scripts/chat', {
      message: params.message,
      context: params.context || '',
      history: params.history || [],
      model: params.model || 'gemini',
      mode: params.mode || 'chat',
      language: params.language || 'English',
      ...(params.project_id && { project_id: params.project_id }),
    });
    return response.data;
  }

  // ===========================================================================
  // AUTH EXTENDED
  // ===========================================================================

  /**
   * Server-side logout (blacklist token)
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors — we still clear local state
    }
  }

  // ===========================================================================
  // CHAT SESSIONS API
  // ===========================================================================

  /**
   * Get credit balance
   * GET /api/chat-sessions/credits
   */
  async getChatCredits(): Promise<{
    credits: number;
    monthly_limit: number;
    tier: string;
    model_costs: Record<string, number>;
  }> {
    const response = await apiClient.get('/chat-sessions/credits');
    return response.data;
  }

  /**
   * List chat sessions
   * GET /api/chat-sessions/
   */
  async getChatSessions(): Promise<any[]> {
    const response = await apiClient.get('/chat-sessions/');
    return response.data;
  }

  /**
   * Create chat session
   * POST /api/chat-sessions/
   */
  async createChatSession(data: {
    title?: string;
    model?: string;
    mode?: string;
  }): Promise<any> {
    const response = await apiClient.post('/chat-sessions/', data);
    return response.data;
  }

  /**
   * Get chat session by session_id
   * GET /api/chat-sessions/:sessionId
   */
  async getChatSession(sessionId: string): Promise<any> {
    const response = await apiClient.get(`/chat-sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Rename chat session
   * PATCH /api/chat-sessions/:sessionId
   */
  async updateChatSession(sessionId: string, data: { title?: string; is_pinned?: boolean }): Promise<any> {
    const response = await apiClient.patch(`/chat-sessions/${sessionId}`, data);
    return response.data;
  }

  /**
   * Delete chat session
   * DELETE /api/chat-sessions/:sessionId
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/chat-sessions/${sessionId}`);
  }

  /**
   * Get messages for a session
   * GET /api/chat-sessions/:sessionId/messages
   */
  async getChatMessages(sessionId: string): Promise<any[]> {
    const response = await apiClient.get(`/chat-sessions/${sessionId}/messages`);
    return response.data;
  }

  /**
   * Send message to AI
   * POST /api/chat-sessions/:sessionId/messages
   */
  async sendChatMessage(
    sessionId: string,
    data: { message: string; mode?: string; model?: string; language?: string; project_id?: number; context?: string },
    signal?: AbortSignal
  ): Promise<any> {
    const response = await apiClient.post(`/chat-sessions/${sessionId}/messages`, data, { signal });
    return response.data;
  }

  /**
   * Parse a video URL to extract metadata
   * POST /api/chat-sessions/parse-link
   */
  async parseLink(url: string): Promise<{
    platform: string;
    description: string;
    author: string;
    stats: { views: number; likes: number; comments: number; shares?: number };
    hashtags: string[];
    music?: string;
  }> {
    const response = await apiClient.post('/chat-sessions/parse-link', { url });
    return response.data;
  }

  // ===========================================================================
  // WORKFLOWS API
  // ===========================================================================

  /**
   * List workflows
   * GET /api/workflows/
   */
  async getWorkflows(): Promise<any[]> {
    const response = await apiClient.get('/workflows/');
    return response.data;
  }

  /**
   * Create workflow
   * POST /api/workflows/
   */
  async createWorkflow(data: {
    name?: string;
    description?: string;
    graph_data?: any;
    node_configs?: any;
    canvas_state?: any;
  }): Promise<any> {
    const response = await apiClient.post('/workflows/', data);
    return response.data;
  }

  /**
   * Get workflow by ID
   * GET /api/workflows/:id
   */
  async getWorkflow(id: number): Promise<any> {
    const response = await apiClient.get(`/workflows/${id}`);
    return response.data;
  }

  /**
   * Update workflow
   * PATCH /api/workflows/:id
   */
  async updateWorkflow(id: number, data: {
    name?: string;
    description?: string;
    graph_data?: any;
    node_configs?: any;
    canvas_state?: any;
    tags?: string[];
  }): Promise<any> {
    const response = await apiClient.patch(`/workflows/${id}`, data);
    return response.data;
  }

  /**
   * Delete workflow
   * DELETE /api/workflows/:id
   */
  async deleteWorkflow(id: number): Promise<void> {
    await apiClient.delete(`/workflows/${id}`);
  }

  /**
   * Duplicate workflow
   * POST /api/workflows/:id/duplicate
   */
  async duplicateWorkflow(id: number): Promise<any> {
    const response = await apiClient.post(`/workflows/${id}/duplicate`);
    return response.data;
  }

  /**
   * Execute workflow
   * POST /api/workflows/execute
   */
  async executeWorkflow(data: {
    nodes: any[];
    connections: any[];
    node_configs?: Record<string, any>;
    workflow_id?: number;
    language?: string;
    project_id?: number;
  }): Promise<any> {
    const response = await apiClient.post('/workflows/execute', data, {
      timeout: 300000, // 5 minutes for long workflows
    });
    return response.data;
  }

  /**
   * Analyze video with Gemini Vision
   * POST /api/workflows/analyze-video
   */
  async analyzeVideo(data: {
    url: string;
    platform?: string;
    author?: string;
    views?: string;
    uts?: number;
    desc?: string;
    custom_prompt?: string;
  }): Promise<any> {
    const response = await apiClient.post('/workflows/analyze-video', data, {
      timeout: 180000, // 3 minutes for video analysis
    });
    return response.data;
  }

  /**
   * Upload video file from device
   * POST /api/workflows/upload-video-file
   */
  async uploadVideo(file: File): Promise<{
    success: boolean;
    filename: string;
    url: string;
    local_path: string;
    size_mb: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/workflows/upload-video-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for large uploads
    });
    return response.data;
  }

  /**
   * List workflow templates
   * GET /api/workflows/templates/list
   */
  async getWorkflowTemplates(): Promise<any[]> {
    const response = await apiClient.get('/workflows/templates/list');
    return response.data;
  }

  /**
   * Create workflow from template
   * POST /api/workflows/templates/:templateId/create
   */
  async createFromTemplate(templateId: string): Promise<any> {
    const response = await apiClient.post(`/workflows/templates/${templateId}/create`);
    return response.data;
  }

  /**
   * Get workflow history
   * GET /api/workflows/history/list
   */
  async getWorkflowHistory(limit?: number): Promise<any[]> {
    const response = await apiClient.get('/workflows/history/list', {
      params: limit ? { limit } : undefined,
    });
    return response.data;
  }

  /**
   * Get workflow run detail
   * GET /api/workflows/history/:runId
   */
  async getWorkflowRun(runId: number): Promise<any> {
    const response = await apiClient.get(`/workflows/history/${runId}`);
    return response.data;
  }

  /**
   * Update workflow run (rename / pin)
   * PATCH /api/workflows/history/:runId
   */
  async updateWorkflowRun(runId: number, data: { workflow_name?: string; is_pinned?: boolean }): Promise<any> {
    const response = await apiClient.patch(`/workflows/history/${runId}`, data);
    return response.data;
  }

  /**
   * Delete workflow run
   * DELETE /api/workflows/history/:runId
   */
  async deleteWorkflowRun(runId: number): Promise<void> {
    await apiClient.delete(`/workflows/history/${runId}`);
  }

  /**
   * Clear all workflow history
   * DELETE /api/workflows/history/clear
   */
  async clearWorkflowHistory(): Promise<void> {
    await apiClient.delete('/workflows/history/clear');
  }

  // ===========================================================================
  // PROJECTS API
  // ===========================================================================

  async getProjects(statusFilter?: string): Promise<any[]> {
    const response = await apiClient.get('/projects/', {
      params: statusFilter ? { status_filter: statusFilter } : undefined,
    });
    return response.data;
  }

  async createProject(data: { name: string; icon?: string }): Promise<any> {
    const response = await apiClient.post('/projects/', data);
    return response.data;
  }

  async getProject(id: number): Promise<any> {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  }

  async updateProject(id: number, data: {
    name?: string;
    icon?: string;
    status?: string;
    profile_data?: any;
  }): Promise<any> {
    const response = await apiClient.patch(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  }

  async generateProjectQuestions(id: number, data: {
    form_data: Record<string, any>;
  }): Promise<{ questions: string[] }> {
    // Always ensure language is set correctly at the moment of API call
    const formData = { ...data.form_data };
    if (!formData.language) {
      const stored = localStorage.getItem('rizko_language') || 'en';
      formData.language = stored.startsWith('ru') ? 'Russian' : 'English';
    }
    console.log('[API] generateProjectQuestions → language:', formData.language, '(localStorage:', localStorage.getItem('rizko_language'), ')');
    const response = await apiClient.post(`/projects/${id}/generate-questions`, {
      form_data: formData,
      description_text: '',
    });
    return response.data;
  }

  async generateProjectProfile(id: number, data: {
    form_data: Record<string, any>;
    description_text: string;
  }): Promise<any> {
    const response = await apiClient.post(`/projects/${id}/generate-profile`, data);
    return response.data;
  }

  async transcribeProjectAudio(id: number, audioBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await apiClient.post(`/projects/${id}/transcribe`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  }

  // ===========================================================================
  // LEGACY METHODS (backward compatibility)
  // ===========================================================================

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

  async getTrendingHashtags(): Promise<Hashtag[]> {
    return this.getMockTrendingHashtags();
  }

  async getVideoDetails(videoId: string): Promise<TikTokVideo | null> {
    return this.getMockVideo(videoId);
  }

  async getUserProfile(username: string): Promise<Competitor | null> {
    try {
      const report = await this.getProfileReport(username);
      return this.convertProfileReportToCompetitor(report);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return this.getMockCompetitor(username);
    }
  }

  async getUserVideos(username: string): Promise<TikTokVideo[]> {
    try {
      const report = await this.getProfileReport(username);
      return this.convertProfileFeedToTikTokVideos(report.full_feed);
    } catch (error) {
      console.error('Error fetching user videos:', error);
      return this.getMockUserVideos(username);
    }
  }

  async analyzeTrend(hashtag: string): Promise<TrendAnalysis> {
    return this.getMockTrendAnalysis(hashtag);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.getMockDashboardStats();
  }

  // ===========================================================================
  // CONVERSION HELPERS
  // ===========================================================================

  private convertTrendsToTikTokVideos(trends: Trend[]): TikTokVideo[] {
    return trends.map((trend) => ({
      id: trend.platform_id || String(trend.id),
      trend_id: trend.id,  // Database ID for favorites
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
      growthTrend:
        report.metrics.status === 'Rising'
          ? 'up'
          : report.metrics.status === 'Falling'
          ? 'down'
          : 'stable',
      lastActivity: new Date().toISOString(),
    };
  }

  private convertProfileFeedToTikTokVideos(
    feed: ProfileReport['full_feed']
  ): TikTokVideo[] {
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

  // ===========================================================================
  // MOCK DATA (fallbacks)
  // ===========================================================================

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
        {
          id: '1',
          name: 'trending',
          title: 'trending',
          desc: '',
          stats: { videoCount: 1000000, viewCount: 100000000 },
        },
        {
          id: '2',
          name: 'viral',
          title: 'viral',
          desc: '',
          stats: { videoCount: 500000, viewCount: 50000000 },
        },
      ],
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      engagementRate: Math.random() * 15,
      viralScore: Math.random() * 100,
    }));
  }

  private getMockHashtagVideos(hashtag: string): TikTokVideo[] {
    return this.getMockTrendingVideos().map((video) => ({
      ...video,
      description: `${video.description} #${hashtag}`,
      hashtags: [
        ...video.hashtags,
        {
          id: hashtag,
          name: hashtag,
          title: hashtag,
          desc: '',
          stats: { videoCount: 100000, viewCount: 10000000 },
        },
      ],
    }));
  }

  private getMockTrendingHashtags(): Hashtag[] {
    const hashtags = [
      'fyp',
      'viral',
      'trending',
      'comedy',
      'dance',
      'food',
      'travel',
      'fashion',
      'beauty',
      'fitness',
      'pet',
      'art',
      'music',
    ];
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
      prediction:
        Math.random() > 0.3 ? 'rising' : Math.random() > 0.5 ? 'stable' : 'falling',
      relatedVideos: this.getMockTrendingVideos().slice(0, 10),
      peakTime: new Date(
        Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
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

  // ===========================================================================
  // SUPER VISION API
  // ===========================================================================

  async getSuperVisionConfig(projectId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/super-vision/config/${projectId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createSuperVisionConfig(data: {
    project_id: number;
    min_views?: number;
    date_range_days?: number;
    scan_interval_hours?: number;
    max_vision_videos?: number;
    custom_keywords?: string[];
    text_score_threshold?: number;
  }): Promise<any> {
    const response = await apiClient.post('/super-vision/config', data);
    return response.data;
  }

  async updateSuperVisionConfig(projectId: number, data: Record<string, any>): Promise<any> {
    const response = await apiClient.patch(`/super-vision/config/${projectId}`, data);
    return response.data;
  }

  async deleteSuperVisionConfig(projectId: number): Promise<void> {
    await apiClient.delete(`/super-vision/config/${projectId}`);
  }

  async activateSuperVision(projectId: number): Promise<any> {
    const response = await apiClient.post(`/super-vision/config/${projectId}/activate`);
    return response.data;
  }

  async pauseSuperVision(projectId: number): Promise<any> {
    const response = await apiClient.post(`/super-vision/config/${projectId}/pause`);
    return response.data;
  }

  async triggerSuperVisionScan(projectId: number): Promise<any> {
    const response = await apiClient.post(`/super-vision/config/${projectId}/trigger`, {}, {
      timeout: 300000,
    });
    return response.data;
  }

  async getSuperVisionResults(projectId: number, params?: {
    page?: number;
    per_page?: number;
    sort_by?: string;
    include_dismissed?: boolean;
  }): Promise<any> {
    const response = await apiClient.get(`/super-vision/results/${projectId}`, { params });
    return response.data;
  }

  async dismissSuperVisionResult(resultId: number): Promise<void> {
    await apiClient.post(`/super-vision/results/${resultId}/dismiss`);
  }

  async saveSuperVisionResult(resultId: number): Promise<void> {
    await apiClient.post(`/super-vision/results/${resultId}/save`);
  }

  async unsaveSuperVisionResult(resultId: number): Promise<void> {
    await apiClient.delete(`/super-vision/results/${resultId}/save`);
  }

  async getSuperVisionStatus(): Promise<any[]> {
    const response = await apiClient.get('/super-vision/status');
    return response.data;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const apiService = new ApiService();
export { apiClient };
