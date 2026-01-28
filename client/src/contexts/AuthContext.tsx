import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  updateUserSettings: (settings: Partial<User['preferences']>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// DEV MODE - set to true for local development without auth
const DEV_MODE = true;

const DEV_USER: User = {
  id: 'dev-user-123',
  email: 'akylbek@trendscout.ai',
  name: 'akylbek',
  avatar: '',
  subscription: 'pro',
  credits: 999,
  preferences: {
    niches: ['entertainment', 'education'],
    languages: ['en'],
    regions: ['US'],
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(DEV_MODE ? DEV_USER : null);
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_MODE);
  const [isLoading, setIsLoading] = useState(!DEV_MODE);

  // Convert Supabase user to our User type
  const convertToUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      avatar: supabaseUser.user_metadata?.avatar_url || '',
      subscription: 'pro',  // Default to Pro for all users (change in production)
      credits: 150,
      preferences: {
        niches: ['entertainment', 'education'],
        languages: ['en'],
        regions: ['US'],
      },
    };
  };

  // Check authentication status
  const checkAuth = async () => {
    // Skip auth check in DEV mode
    if (DEV_MODE) {
      setUser(DEV_USER);
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(convertToUser(session.user));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Register new user
  const register = async (
    email: string,
    password: string,
    fullName: string = 'User'
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setUser(convertToUser(data.user));
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Login user
  const login = async (email: string, password: string): Promise<void> => {
    // DEV MODE - instant login without Supabase
    if (DEV_MODE) {
      setUser(DEV_USER);
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(convertToUser(data.user));
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  // Update user settings (placeholder - you can extend with Supabase tables)
  const updateUserSettings = (settings: Partial<User['preferences']>) => {
    if (!user) return;

    setUser({
      ...user,
      preferences: {
        ...user.preferences,
        ...settings,
      },
    });
  };

  // Listen for auth state changes
  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(convertToUser(session.user));
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        signInWithGoogle,
        logout,
        checkAuth,
        updateUserSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
