import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { WorkflowProvider } from '@/contexts/WorkflowContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { LandingPage } from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Trending } from '@/pages/Trending';
import { Discover } from '@/pages/Discover';
import { DeepAnalysis } from '@/pages/DeepAnalysis';
import { AIScripts } from '@/pages/AIScripts';
import { AIWorkspace } from '@/pages/AIWorkspace';
const WorkflowBuilder = lazy(() => import('@/pages/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })));
const Projects = lazy(() => import('@/pages/Projects').then(m => ({ default: m.default })));
const ProjectCreate = lazy(() => import('@/pages/ProjectCreate').then(m => ({ default: m.default })));
const ProjectEdit = lazy(() => import('@/pages/ProjectEdit').then(m => ({ default: m.default })));
const SuperVision = lazy(() => import('@/pages/SuperVision').then(m => ({ default: m.default })));
import { Competitors } from '@/pages/Competitors';
import { CompetitorFeed } from '@/pages/CompetitorFeed';
import { AccountSearch } from '@/pages/AccountSearch';
import { SettingsPage } from '@/pages/Settings';
import { Help } from '@/pages/Help';
import { Pricing } from '@/pages/Pricing';
import { UsagePolicy } from '@/pages/UsagePolicy';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfService } from '@/pages/TermsOfService';
import { DataPolicy } from '@/pages/DataPolicy';
import { DataDeletion } from '@/pages/DataDeletion';
import { Marketplace } from '@/pages/Marketplace';
import { Feedback } from '@/pages/Feedback';
import { Saved } from '@/pages/Saved';
import { MyVideosPage } from '@/pages/MyVideos';
import { OAuthCallback } from '@/pages/OAuthCallback';
import { Toaster } from '@/components/ui/sonner';

import { DevAccessGate } from '@/components/DevAccessGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { usePWA, useHaptic } from '@/hooks/usePWA';
import { useSwipe } from '@/hooks/useMobile';
import { useTranslation } from 'react-i18next';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Rizko.ai</h1>
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// PWA Update Banner & Offline Notifications (install moved to Settings)
function PWAStatusBanner() {
  const { updateAvailable, updateServiceWorker } = usePWA();
  const haptic = useHaptic();
  const { t } = useTranslation('common');

  // Network status notifications removed — not useful for end users

  if (updateAvailable) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{t('pwa.updateAvailable')}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => { haptic.success(); updateServiceWorker(); }} className="text-xs">
          {t('pwa.updateNow')}
        </Button>
      </div>
    );
  }

  return null;
}

// Dashboard Layout
function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const haptic = useHaptic();

  // Full-width pages without padding (like workflow builder)
  const isFullWidthPage = location.pathname.includes('/ai-scripts') || location.pathname.includes('/ai-workspace');

  // Swipe gestures for mobile sidebar
  const swipeHandlers = useSwipe(
    undefined, // swipe left - close sidebar
    () => {
      haptic.light();
      setMobileMenuOpen(true); // swipe right - open sidebar
    }
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - hidden for full-width pages (AI Scripts, AI Workspace) */}
      {!isFullWidthPage && <Sidebar />}

      {/* Mobile Sidebar */}
      {!isFullWidthPage && <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden" {...swipeHandlers}>
        {/* Header - Mobile only (hidden for full-width pages) */}
        {!isFullWidthPage && (
          <Header onToggleSidebar={() => { haptic.light(); setMobileMenuOpen(true); }} />
        )}

        {/* Page Content */}
        <main className={isFullWidthPage ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto bg-muted/30"}>
          {isFullWidthPage ? (
            <Suspense fallback={
              <div className="flex h-full bg-background">
                <div className="w-[52px] bg-card/80 border-r border-border" />
                <div className="flex-1 flex flex-col">
                  <div className="h-12 bg-card/95 border-b border-border" />
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
                  </div>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/ai-scripts" element={<WorkflowBuilder />} />
                <Route path="/ai-workspace" element={<AIWorkspace />} />
              </Routes>
            </Suspense>
          ) : (
            <div className="container mx-auto px-4 md:px-6 py-6 md:pt-8 max-w-7xl">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/my-videos" element={<MyVideosPage />} />
                <Route path="/connect-accounts" element={<Navigate to="/dashboard/settings?tab=accounts" replace />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/discover/*" element={<Discover />} />
                <Route path="/super-vision" element={<Suspense fallback={<div />}><SuperVision /></Suspense>} />
                <Route path="/analytics" element={<DeepAnalysis />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/ai-scripts-old" element={<AIScripts />} />
                <Route path="/account-search" element={<AccountSearch />} />
                <Route path="/competitors" element={<Competitors />} />
                <Route path="/competitors/:username/feed" element={<CompetitorFeed />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<Help />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/usage-policy" element={<UsagePolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/projects" element={<Suspense fallback={<div className="animate-pulse p-8">Loading...</div>}><Projects /></Suspense>} />
                <Route path="/projects/new" element={<Suspense fallback={<div className="animate-pulse p-8">Loading...</div>}><ProjectCreate /></Suspense>} />
                <Route path="/projects/:id/edit" element={<Suspense fallback={<div className="animate-pulse p-8">Loading...</div>}><ProjectEdit /></Suspense>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

// Create QueryClient instance with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - данные свежие
      gcTime: 5 * 60 * 1000, // 5 minutes - хранить в памяти
      retry: 1, // Повторить 1 раз при ошибке
      refetchOnWindowFocus: true, // Обновить при возврате на вкладку
      refetchOnReconnect: true, // Обновить при восстановлении интернета
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Rizko.ai</h1>
          </div>
        </div>
      }>
      <DevAccessGate>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider>
              <AuthProvider>
                <ProjectProvider>
                <ChatProvider>
                  <WorkflowProvider>
                {/* PWA Update Banner & Offline Notifications */}
                <PWAStatusBanner />

              <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Public legal & support pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/data-policy" element={<DataPolicy />} />
            <Route path="/help" element={<Help />} />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />

            {/* 404 catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </WorkflowProvider>
                </ChatProvider>
                </ProjectProvider>
          </AuthProvider>
        </ThemeProvider>

        {/* Global Toast Notifications */}
        <Toaster />
      </BrowserRouter>

      {/* React Query DevTools - только в development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    </DevAccessGate>
      </Suspense>
  </ErrorBoundary>
  );
}

export default App;
