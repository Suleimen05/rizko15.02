import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Link2, CheckCircle2, XCircle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Иконки платформ как SVG компоненты
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface ConnectedAccount {
  id?: number;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter';
  connected: boolean;
  username?: string;
  followers?: number;
  lastSync?: string;
  platform_user_id?: string;
}

export function ConnectAccountsPage() {
  const { getAccessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Состояние подключенных аккаунтов
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    { platform: 'tiktok', connected: false },
    { platform: 'instagram', connected: false },
    { platform: 'youtube', connected: false },
    { platform: 'twitter', connected: false },
  ]);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Обработка success параметра после OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      // Показываем toast и очищаем URL параметры
      toast.success(`Your ${success} account has been connected successfully!`);
      // Перезагружаем список аккаунтов
      fetchConnectedAccounts();
      // Убираем параметры из URL
      navigate('/dashboard/connect-accounts', { replace: true });
    } else if (error) {
      toast.error(decodeURIComponent(error) || 'Failed to connect account. Please try again.');
      navigate('/dashboard/connect-accounts', { replace: true });
    }
  }, [searchParams, navigate]);

  // Загрузка подключенных аккаунтов при монтировании
  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken();
      const response = await fetch(`${API_BASE}/oauth/accounts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Обновляем состояние аккаунтов на основе данных API
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
      setLoading(false);
    }
  };

  // Обработчик подключения OAuth - редирект на бэкенд
  const handleConnect = async (platform: string) => {
    setConnecting(platform);

    try {
      // Получаем токен для авторизации
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Please log in to connect your account');
        setConnecting(null);
        return;
      }

      // Редирект на OAuth endpoint с токеном в query параметре
      // API_BASE уже содержит /api, поэтому добавляем только /oauth/
      const oauthUrl = `${API_BASE}/oauth/${platform}?token=${encodeURIComponent(accessToken)}`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      toast.error('Failed to connect. Please try again.');
      setConnecting(null);
    }
  };

  // Обработчик отключения
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

  // Конфигурация платформ
  const platformConfig = {
    tiktok: {
      name: 'TikTok',
      icon: TikTokIcon,
      color: 'bg-black text-white',
      description: 'Connect your TikTok account to see video analytics and performance metrics.',
    },
    instagram: {
      name: 'Instagram',
      icon: InstagramIcon,
      color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white',
      description: 'Connect your Instagram Business account to track posts, reels and stories.',
    },
    youtube: {
      name: 'YouTube',
      icon: YouTubeIcon,
      color: 'bg-red-600 text-white',
      description: 'Connect your YouTube channel to analyze videos and shorts performance.',
    },
    twitter: {
      name: 'X (Twitter)',
      icon: TwitterIcon,
      color: 'bg-black text-white',
      description: 'Connect your X account to track tweets and engagement metrics.',
    },
  };

  const connectedCount = accounts.filter(a => a.connected).length;

  // Показываем загрузку
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          <p className="text-muted-foreground">Loading connected accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Link2 className="h-7 w-7" />
          Connect Accounts
        </h1>
        <p className="text-muted-foreground">
          Link your social media accounts to see all your analytics in one place.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Connected Accounts</p>
              <p className="text-2xl font-bold">{connectedCount} of 4</p>
            </div>
            <div className="flex gap-2">
              {accounts.map(acc => (
                <div
                  key={acc.platform}
                  className={`w-3 h-3 rounded-full ${
                    acc.connected ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {accounts.map(account => {
          const config = platformConfig[account.platform];
          const Icon = config.icon;

          return (
            <Card key={account.platform} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${config.color}`}>
                    <Icon />
                  </div>
                  {account.connected ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not connected
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3">{config.name}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>

              <CardContent>
                {account.connected ? (
                  <div className="space-y-4">
                    {/* Connected Account Info */}
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Account</span>
                        <span className="font-medium">{account.username}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Followers</span>
                        <span className="font-medium">
                          {account.followers?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last synced</span>
                        <span className="font-medium text-xs">
                          {account.lastSync
                            ? new Date(account.lastSync).toLocaleString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnect(account.platform)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDisconnect(account.platform)}
                        disabled={disconnecting === account.platform}
                      >
                        {disconnecting === account.platform ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(account.platform)}
                    disabled={connecting === account.platform}
                  >
                    {connecting === account.platform ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect {config.name}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Your data is secure
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                We only access your public profile information and video statistics.
                We never post on your behalf or access private messages.
                You can disconnect at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Добавляем иконку Shield для import
import { Shield } from 'lucide-react';
