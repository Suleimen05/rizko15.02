import { apiClient } from './api';

export interface AccountStats {
  followers: number;
  following: number;
  total_videos: number;
  total_views: number;
  total_likes: number;
  engagement_rate: number;
  avg_views: number;
}

export interface VideoData {
  id: string;
  cover_url: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  uts_score?: number;
  url: string;
}

export interface Account {
  id: number;
  platform: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  profile_url?: string;
  bio?: string;
  is_active: boolean;
  last_synced_at?: string;
  stats: AccountStats;
}

export interface AccountDetails extends Account {
  recent_videos: VideoData[];
  top_hashtags: string[];
  growth_history: Array<{
    date: string;
    followers: number;
    views: number;
  }>;
}

export interface DashboardStats {
  total_followers: number;
  total_videos: number;
  avg_views: number;
  engagement_rate: number;
  views_change: number;
  followers_change: number;
  engagement_change: number;
  videos_change: number;
}

export const accountsApi = {
  // Get all user accounts
  getAccounts: async (): Promise<Account[]> => {
    const response = await apiClient.get('/accounts/');
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/accounts/dashboard-stats');
    return response.data;
  },

  // Get specific account details
  getAccountDetails: async (accountId: number): Promise<AccountDetails> => {
    const response = await apiClient.get(`/accounts/${accountId}`);
    return response.data;
  },

  // Sync account data
  syncAccount: async (accountId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/accounts/${accountId}/sync`);
    return response.data;
  },

  // Add demo account (for testing)
  addDemoAccount: async (): Promise<{ success: boolean; message: string; account_id: number }> => {
    const response = await apiClient.post('/accounts/add-demo');
    return response.data;
  },

  // Disconnect account
  disconnectAccount: async (accountId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/accounts/${accountId}`);
    return response.data;
  },
};
