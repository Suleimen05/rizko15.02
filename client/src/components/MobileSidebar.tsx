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
  Globe,
  ArrowUpCircle,
  ChevronRight,
  Bookmark,
  Video,
  Sparkles,
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
import { REVIEW_MODE } from '@/config/features';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

// Main navigation items
const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'My Posts',
    href: '/dashboard/my-videos',
    icon: Video,
  },
];

// Tools section
const toolsNavItems: NavItem[] = REVIEW_MODE
  ? [
      { title: 'Trending Now', href: '/dashboard/trending', icon: TrendingUp, badge: 'NEW' },
      { title: 'Discover Videos', href: '/dashboard/discover', icon: Search },
      { title: 'Saved', href: '/dashboard/saved', icon: Bookmark },
    ]
  : [
      { title: 'Trending Now', href: '/dashboard/trending', icon: TrendingUp, badge: 'NEW' },
      { title: 'Discover Videos', href: '/dashboard/discover', icon: Search },
      { title: 'Deep Analysis', href: '/dashboard/analytics', icon: BarChart3 },
      { title: 'Saved', href: '/dashboard/saved', icon: Bookmark },
      { title: 'Competitors', href: '/dashboard/competitors', icon: Users },
    ];

// AI Tools section (only outside Review Mode)
const aiNavItems: NavItem[] = REVIEW_MODE
  ? []
  : [
      { title: 'AI Scripts', href: '/dashboard/ai-scripts', icon: Sparkles, badge: 'AI' },
    ];

// Support items
const supportNavItems: NavItem[] = [
  { title: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
  { title: 'Help & FAQ', href: '/dashboard/help', icon: HelpCircle },
];

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('English');

  const user = {
    name: authUser?.name || 'Demo User',
    email: authUser?.email || 'demo@example.com',
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

  // Check if route is active
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const MobileNavItem = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <NavLink
        to={item.href}
        onClick={handleNavClick}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
          active
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {/* Active indicator bar */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-nl-indigo via-nl-purple to-nl-pink" />
        )}

        {/* Icon */}
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
          active
            ? 'bg-gradient-to-br from-nl-indigo/20 via-nl-purple/20 to-nl-pink/20 text-primary'
            : 'text-muted-foreground group-hover:bg-secondary group-hover:text-foreground'
        )}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </div>

        {/* Label */}
        <span className="flex-1">{item.title}</span>

        {/* Badge */}
        {item.badge && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-5 border-0 font-medium',
              item.badge === 'AI'
                ? 'bg-gradient-to-r from-nl-purple/20 to-nl-pink/20 text-primary'
                : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400'
            )}
          >
            {item.badge}
          </Badge>
        )}
      </NavLink>
    );
  };

  const MobileNavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="space-y-1">
      <p className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <MobileNavItem key={item.href} item={item} />
        ))}
      </nav>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col bg-background/95 backdrop-blur-xl border-r border-border/50">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <SheetTitle className="text-lg font-bold gradient-text">Rizko.ai</SheetTitle>
          </div>
        </SheetHeader>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {/* Main */}
          <nav className="space-y-0.5">
            {mainNavItems.map((item) => (
              <MobileNavItem key={item.href} item={item} />
            ))}
          </nav>

          {/* Tools */}
          <MobileNavSection title="Tools" items={toolsNavItems} />

          {/* AI Tools */}
          {aiNavItems.length > 0 && (
            <MobileNavSection title="AI Tools" items={aiNavItems} />
          )}

          {/* Support */}
          <MobileNavSection title="Support" items={supportNavItems} />
        </div>

        {/* User Section */}
        <div className="border-t border-border/50 p-3">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200',
              showUserMenu ? 'bg-secondary' : 'hover:bg-secondary/50'
            )}
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nl-indigo to-nl-purple text-white font-medium text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="font-medium text-sm text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.plan} Plan</p>
            </div>
            <ChevronUp className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', showUserMenu && 'rotate-180')} />
          </button>

          {/* User Menu */}
          {showUserMenu && (
            <div className="mt-2 glass-card py-2 rounded-xl">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/30 mb-1">
                {user.email}
              </div>

              {/* Settings */}
              <NavLink
                to="/dashboard/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all rounded-lg mx-1"
                onClick={handleNavClick}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </NavLink>

              {/* Language */}
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all rounded-lg mx-1"
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
                  {[
                    { key: 'English', label: 'English' },
                    { key: 'Russian', label: 'Русский' },
                    { key: 'Spanish', label: 'Español' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-secondary/50 transition-all rounded-lg",
                        currentLanguage === key && "text-purple-500"
                      )}
                      onClick={() => {
                        setCurrentLanguage(key);
                        setShowLanguageMenu(false);
                      }}
                    >
                      {currentLanguage === key && <span className="text-purple-500">•</span>}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-border/30 my-1" />

              {/* Upgrade Plan */}
              {!REVIEW_MODE && (
                <NavLink
                  to="/dashboard/pricing"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all rounded-lg mx-1"
                  onClick={handleNavClick}
                >
                  <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Upgrade Plan</span>
                </NavLink>
              )}

              <div className="border-t border-border/30 my-1" />

              {/* Logout */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 transition-all rounded-lg mx-1 text-muted-foreground hover:text-destructive"
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
  );
}
