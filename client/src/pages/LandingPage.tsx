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
  Moon
} from 'lucide-react';
import Hero3D from '@/components/3d/Hero3D';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const features = [
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

const plans = [
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

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    followers: '2.5M',
    content: 'Risko.ai completely transformed my content strategy. I went from 100K to 2.5M followers in just 6 months!',
    avatar: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'Social Media Manager',
    followers: 'Agency',
    content: 'We manage 15 creator accounts and Risko.ai saves us hours every day. Our clients love the results.',
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
              <span className="font-bold text-lg text-gray-900 dark:text-white">Risko.ai</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Testimonials
              </a>
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
                Login
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Get Started
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">AI-Powered Content Intelligence</span>
              </div>

              <h1 className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight",
                "text-gray-900 dark:text-white"
              )}>
                Go Viral with{' '}
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                  AI-Powered
                </span>{' '}
                Analytics
              </h1>

              <p className={cn(
                "mt-6 text-lg max-w-xl",
                "text-gray-600 dark:text-gray-400"
              )}>
                Discover trending content, generate viral scripts, and analyze competitors with the most advanced AI tools for content creators.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-all hover:scale-105"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Learn More
                </a>
              </div>

              {/* Trust Badges */}
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
                    <span className="font-semibold text-gray-900 dark:text-white">2,500+</span> creators trust Risko.ai
                  </p>
                </div>
              </div>
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
              Everything You Need to Go Viral
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful AI tools designed to help content creators identify trends, create engaging content, and grow their audience.
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
              Loved by Creators Worldwide
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join thousands of content creators who have transformed their growth with Risko.ai.
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
              Ready to Go Viral?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of creators who are already using Risko.ai to discover trends, create viral content, and grow their audience.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-all hover:scale-105"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-4 text-sm text-white/60">
              No credit card required. 14-day free trial.
            </p>
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
                <span className="font-bold text-lg text-gray-900 dark:text-white">Risko.ai</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered analytics platform for content creators. Discover trends, generate scripts, and grow your audience.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2026 Risko.ai. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
