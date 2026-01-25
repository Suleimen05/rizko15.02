import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Users,
  UserSearch,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronUp,
  LogOut,
  Rocket,
  Store,
  Globe,
  ArrowUpCircle,
  Info,
  ChevronRight,
  Plus,
  MessageSquare,
  Star,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ComingSoonModal } from '@/components/ComingSoonModal';

interface UnifiedSidebarProps {
  variant: 'A' | 'B';
}

// Trends tab navigation items
const trendsNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Trending Now',
    href: '/dashboard/trending',
    icon: TrendingUp,
    badge: 'NEW',
  },
  {
    title: 'Discover Videos',
    href: '/dashboard/discover',
    icon: Search,
  },
  {
    title: 'Deep Analysis',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Account Audit',
    href: '/dashboard/account-search',
    icon: UserSearch,
  },
  {
    title: 'Competitors',
    href: '/dashboard/competitors',
    icon: Users,
  },
];

// Coming soon items
const comingSoonItems = [
  {
    title: 'Publish Hub',
    icon: Rocket,
    badge: 'BETA',
    modalType: 'publish' as const,
  },
  {
    title: 'Marketplace',
    icon: Store,
    badge: 'BETA',
    modalType: 'marketplace' as const,
  },
];

// Mock data for Scripts history
const mockScriptsHistory = [
  { id: '1', title: 'TikTok Script Ideas', time: 'Today', saved: false },
  { id: '2', title: 'Instagram Reels Strategy', time: 'Today', saved: false },
  { id: '3', title: 'Viral Hook Templates', time: 'Yesterday', saved: true },
  { id: '4', title: 'Content Calendar Plan', time: 'Yesterday', saved: false },
  { id: '5', title: 'Brand Voice Guide', time: '2 days ago', saved: true },
];

// Mock data for Trends history (variant B)
const mockTrendsHistory = [
  { id: '1', title: 'Dance challenges 2024', time: 'Today' },
  { id: '2', title: 'AI tools viral', time: 'Today' },
  { id: '3', title: 'Cooking hacks trending', time: 'Yesterday' },
  { id: '4', title: 'Fitness motivation', time: 'Yesterday' },
  { id: '5', title: 'Tech reviews TikTok', time: '3 days ago' },
];

