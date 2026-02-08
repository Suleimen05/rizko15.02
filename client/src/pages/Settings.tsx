import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, CheckCircle2, ExternalLink, RefreshCw, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ===== Platform SVG Icons =====
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const RedditIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// ===== Types =====
interface UsageData {
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
}

type PlatformKey = 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'reddit' | 'discord' | 'telegram';

interface ConnectedAccount {
  id?: number;
  platform: PlatformKey;
  connected: boolean;
  username?: string;
  followers?: number;
  lastSync?: string;
  platform_user_id?: string;
}

type SettingsTab = 'general' | 'accounts' | 'usage' | 'billing';

// Platform config
const platformConfig: Record<PlatformKey, { name: string; icon: () => React.JSX.Element; color: string; description: string }> = {
  tiktok: {
    name: 'TikTok',
    icon: TikTokIcon,
    color: 'bg-black text-white',
    description: 'Video analytics and performance metrics.',
  },
  instagram: {
    name: 'Instagram',
    icon: InstagramIcon,
    color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white',
    description: 'Track posts, reels and stories.',
  },
  youtube: {
    name: 'YouTube',
    icon: YouTubeIcon,
    color: 'bg-red-600 text-white',
    description: 'Analyze videos and shorts performance.',
  },
  twitter: {
    name: 'X (Twitter)',
    icon: TwitterIcon,
    color: 'bg-black text-white',
    description: 'Track tweets and engagement metrics.',
  },
  reddit: {
    name: 'Reddit',
    icon: RedditIcon,
    color: 'bg-orange-600 text-white',
    description: 'Monitor subreddit trends and posts.',
  },
  discord: {
    name: 'Discord',
    icon: DiscordIcon,
    color: 'bg-indigo-600 text-white',
    description: 'Track server engagement and growth.',
  },
  telegram: {
    name: 'Telegram',
    icon: TelegramIcon,
    color: 'bg-sky-500 text-white',
    description: 'Analyze channel and group metrics.',
  },
};

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);

  // Determine initial tab from URL params
  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || 'general');

  // Usage data state
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Connected accounts state
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    { platform: 'tiktok', connected: false },
    { platform: 'instagram', connected: false },
    { platform: 'youtube', connected: false },
    { platform: 'twitter', connected: false },
    { platform: 'reddit', connected: false },
    { platform: 'discord', connected: false },
    { platform: 'telegram', connected: false },
  ]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Handle tab param from URL
  useEffect(() => {
    if (tabParam && ['general', 'accounts', 'usage', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Handle OAuth callback params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      toast.success(`Your ${success} account has been connected successfully!`);
      fetchConnectedAccounts();
      navigate('/dashboard/settings?tab=accounts', { replace: true });
    } else if (error) {
      toast.error(decodeURIComponent(error) || 'Failed to connect account. Please try again.');
      navigate('/dashboard/settings?tab=accounts', { replace: true });
    }
  }, [searchParams, navigate]);

  // Load usage data when Usage tab is opened
  useEffect(() => {
    if (activeTab === 'usage' && !usageData) {
      loadUsageData();
    }
  }, [activeTab]);

  // Load connected accounts when Accounts tab is opened
  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchConnectedAccounts();
    }
  }, [activeTab]);

  // ===== Usage handlers =====
  const loadUsageData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getUsageStats();
      setUsageData(data);
    } catch (error: any) {
      console.error('Failed to load usage data:', error);
      toast.error('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoMode = async () => {
    if (!usageData) return;

    setToggling(true);
    try {
      const newState = !usageData.auto_mode.enabled;
      const result = await apiService.toggleAutoMode(newState);

      setUsageData({
        ...usageData,
        auto_mode: {
          ...usageData.auto_mode,
          enabled: result.enabled
        }
      });

      toast.success(result.message);
    } catch (error: any) {
      console.error('Failed to toggle auto mode:', error);
      toast.error(error.response?.data?.detail || 'Failed to toggle Auto Mode');
    } finally {
      setToggling(false);
    }
  };

  // ===== Connected accounts handlers =====
  const fetchConnectedAccounts = async () => {
    try {
      setAccountsLoading(true);
      const accessToken = await getAccessToken();
      const response = await fetch(`${API_BASE}/oauth/accounts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(prev => prev.map(acc => {
          const connectedAcc = data.accounts?.find(
            (a: { platform: string }) => a.platform === acc.platform
          );
          if (connectedAcc) {
            return {
              ...acc,
              id: connectedAcc.id,
              connected: true,
              username: connectedAcc.username || `@${acc.platform}_user`,
              followers: connectedAcc.followers,
              lastSync: connectedAcc.connected_at,
              platform_user_id: connectedAcc.platform_user_id,
            };
          }
          return { ...acc, connected: false };
        }));
      }
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Please log in to connect your account');
        setConnecting(null);
        return;
      }
      const oauthUrl = `${API_BASE}/oauth/${platform}?token=${encodeURIComponent(accessToken)}`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      toast.error('Failed to connect. Please try again.');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    const account = accounts.find(a => a.platform === platform);
    if (!account?.id) return;

    setDisconnecting(platform);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${API_BASE}/oauth/accounts/${account.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        setAccounts(prev => prev.map(acc =>
          acc.platform === platform
            ? { platform: acc.platform, connected: false }
            : acc
        ));
        toast.success(`Your ${platform} account has been disconnected.`);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect account. Please try again.');
    } finally {
      setDisconnecting(null);
    }
  };

  const connectedCount = accounts.filter(a => a.connected).length;

  // ===== Tab change handler =====
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    // Update URL without full navigation
    navigate(`/dashboard/settings?tab=${tab}`, { replace: true });
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Categories */}
      <div className="w-64 border-r border-border bg-card/50 p-4">
        <nav className="space-y-1">
          {([
            { key: 'general' as const, label: 'General' },
            { key: 'accounts' as const, label: 'Accounts' },
            { key: 'usage' as const, label: 'Usage' },
            { key: 'billing' as const, label: 'Billing' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-7 w-7" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account preferences and notifications
            </p>
          </div>

          {/* ===== GENERAL TAB ===== */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Profile Settings */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  👤 Profile
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Full name</label>
                    <input
                      type="text"
                      placeholder="Akylbek Karim"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <input
                      type="email"
                      placeholder="akylbekkarim01@gmail.com"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Preferences */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🎨 Preferences
                </h3>

                <div className="space-y-4">
                  {/* Dark Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Enable dark theme</p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        theme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Language & Region */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Language</label>
                      <select className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Region</label>
                      <select className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>United States</option>
                        <option>United Kingdom</option>
                        <option>Canada</option>
                        <option>Australia</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🔔 Notifications
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Get emails about trends and updates</p>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        emailNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Weekly Summary</p>
                      <p className="text-xs text-muted-foreground">Receive weekly usage reports</p>
                    </div>
                    <button
                      onClick={() => setWeeklySummary(!weeklySummary)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        weeklySummary ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          weeklySummary ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== ACCOUNTS TAB ===== */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* Connected Accounts - Full OAuth integration */}
              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                    <p className="text-muted-foreground">Loading connected accounts...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Connected Accounts</p>
                          <p className="text-2xl font-bold">{connectedCount} of {accounts.length}</p>
                        </div>
                        <div className="flex gap-2">
                          {accounts.map(acc => (
                            <div
                              key={acc.platform}
                              className={`w-3 h-3 rounded-full ${
                                acc.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Platform Cards */}
                  <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                    {accounts.map(account => {
                      const config = platformConfig[account.platform];
                      const Icon = config.icon;

                      return (
                        <Card key={account.platform} className="relative overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                                <Icon />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{config.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{config.description}</p>
                              </div>
                            </div>

                            {account.connected ? (
                              <div className="space-y-2.5">
                                {/* Connected info */}
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                  <span className="text-xs text-green-600 font-medium truncate">{account.username}</span>
                                </div>

                                <div className="flex gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => handleConnect(account.platform)}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Sync
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    onClick={() => handleDisconnect(account.platform)}
                                    disabled={disconnecting === account.platform}
                                  >
                                    {disconnecting === account.platform ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Disconnect'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                className="w-full h-8 text-xs"
                                size="sm"
                                onClick={() => handleConnect(account.platform)}
                                disabled={connecting === account.platform}
                              >
                                {connecting === account.platform ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="h-3 w-3 mr-1.5" />
                                    Connect
                                  </>
                                )}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Security Info */}
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Your data is secure</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          We only access your public profile information and video statistics.
                          We never post on your behalf or access private messages.
                          You can disconnect at any time.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Account Security */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🔐 Account Security
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Password</label>
                    <input
                      type="password"
                      value="••••••••••••"
                      disabled
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                    />
                  </div>

                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                    Change Password
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                  ⚠️ Danger Zone
                </h3>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== USAGE TAB ===== */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading usage data...</p>
                  </div>
                </div>
              ) : usageData ? (
                <>
                  {/* Current Plan */}
                  <div className="rounded-lg border border-border bg-card p-6">
                    <div>
                      <h3 className="text-lg font-semibold">Your Plan: {usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1)}</h3>
                      <p className="text-sm text-muted-foreground">Resets: {new Date(usageData.reset_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* AI Credits */}
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      💎 AI Credits
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {usageData.credits.monthly_limit - usageData.credits.monthly_used} / {usageData.credits.monthly_limit} remaining
                          </span>
                          <span className="text-sm font-medium">
                            {Math.round(((usageData.credits.monthly_limit - usageData.credits.monthly_used) / usageData.credits.monthly_limit) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                            style={{ width: `${Math.round(((usageData.credits.monthly_limit - usageData.credits.monthly_used) / usageData.credits.monthly_limit) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-2 space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Bonus Credits: <span className="text-foreground font-medium">{usageData.credits.bonus}</span> (never expire)
                        </p>
                        <p className="text-muted-foreground">
                          Rollover: <span className="text-foreground font-medium">{usageData.credits.rollover}</span> (from last month)
                        </p>
                      </div>

                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">
                          Total Available: <span className="text-lg">{usageData.credits.total_available} credits</span>
                        </p>
                      </div>

                      <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                        Buy More Credits
                      </button>
                    </div>
                  </div>

                  {/* This Month Stats */}
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      📊 This Month
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">AI Scripts Generated</span>
                        <span className="font-medium">{usageData.stats.scripts_generated}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Chat Messages</span>
                        <span className="font-medium">{usageData.stats.chat_messages}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Deep Analyze</span>
                        <span className="font-medium">{usageData.stats.deep_analyze}</span>
                      </div>
                      <div className="pt-2 border-t border-border mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Credits Used</span>
                          <span className="font-semibold">{usageData.credits.monthly_used}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto Mode */}
                  <div className="rounded-lg border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        🤖 Auto Mode
                      </h3>
                      <button
                        onClick={handleToggleAutoMode}
                        disabled={toggling}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          usageData.auto_mode.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                        } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            usageData.auto_mode.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      AI automatically chooses the best model for each task
                    </p>

                    {usageData.auto_mode.enabled && usageData.auto_mode.savings > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm">
                          💰 <span className="font-medium text-green-600 dark:text-green-400">
                            Saved this month: {usageData.auto_mode.savings} credits
                          </span> vs manual Pro model
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Failed to load usage data</p>
                  <button
                    onClick={loadUsageData}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== BILLING TAB ===== */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  💳 Current Plan
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/50 dark:border-purple-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-lg">Creator Plan</p>
                        <p className="text-sm text-muted-foreground">$20/month</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Next billing: Feb 28, 2026</p>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition">
                      Upgrade to Pro
                    </button>
                    <button className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-accent transition">
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  💰 Payment Method
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="text-sm font-medium">•••• •••• •••• 6411</p>
                        <p className="text-xs text-muted-foreground">Expires 12/27</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition">
                      Edit
                    </button>
                  </div>

                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
                    Update Payment Method
                  </button>
                </div>
              </div>

              {/* Billing History */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🧾 Billing History
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Feb 1, 2026</p>
                      <p className="text-xs text-muted-foreground">Creator Plan - Monthly</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">$20.00</span>
                      <button className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition">
                        Invoice
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Jan 1, 2026</p>
                      <p className="text-xs text-muted-foreground">Creator Plan - Monthly</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">$20.00</span>
                      <button className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition">
                        Invoice
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">Dec 1, 2025</p>
                      <p className="text-xs text-muted-foreground">Creator Plan - Monthly</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">$20.00</span>
                      <button className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition">
                        Invoice
                      </button>
                    </div>
                  </div>

                  <button className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
                    View All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export with original name for compatibility
export { SettingsPage as Settings };
