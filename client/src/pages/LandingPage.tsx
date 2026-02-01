import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Zap,
  BarChart3,
  Bot,
  Target,
  Video,
  Star,
  Quote,
  Sun,
  Moon,
  Link2,
  LineChart,
} from 'lucide-react';
import Hero3D from '@/components/3d/Hero3D';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { REVIEW_MODE } from '@/config/features';

// Features for REVIEW_MODE (Official API only)
const reviewModeFeatures = [
  {
    icon: Link2,
    title: 'Connect Your Accounts',
    description: 'Securely link your TikTok, Instagram, and YouTube accounts using official OAuth authentication.',
    color: '#8b5cf6',
  },
  {
    icon: LineChart,
    title: 'Personal Analytics',
    description: 'View detailed statistics for all your videos including views, likes, comments, and engagement rates.',
    color: '#3b82f6',
  },
  {
    icon: Bot,
    title: 'AI-Powered Insights',
    description: 'Get personalized recommendations powered by Gemini AI to improve your content strategy and grow your audience.',
    color: '#10b981',
  },
];

// Features for full version
const fullFeatures = [
  {
    icon: TrendingUp,
    title: 'AI Trend Detection',
    description: 'Advanced AI analyzes millions of videos in real-time to identify emerging trends before they peak.',
    color: '#3b82f6',
  },
  {
    icon: Zap,
    title: 'Viral Score Prediction',
    description: 'Get accurate viral potential scores with our UTS algorithm based on 6-layer scoring system.',
    color: '#8b5cf6',
  },
  {
    icon: Bot,
    title: 'AI Script Generation',
    description: 'Generate viral-ready scripts with AI. Choose your niche, tone, and style - get compelling content.',
    color: '#f97316',
  },
  {
    icon: Target,
    title: 'Competitor Analysis',
    description: 'Track competitors performance, analyze their best content, and discover opportunities.',
    color: '#10b981',
  },
  {
    icon: BarChart3,
    title: 'Visual Clustering',
    description: 'CLIP-powered visual analysis groups similar content and identifies trending patterns.',
    color: '#f43f5e',
  },
  {
    icon: Video,
    title: 'Deep Scan Analysis',
    description: 'Comprehensive video insights with auto-rescan to track growth and engagement metrics.',
    color: '#d946ef',
  },
];

const features = REVIEW_MODE ? reviewModeFeatures : fullFeatures;

// Plans for REVIEW_MODE (simpler, focused on analytics)
const reviewModePlans = [
  {
    name: 'Free',
    price: 0,
    description: 'Get started with basic analytics',
    features: ['Connect 1 social account', 'View video statistics', 'Basic performance insights', 'Community support'],
    highlighted: false,
  },
  {
    name: 'Creator',
    price: 9,
    description: 'For growing creators',
    features: ['Connect up to 3 accounts', 'Full video analytics', 'AI-powered recommendations', 'Email support'],
    highlighted: true,
  },
  {
    name: 'Pro',
    price: 29,
    description: 'For serious creators',
    features: ['Unlimited accounts', 'Advanced AI insights', 'Historical data analysis', 'Priority support'],
    highlighted: false,
  },
];

// Plans for full version
const fullPlans = [
  {
    name: 'Starter',
    price: 19,
    description: 'Perfect for individual creators',
    features: ['50 deep scans/month', 'Basic AI scripts', '5 competitors', 'Email support'],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 49,
    description: 'Best for growing creators',
    features: ['Unlimited deep scans', 'Advanced AI scripts', '20 competitors', 'Priority support', 'API access'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    description: 'For agencies and teams',
    features: ['Everything in Pro', 'Unlimited competitors', 'Account manager', 'White-label reports'],
    highlighted: false,
  },
];

const plans = REVIEW_MODE ? reviewModePlans : fullPlans;

// Testimonials for REVIEW_MODE
const reviewModeTestimonials = [
  {
    name: 'Alex Kim',
    role: 'TikTok Creator',
    followers: '150K',
    content: 'Finally, a simple way to see all my analytics in one place! The AI insights helped me understand what content works best.',
    avatar: 'AK',
  },
  {
    name: 'Jessica Taylor',
    role: 'Instagram Influencer',
    followers: '320K',
    content: 'Connecting my accounts was super easy and secure. Love seeing my performance across all platforms!',
    avatar: 'JT',
  },
  {
    name: 'David Chen',
    role: 'YouTube Creator',
    followers: '75K',
    content: 'The personalized recommendations have really helped me improve my content strategy. Great tool for any creator!',
    avatar: 'DC',
  },
];

// Testimonials for full version
const fullTestimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    followers: '2.5M',
    content: 'Rizko.ai completely transformed my content strategy. I went from 100K to 2.5M followers in just 6 months!',
    avatar: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'Social Media Manager',
    followers: 'Agency',
    content: 'We manage 15 creator accounts and Rizko.ai saves us hours every day. Our clients love the results.',
    avatar: 'MJ',
  },
  {
    name: 'Emma Rodriguez',
    role: 'Lifestyle Creator',
    followers: '890K',
    content: 'The AI script generator is incredible. It understands my voice perfectly and the engagement has been amazing.',
    avatar: 'ER',
  },
];

const testimonials = REVIEW_MODE ? reviewModeTestimonials : fullTestimonials;

