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
  ScanEye,
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
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import type { TFunction } from 'i18next';

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

const getMainNavItems = (t: TFunction): NavItem[] => [
  { title: t('common:nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
  { title: t('common:nav.myPosts'), href: '/dashboard/my-videos', icon: Video },
];

const getToolsNavItems = (t: TFunction): NavItem[] => REVIEW_MODE
  ? [
      { title: t('common:nav.trending'), href: '/dashboard/trending', icon: TrendingUp, badge: 'NEW' },
      { title: t('common:nav.discover'), href: '/dashboard/discover', icon: Search },
      { title: t('common:nav.saved'), href: '/dashboard/saved', icon: Bookmark },
    ]
  : [
      { title: t('common:nav.trending'), href: '/dashboard/trending', icon: TrendingUp, badge: 'NEW' },
      { title: t('common:nav.discover'), href: '/dashboard/discover', icon: Search },
      { title: 'Super Vision', href: '/dashboard/super-vision', icon: ScanEye, badge: 'PRO' },
      { title: t('common:nav.deepAnalysis'), href: '/dashboard/analytics', icon: BarChart3 },
      { title: t('common:nav.saved'), href: '/dashboard/saved', icon: Bookmark },
      { title: t('common:nav.competitors'), href: '/dashboard/competitors', icon: Users },
    ];

const getAiNavItems = (t: TFunction): NavItem[] => REVIEW_MODE
  ? []
  : [
      { title: t('common:nav.aiChat'), href: '/dashboard/ai-workspace', icon: Sparkles, badge: 'AI' },
    ];

const getSupportNavItems = (t: TFunction): NavItem[] => [
  { title: t('common:nav.feedback'), href: '/dashboard/feedback', icon: MessageSquare },
  { title: t('common:nav.help'), href: '/dashboard/help', icon: HelpCircle },
];

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { t } = useTranslation('common');
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const mainNavItems = getMainNavItems(t);
  const toolsNavItems = getToolsNavItems(t);
  const aiNavItems = getAiNavItems(t);
  const supportNavItems = getSupportNavItems(t);

  const user = {
    name: authUser?.name || t('demo.user'),
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
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-nl-indigo via-nl-purple to-nl-pink" />
        )}
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
          active
            ? 'bg-gradient-to-br from-nl-indigo/20 via-nl-purple/20 to-nl-pink/20 text-primary'
            : 'text-muted-foreground group-hover:bg-secondary group-hover:text-foreground'
        )}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </div>
        <span className="flex-1">{item.title}</span>
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
        <SheetHeader className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <SheetTitle className="text-lg font-bold gradient-text">Rizko.ai</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          <ProjectSwitcher />
          <nav className="space-y-0.5">
            {mainNavItems.map((item) => (
              <MobileNavItem key={item.href} item={item} />
            ))}
          </nav>
          <MobileNavSection title={t('section.tools')} items={toolsNavItems} />
          {aiNavItems.length > 0 && (
            <MobileNavSection title={t('section.aiTools')} items={aiNavItems} />
          )}
          <MobileNavSection title={t('section.support')} items={supportNavItems} />
        </div>

        <div className="border-t border-border/50 p-3">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200',
              showUserMenu ? 'bg-secondary' : 'hover:bg-secondary/50'
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nl-indigo to-nl-purple text-white font-medium text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="font-medium text-sm text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{t('plan.label', { plan: user.plan })}</p>
            </div>
            <ChevronUp className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', showUserMenu && 'rotate-180')} />
          </button>

          {showUserMenu && (
            <div className="mt-2 glass-card py-2 rounded-xl">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/30 mb-1">
                {user.email}
              </div>

              <NavLink
                to="/dashboard/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all rounded-lg mx-1"
                onClick={handleNavClick}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>{t('nav.settings')}</span>
              </NavLink>

              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all rounded-lg mx-1"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{t('nav.language')}</span>
                </div>
                <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showLanguageMenu && 'rotate-90')} />
              </button>

              {showLanguageMenu && (
                <div className="ml-6 py-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-secondary/50 transition-all rounded-lg",
                        currentLanguage === lang.code && "text-purple-500"
                      )}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
                    >
                      {currentLanguage === lang.code && <span className="text-purple-500">•</span>}
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-border/30 my-1" />

              {!REVIEW_MODE && (
                <NavLink
                  to="/dashboard/pricing"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-all rounded-lg mx-1"
                  onClick={handleNavClick}
                >
                  <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>{t('nav.upgradePlan')}</span>
                </NavLink>
              )}

              <div className="border-t border-border/30 my-1" />

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 transition-all rounded-lg mx-1 text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>{t('nav.logOut')}</span>
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