export function UnifiedSidebar({ variant }: UnifiedSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'trends' | 'scripts'>('trends');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showLearnMoreMenu, setShowLearnMoreMenu] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('English');

  const user = {
    name: authUser?.name || 'Demo User',
    email: authUser?.email || 'demo@trendscout.ai',
    avatar: authUser?.avatar || null,
    plan: authUser?.subscription || 'Free',
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  // Auto-switch tab based on route
  useEffect(() => {
    const isAIScriptsPage = location.pathname.includes('/ai-scripts');
    if (isAIScriptsPage) {
      setActiveTab('scripts');
    } else {
      setActiveTab('trends');
    }
  }, [location.pathname]);

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-background">
      {/* Header with Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm shadow-lg">
            TS
          </div>
          <span className="font-semibold text-foreground">TrendScout AI</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-2 border-b">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => {
              setActiveTab('trends');
              navigate('/dashboard');
            }}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              activeTab === 'trends'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Trends
          </button>
          <button
            onClick={() => {
              setActiveTab('scripts');
              navigate('/dashboard/ai-scripts');
            }}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              activeTab === 'scripts'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Scripts
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'trends' ? (
          // TRENDS TAB
          <div className="p-2">
            {variant === 'A' ? (
              // Variant A: Navigation menu
              <nav className="space-y-1">
                {trendsNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  );
                })}

                {/* Coming Soon Items */}
                <div className="pt-2 mt-2 border-t">
                  {comingSoonItems.map((item) => {
                    const Icon = item.icon;
                    const handleClick = () => {
                      if (item.modalType === 'publish') {
                        setShowPublishModal(true);
                      } else if (item.modalType === 'marketplace') {
                        navigate('/dashboard/marketplace');
                      }
                    };

                    return (
                      <button
                        key={item.title}
                        onClick={handleClick}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.title}</span>
                        <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                          {item.badge}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </nav>
            ) : (
              // Variant B: Search history
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => navigate('/dashboard/discover')}
                >
                  <Plus className="h-4 w-4" />
                  New Search
                </Button>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                    Recent Searches
                  </p>
                  {mockTrendsHistory.map((item) => (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-all group"
                    >
                      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{item.title}</span>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                        {item.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // SCRIPTS TAB
          <div className="p-2 space-y-3">
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => {
                // Create new chat logic
              }}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Today
              </p>
              {mockScriptsHistory
                .filter((item) => item.time === 'Today')
                .map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-all group"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.title}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      {item.saved && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Yesterday
              </p>
              {mockScriptsHistory
                .filter((item) => item.time === 'Yesterday')
                .map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-all group"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.title}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      {item.saved && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
            </div>

            {/* Saved section */}
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1">
                <Star className="h-3 w-3" />
                Saved
              </p>
              {mockScriptsHistory
                .filter((item) => item.saved)
                .map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-all group"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.title}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="border-t relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-all"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium text-sm">
            {user.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="font-medium text-sm text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.plan} plan</p>
          </div>
          <ChevronUp
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              showUserMenu && 'rotate-180'
            )}
          />
        </button>

        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-popover border rounded-xl shadow-xl py-2 z-50">
            <div className="px-4 py-2 text-sm text-muted-foreground border-b mb-1">
              {user.email}
            </div>

            <NavLink
              to="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all"
              onClick={() => setShowUserMenu(false)}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </NavLink>

            <div className="relative">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-all"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>Language</span>
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showLanguageMenu && 'rotate-90'
                  )}
                />
              </button>

              {showLanguageMenu && (
                <div className="absolute left-full top-0 ml-1 bg-popover border rounded-lg shadow-xl py-1 min-w-[140px] z-50">
                  {['English', 'Russian', 'Spanish'].map((lang) => (
                    <button
                      key={lang}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all',
                        currentLanguage === lang && 'text-purple-500'
                      )}
                      onClick={() => {
                        setCurrentLanguage(lang);
                        setShowLanguageMenu(false);
                        setShowUserMenu(false);
                      }}
                    >
                      {currentLanguage === lang && <span className="text-purple-500">•</span>}
                      <span>{lang === 'Russian' ? 'Русский' : lang === 'Spanish' ? 'Español' : lang}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <NavLink
              to="/dashboard/help"
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all"
              onClick={() => setShowUserMenu(false)}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span>Get help</span>
            </NavLink>

            <div className="border-t my-1" />

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all"
              onClick={() => {
                setShowUserMenu(false);
                navigate('/dashboard/pricing');
              }}
            >
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
              <span>Upgrade plan</span>
            </button>

            <div className="relative">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-all"
                onClick={() => setShowLearnMoreMenu(!showLearnMoreMenu)}
              >
                <div className="flex items-center gap-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span>Learn more</span>
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showLearnMoreMenu && 'rotate-90'
                  )}
                />
              </button>

              {showLearnMoreMenu && (
                <div className="absolute left-full top-0 ml-1 bg-popover border rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                  <NavLink
                    to="/about"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all"
                    onClick={() => {
                      setShowLearnMoreMenu(false);
                      setShowUserMenu(false);
                    }}
                  >
                    About
                  </NavLink>
                  <NavLink
                    to="/dashboard/usage-policy"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all"
                    onClick={() => {
                      setShowLearnMoreMenu(false);
                      setShowUserMenu(false);
                    }}
                  >
                    Usage policy
                  </NavLink>
                  <NavLink
                    to="/dashboard/privacy-policy"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all"
                    onClick={() => {
                      setShowLearnMoreMenu(false);
                      setShowUserMenu(false);
                    }}
                  >
                    Privacy policy
                  </NavLink>
                </div>
              )}
            </div>

            <div className="border-t my-1" />

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <ComingSoonModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        type="publish"
      />
      <ComingSoonModal
        isOpen={showMarketplaceModal}
        onClose={() => setShowMarketplaceModal(false)}
        type="marketplace"
      />
    </aside>
  );
}