export function LandingPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={cn(
      "min-h-screen",
      "bg-gradient-to-b from-gray-50 to-white",
      "dark:from-gray-950 dark:to-gray-900"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50",
        "bg-white/80 dark:bg-gray-950/80",
        "backdrop-blur-lg",
        "border-b border-gray-200 dark:border-gray-800"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">Rizko.ai</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </a>
              {REVIEW_MODE ? (
                <Link to="/help" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Support
                </Link>
              ) : (
                <a href="#testimonials" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Testimonials
                </a>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-lg",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "text-gray-600 dark:text-gray-400"
                )}
              >
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-400" />
                )}
              </button>

              <Link
                to="/login"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {REVIEW_MODE ? 'Sign In' : 'Login'}
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {REVIEW_MODE ? 'Get Started' : 'Get Started'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={sectionRef} className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                {REVIEW_MODE ? (
                  <>
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Social Media Analytics Platform</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">AI-Powered Content Intelligence</span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight",
                "text-gray-900 dark:text-white"
              )}>
                {REVIEW_MODE ? (
                  <>
                    Track Your Content{' '}
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                      Performance
                    </span>
                  </>
                ) : (
                  <>
                    Go Viral with{' '}
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                      AI-Powered
                    </span>{' '}
                    Analytics
                  </>
                )}
              </h1>

              {/* Description */}
              <p className={cn(
                "mt-6 text-lg max-w-xl",
                "text-gray-600 dark:text-gray-400"
              )}>
                {REVIEW_MODE
                  ? 'Securely connect your social accounts using official APIs. View detailed analytics and get personalized recommendations to grow your audience.'
                  : 'Discover trending content, generate viral scripts, and analyze competitors with the most advanced AI tools for content creators.'}
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-all hover:scale-105"
                >
                  {REVIEW_MODE ? 'Get Started Free' : 'Start Free Trial'}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  {REVIEW_MODE ? 'How It Works' : 'Learn More'}
                </a>
              </div>

              {/* Trust Badges */}
              {REVIEW_MODE ? (
                <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <span>Secure OAuth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📈</span>
                    <span>Real-time Stats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span>AI Insights</span>
                  </div>
                </div>
              ) : (
                <div className="mt-12 flex items-center gap-6">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-xs font-bold"
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-semibold text-gray-900 dark:text-white">2,500+</span> creators trust Rizko.ai
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right - 3D Orbital Ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden md:block"
            >
              <div className="scale-75 lg:scale-90 xl:scale-100">
                <Hero3D />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {REVIEW_MODE ? 'How Rizko.ai Works' : 'Everything You Need to Go Viral'}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {REVIEW_MODE
                ? 'Connect your accounts, view your analytics, and get AI-powered recommendations - all in one place.'
                : 'Powerful AI tools designed to help content creators identify trends, create engaging content, and grow their audience.'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose the plan that fits your content creation needs. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  "relative p-8 rounded-2xl",
                  plan.highlighted
                    ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-white text-blue-600 text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className={cn("text-xl font-semibold", plan.highlighted ? "text-white" : "text-gray-900 dark:text-white")}>
                  {plan.name}
                </h3>
                <p className={cn("mt-2 text-sm", plan.highlighted ? "text-white/80" : "text-gray-600 dark:text-gray-400")}>
                  {plan.description}
                </p>
                <div className="mt-6">
                  <span className={cn("text-4xl font-bold", plan.highlighted ? "text-white" : "text-gray-900 dark:text-white")}>
                    ${plan.price}
                  </span>
                  <span className={cn("text-sm", plan.highlighted ? "text-white/80" : "text-gray-600 dark:text-gray-400")}>
                    /month
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className={cn("w-5 h-5 flex-shrink-0", plan.highlighted ? "text-white" : "text-green-500")} />
                      <span className={cn("text-sm", plan.highlighted ? "text-white/90" : "text-gray-600 dark:text-gray-400")}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={cn(
                    "mt-8 block w-full py-3 rounded-xl text-center font-medium transition-all",
                    plan.highlighted
                      ? "bg-white text-blue-600 hover:bg-gray-100"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  )}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {REVIEW_MODE ? 'What Creators Say' : 'Loved by Creators Worldwide'}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {REVIEW_MODE
                ? 'Hear from creators who use Rizko.ai to track their content performance.'
                : 'Join thousands of content creators who have transformed their growth with Rizko.ai.'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900"
              >
                <Quote className="w-8 h-8 text-blue-500 mb-4" />
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {testimonial.role} {testimonial.followers !== 'Agency' && `• ${testimonial.followers}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {REVIEW_MODE ? 'Ready to Grow Your Audience?' : 'Ready to Go Viral?'}
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              {REVIEW_MODE
                ? 'Connect your social accounts and get AI-powered insights to improve your content strategy.'
                : 'Join thousands of creators who are already using Rizko.ai to discover trends, create viral content, and grow their audience.'}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-all hover:scale-105"
            >
              {REVIEW_MODE ? 'Get Started Free' : 'Start Your Free Trial'}
              <ArrowRight className="w-5 h-5" />
            </Link>
            {!REVIEW_MODE && (
              <p className="mt-4 text-sm text-white/60">
                No credit card required. 14-day free trial.
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={cn(
        "py-12 border-t",
        "border-gray-200 dark:border-gray-800",
        "bg-white dark:bg-gray-950"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">Rizko.ai</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {REVIEW_MODE
                  ? 'Social media analytics platform. Connect your accounts and get personalized insights.'
                  : 'AI-powered analytics platform for content creators. Discover trends, generate scripts, and grow your audience.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a></li>
                {!REVIEW_MODE && (
                  <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">API</a></li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link to="/privacy-policy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/data-policy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Data Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="mailto:support@rizko.ai" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact Us</a></li>
                <li><Link to="/help" className="hover:text-gray-900 dark:hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/help" className="hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2026 Rizko.ai. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-500 transition-colors" title="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors" title="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
              </a>
              <a href="mailto:support@rizko.ai" className="text-gray-500 hover:text-red-500 transition-colors" title="Email">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </a>
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-green-500 transition-colors" title="WhatsApp">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="https://t.me/rizkoai" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors" title="Telegram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="X (Twitter)">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
