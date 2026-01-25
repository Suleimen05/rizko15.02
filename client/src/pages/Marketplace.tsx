import { useState } from 'react';
import {
  Store,
  User,
  Bot,
  Sparkles,
  Video,
  PenTool,
  BarChart3,
  Palette,
  ArrowRight,
  Check,
  Lock,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const categories = [
  {
    icon: Video,
    title: 'Video Creation',
    description: 'UGC creators and AI video generators',
    humanCount: 12,
    aiCount: 5,
  },
  {
    icon: PenTool,
    title: 'Script Writing',
    description: 'Copywriters and AI script agents',
    humanCount: 18,
    aiCount: 8,
  },
  {
    icon: BarChart3,
    title: 'SMM Management',
    description: 'Social media managers and AI schedulers',
    humanCount: 8,
    aiCount: 4,
  },
  {
    icon: Palette,
    title: 'Design & Thumbnails',
    description: 'Designers and AI image generators',
    humanCount: 15,
    aiCount: 6,
  },
];

const comingSoonFeatures = [
  'Find verified UGC creators for your niche',
  'Hire AI agents that work 24/7',
  'Compare human vs AI pricing instantly',
  'Book calls directly with creators',
  'Pay securely through the platform',
];

export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'client' | 'provider'>('client');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [providerType, setProviderType] = useState<'human' | 'ai' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('You\'re on the waitlist! We\'ll notify you when we launch.');
    setEmail('');
    setIsSubmitting(false);
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) {
      toast.error('Please enter your access code');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For now, reject all codes (MVP)
    toast.error('Invalid access code. Apply below to get one!');
    setAccessCode('');
    setIsSubmitting(false);
  };

  const handleProviderApply = () => {
    const subject = providerType === 'human'
      ? 'Creator Application - TrendScout Marketplace'
      : 'AI Agent Developer Application - TrendScout Marketplace';

    const body = providerType === 'human'
      ? `Hi TrendScout Team,

I'd like to apply as a creator on the marketplace.

My details:
- Name:
- Niche/Specialty:
- Portfolio/Social links:
- Why I want to join:

Looking forward to hearing from you!`
      : `Hi TrendScout Team,

I'd like to apply as an AI agent developer on the marketplace.

My details:
- Name:
- GitHub/Portfolio:
- AI Agent description:
- Tech stack:

Looking forward to hearing from you!`;

    window.location.href = `mailto:axislineX@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          Coming Soon
        </div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          <Store className="h-8 w-8" />
          Marketplace
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Find creators and AI agents to grow your TikTok.
          The first marketplace where you can hire humans or AI — or both.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border p-1 bg-muted/50">
          <button
            onClick={() => setActiveTab('client')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'client'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            I'm looking to hire
          </button>
          <button
            onClick={() => setActiveTab('provider')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'provider'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            I want to offer services
          </button>
        </div>
      </div>

      {activeTab === 'client' ? (
        <>
          {/* Client View - Waitlist */}
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2">Join the Waitlist</h2>
                <p className="text-muted-foreground text-sm">
                  Be the first to access our marketplace when we launch
                </p>
              </div>

              <form onSubmit={handleWaitlistSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-3">What you'll get access to:</h3>
                <ul className="space-y-2">
                  {comingSoonFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Categories Preview */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Browse Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card key={index} className="p-4 hover:shadow-lg transition-all duration-300 opacity-75 cursor-not-allowed">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{category.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {category.humanCount} creators
                          </span>
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {category.aiCount} AI agents
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Coming soon
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Provider View - Access Code */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Access Code Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Have an Access Code?</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter your code to start setting up your profile
                  </p>
                </div>

                <form onSubmit={handleAccessCodeSubmit} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="text-center font-mono tracking-widest"
                    maxLength={12}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Verifying...' : 'Verify Code'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Apply Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Apply for Access</h2>
                  <p className="text-muted-foreground text-sm">
                    Join as a creator or AI developer
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    What type of provider are you?
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setProviderType('human')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        providerType === 'human'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-border hover:border-purple-300'
                      }`}
                    >
                      <User className={`h-8 w-8 mx-auto mb-2 ${
                        providerType === 'human' ? 'text-purple-500' : 'text-muted-foreground'
                      }`} />
                      <span className="text-sm font-medium">Creator / SMM</span>
                    </button>

                    <button
                      onClick={() => setProviderType('ai')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        providerType === 'ai'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-border hover:border-purple-300'
                      }`}
                    >
                      <Bot className={`h-8 w-8 mx-auto mb-2 ${
                        providerType === 'ai' ? 'text-purple-500' : 'text-muted-foreground'
                      }`} />
                      <span className="text-sm font-medium">AI Developer</span>
                    </button>
                  </div>

                  <Button
                    onClick={handleProviderApply}
                    className="w-full mt-4"
                    disabled={!providerType}
                  >
                    Apply Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Provider Benefits */}
          <Card className="max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-6 text-center">Why join as a provider?</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-purple-500" />
                    <h3 className="font-medium">For Creators & SMM</h3>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Access to businesses looking for TikTok help',
                      'Set your own rates and availability',
                      'Get paid securely through the platform',
                      'Build your reputation with reviews',
                      'No upfront fees — we only take 15% commission',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Bot className="h-5 w-5 text-purple-500" />
                    <h3 className="font-medium">For AI Developers</h3>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Monetize your AI agents',
                      'Access to TrendScout API and data',
                      'Reach thousands of potential customers',
                      'We handle payments and support',
                      '70/30 revenue share in your favor',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bottom CTA */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Questions? Contact us at{' '}
          <a
            href="mailto:axislineX@gmail.com"
            className="text-purple-500 hover:underline"
          >
            axislineX@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
