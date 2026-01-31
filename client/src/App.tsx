import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LandingPage } from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { UnifiedSidebar } from '@/components/UnifiedSidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Trending } from '@/pages/Trending';
import { Discover } from '@/pages/Discover';
import { DeepAnalysis } from '@/pages/DeepAnalysis';
import { AIScripts } from '@/pages/AIScripts';
import { AIWorkspace } from '@/pages/AIWorkspace';
import { WorkflowBuilder } from '@/pages/WorkflowBuilder';
import { Competitors } from '@/pages/Competitors';
import { AccountSearch } from '@/pages/AccountSearch';
import { SettingsPage } from '@/pages/Settings';
import { Help } from '@/pages/Help';
import { Pricing } from '@/pages/Pricing';
import { UsagePolicy } from '@/pages/UsagePolicy';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { DataDeletion } from '@/pages/DataDeletion';
import { Marketplace } from '@/pages/Marketplace';
import { Feedback } from '@/pages/Feedback';
import { Saved } from '@/pages/Saved';
import { MyVideosPage } from '@/pages/MyVideos';
import { ConnectAccountsPage } from '@/pages/ConnectAccounts';
import { OAuthCallback } from '@/pages/OAuthCallback';
import { useAppState } from '@/hooks/useAppState';
import { Toaster } from '@/components/ui/sonner';

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Risko.ai</h1>
          <p className="text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Dashboard Layout
function DashboardLayout() {
  const {
    sidebarOpen,
    toggleSidebar,
  } = useAppState();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Toggle between old sidebar and new unified sidebar
  // Change to 'A' or 'B' to test variants, or 'old' for original
  const sidebarVariant = 'A' as const;
  const useOldSidebar = false;

  // Full-width pages without padding (like workflow builder)
  const isFullWidthPage = location.pathname.includes('/ai-scripts') || location.pathname.includes('/ai-workspace');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      {useOldSidebar ? (
        <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
      ) : (
        <UnifiedSidebar variant={sidebarVariant} />
      )}

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Mobile only (hidden for full-width pages) */}
        {!isFullWidthPage && (
          <Header onToggleSidebar={() => setMobileMenuOpen(true)} />
        )}

        {/* Page Content */}
        <main className={isFullWidthPage ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto bg-muted/30"}>
          {isFullWidthPage ? (
            <Routes>
              <Route path="/ai-scripts" element={<WorkflowBuilder />} />
              <Route path="/ai-workspace" element={<AIWorkspace />} />
            </Routes>
          ) : (
            <div className="container mx-auto px-4 md:px-6 py-6 md:pt-8 max-w-7xl">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/my-videos" element={<MyVideosPage />} />
                <Route path="/connect-accounts" element={<ConnectAccountsPage />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/discover/*" element={<Discover />} />
                <Route path="/analytics" element={<DeepAnalysis />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/ai-scripts-old" element={<AIScripts />} />
                <Route path="/account-search" element={<AccountSearch />} />
                <Route path="/competitors" element={<Competitors />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<Help />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/usage-policy" element={<UsagePolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          )}
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

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
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
