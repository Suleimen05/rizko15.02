import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  Loader2,
  User,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useFormValidation';
import { PasswordStrength } from '@/components/PasswordStrength';

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<{ fullName?: boolean; email?: boolean; password?: boolean }>({});
  const { register, signInWithGoogle, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const isOnline = useOnlineStatus();

  // Inline validation
  const nameError = touched.fullName && !fullName.trim() ? 'Name is required'
    : touched.fullName && fullName.trim().length < 2 ? 'Minimum 2 characters'
    : '';
  const emailError = touched.email && !email.trim() ? 'Email is required'
    : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email address'
    : '';
  const passwordError = touched.password && !password ? 'Password is required'
    : touched.password && password.length < 8 ? 'Minimum 8 characters'
    : touched.password && !/[a-zA-Z]/.test(password) ? 'Must contain at least one letter'
    : touched.password && !/[0-9]/.test(password) ? 'Must contain at least one number'
    : '';
  const isValid = fullName.trim().length >= 2 && email && password.length >= 8
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setTouched({ fullName: true, email: true, password: true });

    if (!isOnline) {
      setSubmitError('No internet connection. Please check your network and try again.');
      return;
    }

    if (!isValid) return;

    setIsLoading(true);
    try {
      await register(email, password, fullName);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setSubmitError('Cannot connect to server. Please try again later.');
      } else if (message.includes('already registered') || message.includes('already exists')) {
        setSubmitError('An account with this email already exists. Please sign in.');
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, isValid, register, email, password, fullName, navigate]);

  const handleGoogleSignIn = useCallback(async () => {
    setSubmitError('');
    if (!isOnline) {
      setSubmitError('No internet connection. Please check your network and try again.');
      return;
    }
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setSubmitError(message);
    }
  }, [isOnline, signInWithGoogle]);

  const inputClass = (hasError: boolean, isFieldValid: boolean) =>
    `w-full pl-12 pr-4 py-4 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
        : isFieldValid
        ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20'
        : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20'
    }`;

  return (
    <section ref={sectionRef} className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-nl-indigo/30 to-nl-purple/20 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-nl-purple/25 to-nl-pink/15 rounded-full blur-[100px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-nl-indigo/10 via-nl-purple/10 to-nl-pink/10 rounded-full blur-[150px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 w-full grid lg:grid-cols-2 min-h-screen">
        {/* Left side - Visual */}
        <motion.div
          className="hidden lg:flex flex-col justify-center p-12 relative"
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="relative z-10 max-w-lg">
            <motion.div
              className="flex items-center gap-3 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">Rizko.ai</span>
            </motion.div>

            <motion.h1
              className="text-5xl xl:text-6xl font-bold text-foreground mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Start your{' '}
              <span className="gradient-text">viral journey</span>
            </motion.h1>

            <motion.p
              className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Join thousands of creators who use Rizko.ai to discover trends,
              generate viral content, and grow their audience faster than ever.
            </motion.p>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {[
                'AI-powered trend detection',
                'Viral script generation',
                'Competitor analysis',
                'Real-time analytics',
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nl-indigo to-nl-purple flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-foreground/80">{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex gap-8 mt-12 pt-8 border-t border-border/30"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 1 }}
            >
              {[
                { value: '50K+', label: 'Active creators' },
                { value: '1M+', label: 'Trends analyzed' },
                { value: '99%', label: 'Satisfaction' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Right side - Form */}
        <motion.div
          className="flex items-center justify-center p-6 lg:p-12"
          initial={{ opacity: 0, x: 50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8 flex justify-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">Rizko.ai</span>
              </div>
            </div>

            <div className="glass-card p-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Create account</h2>
              <p className="text-muted-foreground mb-6">Start discovering viral trends today</p>

              {/* Offline Warning */}
              {!isOnline && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2 mb-5">
                  <WifiOff className="w-4 h-4" />
                  <span>No internet connection</span>
                </div>
              )}

              {/* Submit Error */}
              {submitError && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-2 mb-5">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setTouched(p => ({ ...p, fullName: true }))}
                      placeholder="Enter your full name"
                      className={inputClass(!!nameError, !!touched.fullName && !nameError && fullName.trim().length >= 2)}
                      disabled={isLoading}
                    />
                  </div>
                  {nameError && (
                    <p className="text-sm text-destructive animate-in fade-in">{nameError}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(p => ({ ...p, email: true }))}
                      placeholder="Enter your email"
                      className={inputClass(!!emailError, !!touched.email && !emailError && !!email)}
                      disabled={isLoading}
                    />
                  </div>
                  {emailError && (
                    <p className="text-sm text-destructive animate-in fade-in">{emailError}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched(p => ({ ...p, password: true }))}
                      placeholder="Create a password (min 8 characters)"
                      className={`${inputClass(!!passwordError, !!touched.password && !passwordError && password.length >= 8)} !pr-12`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                  {passwordError && (
                    <p className="text-sm text-destructive animate-in fade-in">{passwordError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || authLoading || !isOnline}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-nl-indigo to-nl-purple text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || authLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-muted-foreground text-sm">or</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={!isOnline}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="whitespace-nowrap">Continue with Google</span>
              </button>

              <p className="text-center text-muted-foreground text-sm mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2">
                ← Back to home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RegisterPage;
