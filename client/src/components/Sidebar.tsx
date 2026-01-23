import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Users,
  UserSearch,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  Sparkles,
  Crown,
  ArrowUpRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Trending Now',
    href: '/trending',
    icon: TrendingUp,
    badge: 'NEW',
    badgeVariant: 'default' as const,
  },
  {
    title: 'Discover Videos',
    href: '/discover',
    icon: Search,
  },
  {
    title: 'Account Audit',
    href: '/account-search',
    icon: UserSearch,
  },
  {
    title: 'Competitors',
    href: '/competitors',
    icon: Users,
  },
  {
    title: 'AI Scripts',
    href: '/ai-scripts',
    icon: Sparkles,
    badge: 'PRO',
    badgeVariant: 'secondary' as const,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
];

export function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Mock user data - replace with real data from auth context
  const user = {
    name: 'Demo User',
    email: 'demo@viraltrend.ai',
    avatar: null,
    plan: 'Free',
    usage: {
      current: 8,
      limit: 10,
      percentage: 80,
    },
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold text-sm shadow-lg">
              VT
            </div>
            <span className="font-semibold text-foreground">ViralTrend AI</span>
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
      </nav>

      {/* Bottom Section */}
      <div className="border-t">
        {/* Upgrade Card */}
        {open && (
          <div className="p-3 pt-0">
            <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-foreground">
                  {user.plan} Plan
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {user.usage.current}/{user.usage.limit} searches used
                  </span>
                  <span className="font-medium text-foreground">
                    {user.usage.percentage}%
                  </span>
                </div>
                <Progress value={user.usage.percentage} className="h-2" />
              </div>

              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
              >
                Upgrade
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* User Profile with Dropdown */}
        {open && (
          <div className="p-3 pt-0 border-t relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-all"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white font-medium text-xs">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover border rounded-lg shadow-lg py-1 z-50">
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </NavLink>
                <NavLink
                  to="/help"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all"
                  onClick={() => setShowUserMenu(false)}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Help & Support</span>
                </NavLink>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-all text-red-600 dark:text-red-400"
                  onClick={() => {
                    setShowUserMenu(false);
                    // Handle logout
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
