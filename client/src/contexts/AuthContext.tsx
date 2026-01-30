/**
 * Enterprise Authentication Context
 *
 * Features:
 * - JWT token management (access + refresh)
 * - Automatic token refresh before expiry
 * - Secure localStorage persistence
 * - Supabase OAuth integration
 * - Type-safe user state
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode
} from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserSettings: (settings: Partial<User['preferences']>) => void;
  getAccessToken: () => Promise<string | null>;
  refreshTokens: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AUTH_STORAGE_KEY = 'risko_auth';
const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // Refresh 5 min before expiry

// API Base URL - must include /api prefix to match backend routes
// Uses same logic as api.ts for consistency
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api';
  }
  return 'https://xtrend-app.onrender.com/api';
};
const API_BASE_URL = getApiBaseUrl();

// Debug: log API URL on init (remove in production)
console.log('[AuthContext] API_BASE_URL:', API_BASE_URL);

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse JWT token to extract payload
 */
function parseJwt(token: string): { exp?: number; sub?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - TOKEN_REFRESH_MARGIN;
}

/**
 * Securely store auth data in localStorage
 */
function storeAuthData(tokens: TokenPair, user: User): void {
  try {
    const data = { tokens, user, timestamp: Date.now() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to store auth data:', error);
  }
}

/**
 * Retrieve auth data from localStorage
 */
function getStoredAuthData(): { tokens: TokenPair; user: User } | null {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Validate structure
    if (!parsed.tokens?.accessToken || !parsed.user?.id) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return { tokens: parsed.tokens, user: parsed.user };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

/**
 * Clear auth data from localStorage
 */
function clearAuthData(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Token Refresh Logic
  // ---------------------------------------------------------------------------

  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const timeUntilRefresh = expiresAt - Date.now() - TOKEN_REFRESH_MARGIN;

    if (timeUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        await refreshTokens();
      }, timeUntilRefresh);
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const storedData = getStoredAuthData();
    if (!storedData?.tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: storedData.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      const payload = parseJwt(data.access_token);
      const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000;

      const newTokens: TokenPair = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || storedData.tokens.refreshToken,
        expiresAt,
      };

      // Update state and storage
      setState((prev) => ({
        ...prev,
        tokens: newTokens,
      }));

      storeAuthData(newTokens, storedData.user);
      scheduleTokenRefresh(expiresAt);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      // On refresh failure, logout user
      await logout();
      return false;
    }
  }, [scheduleTokenRefresh]);

  // ---------------------------------------------------------------------------
  // Get Access Token (for API calls)
  // ---------------------------------------------------------------------------

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const storedData = getStoredAuthData();
    if (!storedData?.tokens) {
      return null;
    }

    // Check if token needs refresh
    if (isTokenExpired(storedData.tokens.expiresAt)) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        return null;
      }

      // Get updated token
      const updatedData = getStoredAuthData();
      return updatedData?.tokens?.accessToken || null;
    }

    return storedData.tokens.accessToken;
  }, [refreshTokens]);

  // ---------------------------------------------------------------------------
  // Convert Supabase User
  // ---------------------------------------------------------------------------

  const convertSupabaseUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split('@')[0] ||
            'User',
      avatar: supabaseUser.user_metadata?.avatar_url || '',
      subscription: 'free', // Default - will be fetched from backend
      credits: 0,
      preferences: {
        niches: [],
        languages: ['en'],
        regions: ['US'],
      },
    };
  };

  // ---------------------------------------------------------------------------
  // Check Authentication
  // ---------------------------------------------------------------------------

  const checkAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // First check localStorage for existing session
      const storedData = getStoredAuthData();

      if (storedData?.tokens && !isTokenExpired(storedData.tokens.expiresAt)) {
        setState({
          user: storedData.user,
          tokens: storedData.tokens,
          isAuthenticated: true,
          isLoading: false,
        });
        scheduleTokenRefresh(storedData.tokens.expiresAt);
        return;
      }

      // If stored token expired, try to refresh
      if (storedData?.tokens?.refreshToken) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          return;
        }
      }

      // Fall back to Supabase session check (for OAuth)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user && session?.access_token) {
        // Sync with our backend to get our JWT tokens
        try {
          const syncResponse = await fetch(`${API_BASE_URL}/auth/oauth/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              supabase_id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url,
              provider: session.user.app_metadata?.provider || 'google',
            }),
          });

          if (syncResponse.ok) {
            const data = await syncResponse.json();

            // Use our backend JWT tokens
            const payload = parseJwt(data.access_token);
            const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000;

            const tokens: TokenPair = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token || '',
              expiresAt,
            };

            const user: User = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.full_name || data.user.email.split('@')[0],
              avatar: data.user.avatar_url || '',
              subscription: data.user.subscription_tier || 'free',
              credits: data.user.credits || 0,
              preferences: {
                niches: [],
                languages: ['en'],
                regions: ['US'],
              },
            };

            setState({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
            });

            storeAuthData(tokens, user);
            scheduleTokenRefresh(expiresAt);
            return;
          }
        } catch (syncError) {
          console.error('OAuth sync error during checkAuth:', syncError);
        }

        // Fallback to Supabase-only (limited functionality)
        const user = convertSupabaseUser(session.user);
        const payload = parseJwt(session.access_token);
        const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000;

        const tokens: TokenPair = {
          accessToken: session.access_token,
          refreshToken: session.refresh_token || '',
          expiresAt,
        };

        setState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });

        storeAuthData(tokens, user);
        scheduleTokenRefresh(expiresAt);
      } else {
        clearAuthData();
        setState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthData();
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [scheduleTokenRefresh, refreshTokens]);

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  const login = async (email: string, password: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Call our backend API
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();

      // Fetch user profile
      const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profile = await profileResponse.json();

      const payload = parseJwt(data.access_token);
      const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000;

      const tokens: TokenPair = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt,
      };

      const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email.split('@')[0],
        avatar: profile.avatar_url || '',
        subscription: profile.subscription_tier || 'free',
        credits: profile.credits || 0,
        preferences: {
          niches: profile.preferences?.niches || [],
          languages: profile.preferences?.languages || ['en'],
          regions: profile.preferences?.regions || ['US'],
        },
      };

      setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });

      storeAuthData(tokens, user);
      scheduleTokenRefresh(expiresAt);
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      console.error('Login error:', error);
      throw new Error(error.message || 'Invalid email or password');
    }
  };

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------

  const register = async (
    email: string,
    password: string,
    fullName: string = 'User'
  ): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Call our backend API
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      // Auto-login after registration
      await login(email, password);
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  // ---------------------------------------------------------------------------
  // Google OAuth
  // ---------------------------------------------------------------------------

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  const logout = async (): Promise<void> => {
    try {
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Sign out from Supabase (if using OAuth)
      await supabase.auth.signOut();

      // Clear local storage
      clearAuthData();

      // Reset state
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Supabase logout fails
      clearAuthData();
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Update User Settings
  // ---------------------------------------------------------------------------

  const updateUserSettings = (settings: Partial<User['preferences']>) => {
    if (!state.user) return;

    const updatedUser = {
      ...state.user,
      preferences: {
        ...state.user.preferences,
        ...settings,
      },
    };

    setState((prev) => ({
      ...prev,
      user: updatedUser,
    }));

    // Update storage
    if (state.tokens) {
      storeAuthData(state.tokens, updatedUser);
    }

    // TODO: Sync with backend
  };

  // ---------------------------------------------------------------------------
  // Refresh User Data (for subscription updates, etc.)
  // ---------------------------------------------------------------------------

  const refreshUser = useCallback(async (): Promise<void> => {
    const storedData = getStoredAuthData();
    if (!storedData?.tokens?.accessToken) {
      return;
    }

    try {
      const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedData.tokens.accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profile = await profileResponse.json();

      const updatedUser: User = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email.split('@')[0],
        avatar: profile.avatar_url || '',
        subscription: profile.subscription_tier || 'free',
        credits: profile.credits || 0,
        preferences: state.user?.preferences || {
          niches: [],
          languages: ['en'],
          regions: ['US'],
        },
      };

      setState((prev) => ({
        ...prev,
        user: updatedUser,
      }));

      storeAuthData(storedData.tokens, updatedUser);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [state.user?.preferences]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    checkAuth();

    // Listen for Supabase auth state changes (for OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && session?.access_token) {
          // Sync with our backend to get our JWT tokens
          try {
            const syncResponse = await fetch(`${API_BASE_URL}/auth/oauth/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                supabase_id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                avatar_url: session.user.user_metadata?.avatar_url,
                provider: session.user.app_metadata?.provider || 'google',
              }),
            });

            if (!syncResponse.ok) {
              throw new Error('Failed to sync OAuth user');
            }

            const data = await syncResponse.json();

            // Use our backend JWT tokens instead of Supabase tokens
            const payload = parseJwt(data.access_token);
            const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000;

            const tokens: TokenPair = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token || '',
              expiresAt,
            };

            const user: User = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.full_name || data.user.email.split('@')[0],
              avatar: data.user.avatar_url || '',
              subscription: data.user.subscription_tier || 'free',
              credits: data.user.credits || 0,
              preferences: {
                niches: [],
                languages: ['en'],
                regions: ['US'],
              },
            };

            setState({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
            });

            storeAuthData(tokens, user);
            scheduleTokenRefresh(expiresAt);
          } catch (error) {
            console.error('OAuth sync error:', error);
            // Fallback to Supabase-only auth (limited functionality)
            const user = convertSupabaseUser(session.user);
            const payload = parseJwt(session.access_token);
            const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000;

            const tokens: TokenPair = {
              accessToken: session.access_token,
              refreshToken: session.refresh_token || '',
              expiresAt,
            };

            setState({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
            });

            storeAuthData(tokens, user);
            scheduleTokenRefresh(expiresAt);
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthData();
          setState({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        login,
        register,
        signInWithGoogle,
        logout,
        checkAuth,
        updateUserSettings,
        getAccessToken,
        refreshTokens,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
