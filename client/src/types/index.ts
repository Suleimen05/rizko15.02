// Backend API Types (from Python FastAPI)
export interface Trend {
  id: number;
  platform_id: string;
  url: string;
  description: string;
  cover_url: string;
  vertical?: string;
  author_username: string;
  stats: {
    playCount: number;
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
  };
  initial_stats?: {
    playCount: number;
  };
  uts_score: number;
  cluster_id?: number;
  music_id?: string;
  music_title?: string;
  last_scanned_at?: string | null;
}

// Legacy TikTokVideo interface (for backward compatibility)
export interface TikTokVideo {
  id: string;
  title: string;
  description: string;
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatar: string;
    followerCount: number;
    followingCount: number;
    heartCount: number;
    videoCount: number;
    verified: boolean;
  };
  stats: {
    playCount: number;
    diggCount: number;
    shareCount: number;
    commentCount: number;
    saveCount?: number;
  };
  video: {
    duration: number;
    ratio: string;
    cover: string;
    playAddr: string;
    downloadAddr: string;
  };
  music: {
    id: string;
    title: string;
    authorName: string;
    original: boolean;
    playUrl: string;
  };
  hashtags: Hashtag[];
  createdAt: string;
  viralScore?: number;
  engagementRate?: number;
  // Backend fields
  trend_id?: number;   // Database ID for favorites
  uts_score?: number;
  cover_url?: string;
  url?: string;
  author_username?: string;
  play_addr?: string;  // Прямая ссылка на видео файл для воспроизведения
}

export interface Hashtag {
  id: string;
  name: string;
  title: string;
  desc: string;
  stats: {
    videoCount: number;
    viewCount: number;
  };
  trending?: boolean;
  growthRate?: number;
}

export interface TrendAnalysis {
  id: string;
  hashtag: string;
  currentViews: number;
  previousViews: number;
  growthRate: number;
  velocity: number;
  prediction: 'rising' | 'falling' | 'stable';
  relatedVideos: TikTokVideo[];
  peakTime?: string;
  demographics?: {
    ageGroups: Record<string, number>;
    countries: Record<string, number>;
    gender: {
      male: number;
      female: number;
    };
  };
}

export interface AIScript {
  id: string;
  originalVideoId: string;
  hook: string;
  body: string[];
  callToAction: string;
  duration: number;
  tone: string;
  niche: string;
  viralElements: string[];
  tips: string[];
  generatedAt: string;
}

// Backend Profile Report (from /api/profiles/{username})
export interface ProfileReport {
  author: {
    username: string;
    nickname: string;
    avatar: string;
    followers: number;
  };
  metrics: {
    avg_views: number;
    engagement_rate: number;
    efficiency_score: number;
    status: string;
    avg_viral_lift: number;
  };
  top_3_hits: Array<{
    id: string;
    url: string;
    title: string;
    cover_url: string;
    views: number;
    uts_score: number;
    stats: {
      likes: number;
      comments: number;
      shares: number;
      bookmarks: number;
    };
    uploaded_at: number;
  }>;
  full_feed: Array<{
    id: string;
    url: string;
    title: string;
    cover_url: string;
    views: number;
    uts_score: number;
    stats: {
      likes: number;
      comments: number;
      shares: number;
      bookmarks: number;
    };
    uploaded_at: number;
  }>;
}

// Backend Competitor Data (from /api/profiles/{username}/spy)
export interface CompetitorData {
  username: string;
  channel_data: {
    nickName: string;
    uniqueId: string;
    avatarThumb: string;
    fans: number;
    videos: number;
  };
  top_3_hits: Array<{
    id: string;
    title: string;
    url: string;
    cover_url: string;
    views: number;
    uts_score: number;
    stats: {
      playCount: number;
      diggCount: number;
      commentCount: number;
      shareCount: number;
    };
    author: {
      username: string;
      avatar: string;
      followers: number;
    };
    uploaded_at: number;
  }>;
  latest_feed: Array<{
    id: string;
    title: string;
    url: string;
    cover_url: string;
    views: number;
    uts_score: number;
    stats: {
      playCount: number;
      diggCount: number;
      commentCount: number;
      shareCount: number;
    };
    author: {
      username: string;
      avatar: string;
      followers: number;
    };
    uploaded_at: number;
  }>;
  metrics: {
    engagement_rate: number;
    avg_views: number;
  };
}

// Legacy Competitor interface (for backward compatibility)
export interface Competitor {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  followerCount: number;
  videoCount: number;
  avgViews: number;
  engagementRate: number;
  topVideos: TikTokVideo[];
  growthTrend: 'up' | 'down' | 'stable';
  lastActivity: string;
  platform?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: SubscriptionTier;
  credits: number;
  preferences: {
    niches: string[];
    languages: string[];
    regions: string[];
  };
}

export interface DashboardStats {
  totalVideosAnalyzed: number;
  trendingHashtags: number;
  viralOpportunities: number;
  engagementRate: number;
  topPerformingNiche: string;
  weeklyGrowth: number;
}

// Platform types for multi-platform support
export type Platform = 'tiktok' | 'instagram' | 'twitter' | 'reddit' | 'discord' | 'telegram' | 'youtube';

