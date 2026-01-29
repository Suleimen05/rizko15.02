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
  ChevronUp,
  LogOut,
  Rocket,
  Store,
  Globe,
  ArrowUpCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ComingSoonModal } from '@/components/ComingSoonModal';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
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

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
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
    onClose();
    navigate('/');
  };

  const handleNavClick = () => {
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-background border-r">
          {/* Header */}
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm shadow-lg">
                  TS
                </div>
                <SheetTitle className="font-semibold">Risko.ai</SheetTitle>
              </div>
            </div>
          </SheetHeader>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
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
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.title}</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    {item.badge}
                  </Badge>
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-3">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-all"
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

            {/* User Menu */}
            {showUserMenu && (
              <div className="mt-2 bg-accent/50 rounded-lg py-1">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
                  {user.email}
                </div>

                <NavLink
                  to="/dashboard/settings"
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-all"
                  onClick={handleNavClick}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </NavLink>

                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-all"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>Language</span>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showLanguageMenu && 'rotate-90')} />
                </button>

                {showLanguageMenu && (
                  <div className="ml-6 py-1">
                    {['English', 'Russian', 'Spanish'].map((lang) => (
                      <button
                        key={lang}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-all",
                          currentLanguage === lang && "text-purple-500"
                        )}
                        onClick={() => {
                          setCurrentLanguage(lang);
                          setShowLanguageMenu(false);
                        }}
                      >
                        {currentLanguage === lang && <span className="text-purple-500">•</span>}
                        <span>{lang === 'Russian' ? 'Русский' : lang === 'Spanish' ? 'Español' : lang}</span>
                      </button>
                    ))}
                  </div>
                )}

                <NavLink
                  to="/dashboard/help"
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-all"
                  onClick={handleNavClick}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Get help</span>
                </NavLink>

                <div className="border-t border-border/50 my-1" />

                <NavLink
                  to="/dashboard/pricing"
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-all"
                  onClick={handleNavClick}
                >
                  <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Upgrade plan</span>
                </NavLink>

                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-all"
                  onClick={() => setShowLearnMoreMenu(!showLearnMoreMenu)}
                >
                  <div className="flex items-center gap-3">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span>Learn more</span>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showLearnMoreMenu && 'rotate-90')} />
                </button>

                {showLearnMoreMenu && (
                  <div className="ml-6 py-1">
                    <NavLink to="/about" className="block px-3 py-1.5 text-sm hover:bg-accent" onClick={handleNavClick}>About</NavLink>
                    <NavLink to="/usage-policy" className="block px-3 py-1.5 text-sm hover:bg-accent" onClick={handleNavClick}>Usage policy</NavLink>
                    <NavLink to="/privacy-policy" className="block px-3 py-1.5 text-sm hover:bg-accent" onClick={handleNavClick}>Privacy policy</NavLink>
                    <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent" onClick={handleNavClick}>Your privacy choices</button>
                  </div>
                )}

                <div className="border-t border-border/50 my-1" />

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-all text-muted-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
    </>
  );
}
