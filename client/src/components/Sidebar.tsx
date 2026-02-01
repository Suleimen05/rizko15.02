import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronUp,
  LogOut,
  Rocket,
  Store,
  Globe,
  ArrowUpCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ComingSoonModal } from '@/components/ComingSoonModal';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const mainNavItems = [
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
    badgeVariant: 'default' as const,
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
    title: 'Competitors',
    href: '/dashboard/competitors',
    icon: Users,
  },
  {
    title: 'Feedback',
    href: '/dashboard/feedback',
    icon: MessageSquare,
  },
];

// Coming soon items that open modals instead of navigating
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

export function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showLearnMoreMenu, setShowLearnMoreMenu] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('English');

  // Use auth user data or fallback to demo
  const user = {
    name: authUser?.name || 'Demo User',
    email: authUser?.email || 'demo@trendscout.ai',
    avatar: authUser?.avatar || null,
    plan: authUser?.subscription || 'Free',
    usage: {
      current: 8,
      limit: 10,
      percentage: 80,
    },
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-background transition-all duration-300',
        open ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {open && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm shadow-lg">
              TS
            </div>
            <span className="font-semibold text-foreground">Rizko.ai</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(!open && 'w-full justify-center')}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', !open && 'rotate-180')} />
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                !open && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {open && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant}
                      className={cn(
                        'ml-auto text-[10px] px-1.5 py-0',
                        item.badge === 'NEW' && 'bg-green-500/10 text-green-600 border-green-500/20',
                        item.badge === 'PRO' && 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Coming Soon Items */}
        {comingSoonItems.map((item) => {
          const Icon = item.icon;
          const handleClick = () => {
            if (item.modalType === 'publish') {
              setShowPublishModal(true);
            } else if (item.modalType === 'marketplace') {
              setShowMarketplaceModal(true);
            }
          };

          return (
            <button
              key={item.title}
              onClick={handleClick}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                !open && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {open && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    {item.badge}
                  </Badge>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section - User Profile */}
      <div className="border-t relative">
        {open && (
          <>
            {/* User Profile Button */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium text-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.plan} plan</p>
              </div>
              <ChevronUp className={cn('h-4 w-4 text-muted-foreground transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {/* Dropdown Menu (opens upward) */}
            {showUserMenu && (
              <div className="absolute bottom-full left-2 right-2 mb-2 bg-popover border rounded-xl shadow-xl py-2 z-50">
                {/* Email Header */}
                <div className="px-4 py-2 text-sm text-muted-foreground border-b mb-1">
                  {user.email}
                </div>

                {/* Settings Group */}
                <NavLink
                  to="/dashboard/settings"
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-all"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </div>
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
                    <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showLanguageMenu && 'rotate-90')} />
                  </button>

                  {/* Language Submenu */}
                  {showLanguageMenu && (
                    <div className="absolute left-full top-0 ml-1 bg-popover border rounded-lg shadow-xl py-1 min-w-[140px] z-50">
                      <button
                        className={cn(
                          "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all",
                          currentLanguage === 'English' && "text-purple-500"
                        )}
                        onClick={() => {
                          setCurrentLanguage('English');
                          setShowLanguageMenu(false);
                          setShowUserMenu(false);
                        }}
                      >
                        {currentLanguage === 'English' && <span className="text-purple-500">•</span>}
                        <span>English</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all",
                          currentLanguage === 'Russian' && "text-purple-500"
                        )}
                        onClick={() => {
                          setCurrentLanguage('Russian');
                          setShowLanguageMenu(false);
                          setShowUserMenu(false);
                        }}
                      >
                        {currentLanguage === 'Russian' && <span className="text-purple-500">•</span>}
                        <span>Русский</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all",
                          currentLanguage === 'Spanish' && "text-purple-500"
                        )}
                        onClick={() => {
                          setCurrentLanguage('Spanish');
                          setShowLanguageMenu(false);
                          setShowUserMenu(false);
                        }}
                      >
                        {currentLanguage === 'Spanish' && <span className="text-purple-500">•</span>}
                        <span>Español</span>
                      </button>
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

                {/* Divider */}
                <div className="border-t my-1" />

                {/* Upgrade Group */}
                <NavLink
                  to="/dashboard/pricing"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all"
                  onClick={() => setShowUserMenu(false)}
                >
                  <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Upgrade plan</span>
                </NavLink>

                <div className="relative">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-all"
                    onClick={() => setShowLearnMoreMenu(!showLearnMoreMenu)}
                  >
                    <div className="flex items-center gap-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>Learn more</span>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showLearnMoreMenu && 'rotate-90')} />
                  </button>

                  {/* Learn More Submenu */}
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
                        <span>About</span>
                      </NavLink>
                      <NavLink
                        to="/usage-policy"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all"
                        onClick={() => {
                          setShowLearnMoreMenu(false);
                          setShowUserMenu(false);
                        }}
                      >
                        <span>Usage policy</span>
                      </NavLink>
                      <NavLink
                        to="/privacy-policy"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all"
                        onClick={() => {
                          setShowLearnMoreMenu(false);
                          setShowUserMenu(false);
                        }}
                      >
                        <span>Privacy policy</span>
                      </NavLink>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-all text-left"
                        onClick={() => {
                          setShowLearnMoreMenu(false);
                          setShowUserMenu(false);
                        }}
                      >
                        <span>Your privacy choices</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t my-1" />

                {/* Logout */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all text-muted-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Coming Soon Modals */}
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