export interface PlatformConfig {
  id: Platform;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface SearchFilters {
  niche?: string;
  platform?: Platform;  // Multi-platform support
  region?: string;
  language?: string;
  minViews?: number;
  maxViews?: number;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: 'views' | 'engagement' | 'recent' | 'viral';
  dateRange?: '24h' | '7d' | '30d' | '90d';
}

export interface Notification {
  id: string;
  type: 'trend' | 'competitor' | 'opportunity' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// AI Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
}

export interface ChatAttachment {
  type: 'trend' | 'script' | 'competitor';
  id: string;
  title: string;
  preview?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model: 'claude' | 'gemini';
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
  category: 'script' | 'ideas' | 'analysis' | 'improvement';
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  variables: string[];
}

// ==================== DEEP ANALYZE TYPES ====================

// UTS Breakdown (6 layers)
export interface UTSBreakdown {
  l1_viral_lift: number;      // 0.0 - 1.0 (30% weight)
  l2_velocity: number;        // 0.0 - 1.0 (20% weight)
  l3_retention: number;       // 0.0 - 1.0 (20% weight)
  l4_cascade: number;         // 0.0 - 1.0 (15% weight)
  l5_saturation: number;      // 0.0 - 1.0 (10% weight)
  l7_stability: number;       // 0.0 - 1.0 (5% weight)
  final_score: number;        // 0.0 - 10.0 (weighted sum)
}

// Cluster Information
export interface ClusterInfo {
  cluster_id: number;         // -1 = noise/unique, 0+ = cluster ID
  video_count: number;        // How many videos in this cluster
  avg_uts: number;            // Average UTS score of cluster
  similar_videos?: TikTokVideo[];  // Other videos in same cluster
}

// Analysis Mode
export type AnalysisMode = 'light' | 'deep';

// User Subscription Tier
export type SubscriptionTier = 'free' | 'creator' | 'pro' | 'agency';

// Extended TikTokVideo with Deep Analyze fields
export interface TikTokVideoDeep extends TikTokVideo {
  // Deep Analyze exclusive fields
  uts_breakdown?: UTSBreakdown;
  cluster_info?: ClusterInfo;
  saturation_score?: number;    // Same as uts_breakdown.l5_saturation
  cascade_count?: number;       // Number of videos using this sound
  cascade_score?: number;       // Same as uts_breakdown.l4_cascade
  velocity_score?: number;      // Same as uts_breakdown.l2_velocity
  initial_stats?: {             // For velocity calculation
    playCount: number;
    diggCount?: number;
    timestamp?: string;
  };
}

// Search Response with mode
export interface SearchResponse {
  status: 'ok' | 'error' | 'empty';
  mode: AnalysisMode;
  items: TikTokVideo[] | TikTokVideoDeep[];
  clusters?: ClusterInfo[];     // Only present in deep mode
  message?: string;
}

// Upgrade Required Error
export interface UpgradeRequiredError {
  error: string;
  upgrade_url: string;
  current_tier: SubscriptionTier;
  required_tier: SubscriptionTier;
  features: string[];          // List of features user is missing
}

// ==================== WORKFLOW / CHAT SESSION TYPES ====================

// Workflow Node Types
export type WorkflowNodeType =
  | 'video'
  | 'brand'
  | 'analyze'
  | 'extract'
  | 'style'
  | 'generate'
  | 'refine'
  | 'script'
  | 'storyboard';

export interface WorkflowNodeConfig {
  customPrompt?: string;
  model?: string;
  brandContext?: string;
  outputFormat?: string;
}

export interface WorkflowNode {
  id: number;
  type: WorkflowNodeType;
  x: number;
  y: number;
  videoData?: SavedVideo;
  outputContent?: string;
  config?: WorkflowNodeConfig;
}

export interface WorkflowConnection {
  from: number;
  to: number;
}

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  graph_data: {
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  };
  node_configs: Record<string, WorkflowNodeConfig>;
  status: 'draft' | 'ready' | 'running' | 'completed' | 'failed';
  canvas_state: { zoom: number; panX: number; panY: number };
  tags: string[];
  is_favorite: boolean;
  last_run_at?: string;
  last_run_results: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: number;
  workflow_id?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input_graph: any;
  results: Record<string, any>;
  final_script?: string;
  storyboard?: string;
  total_credits_used: number;
  metrics: {
    total_nodes: number;
    processed_nodes: number;
    total_time_ms: number;
    per_node_time: Record<string, number>;
  };
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  node_count: number;
  estimated_credits: number;
  graph_data: {
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  };
  node_configs: Record<string, WorkflowNodeConfig>;
}

export interface SavedVideo {
  id: number;
  platform: string;
  author: string;
  desc: string;
  views: string;
  uts: number;
  thumb: string;
  url?: string;
}

// Chat Session (database-backed)
export interface ChatSessionType {
  id: number;
  session_id: string;
  title: string;
  model: string;
  mode: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

// Chat Credits
export interface ChatCreditsInfo {
  remaining: number;
  cost: number;
  monthly_limit: number;
  tier: string;
  model_costs?: Record<string, number>;
}
