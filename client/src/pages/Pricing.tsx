import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Building2,
  Mic,
  TrendingUp,
  Search,
  Users,
  FileText,
  Sparkles,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface PlanFeature {
  name: string;
  free: boolean | string;
  creator: boolean | string;
  pro: boolean | string;
  agency: boolean | string;
}

const features: PlanFeature[] = [
  { name: 'Daily trend views', free: '10', creator: 'Unlimited', pro: 'Unlimited', agency: 'Unlimited' },
  { name: 'Deep Scan videos', free: false, creator: '100', pro: '500', agency: '2,000' },
  { name: 'Trend forecasting', free: false, creator: true, pro: true, agency: true },
  { name: 'Historical data', free: false, creator: '7 days', pro: '30 days', agency: '90 days' },
  { name: 'Export data (CSV)', free: false, creator: true, pro: true, agency: true },
  { name: 'Daily searches', free: '10', creator: 'Unlimited', pro: 'Unlimited', agency: 'Unlimited' },
  { name: 'Advanced filters', free: false, creator: true, pro: true, agency: true },
  { name: 'UTS Viral Score', free: false, creator: true, pro: true, agency: true },
  { name: 'Visual clustering (AI)', free: false, creator: false, pro: true, agency: true },
  { name: 'AI scripts per month', free: '5', creator: '50', pro: 'Unlimited', agency: 'Unlimited' },
  { name: 'Choose AI model', free: false, creator: true, pro: true, agency: true },
  { name: 'All 5 generation modes', free: false, creator: true, pro: true, agency: true },
  { name: 'Bulk generation', free: false, creator: false, pro: '10 at once', agency: '25 at once' },
  { name: 'Custom templates', free: false, creator: false, pro: true, agency: true },
  { name: 'Voice AI minutes/day', free: false, creator: '10 min', pro: '60 min', agency: '180 min' },
  { name: 'Voice selection (16 voices)', free: false, creator: false, pro: true, agency: true },
  { name: 'Custom persona', free: false, creator: false, pro: true, agency: true },
  { name: 'Priority queue', free: false, creator: false, pro: true, agency: true },
  { name: 'Track competitors', free: '3', creator: '10', pro: '25', agency: '100' },
  { name: 'Competitor alerts', free: false, creator: false, pro: true, agency: true },
  { name: 'Strategy analysis', free: false, creator: false, pro: true, agency: true },
  { name: 'Team members', free: '1', creator: '1', pro: '1', agency: '5' },
  { name: 'API access', free: false, creator: false, pro: false, agency: '10K/mo' },
  { name: 'Support', free: 'Email', creator: 'Email', pro: 'Priority', agency: 'Dedicated' },
  { name: 'Weekly reports', free: false, creator: false, pro: true, agency: true },
];

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: { monthly: 0, yearly: 0 },
    icon: Zap,
    color: 'from-gray-500 to-gray-600',
    popular: false,
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'creator',
    name: 'Creator',
    description: 'For content creators ready to grow',
    price: { monthly: 19, yearly: 144 },
    icon: Crown,
    color: 'from-blue-500 to-cyan-500',
    popular: false,
    cta: 'Upgrade to Creator',
    ctaVariant: 'default' as const,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For serious creators & marketers',
    price: { monthly: 49, yearly: 348 },
    icon: Rocket,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    cta: 'Upgrade to Pro',
    ctaVariant: 'default' as const,
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For teams and agencies',
    price: { monthly: 149, yearly: 1068 },
    icon: Building2,
    color: 'from-orange-500 to-red-500',
    popular: false,
    cta: 'Contact Sales',
    ctaVariant: 'default' as const,
  },
];

const highlights = [
  { icon: TrendingUp, title: 'Real-time Trends', description: 'Track TikTok trends as they emerge' },
  { icon: Sparkles, title: 'AI Script Generation', description: 'Create viral scripts with GPT-5, Claude & more' },
  { icon: Mic, title: 'Voice AI Assistant', description: 'Talk to AI in real-time with PersonaPlex' },
  { icon: Users, title: 'Competitor Analysis', description: 'Track and analyze your competition' },
];

export function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const currentPlan = user?.subscription || 'free';

  const getFeatureValue = (feature: PlanFeature, planId: string) => {
    const value = feature[planId as keyof PlanFeature];
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/30" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center space-y-4">
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Pricing</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Choose your plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free and scale as you grow. All plans include core features.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={cn('text-sm font-medium', !isYearly && 'text-foreground', isYearly && 'text-muted-foreground')}>Monthly</span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={cn('text-sm font-medium', isYearly && 'text-foreground', !isYearly && 'text-muted-foreground')}>Yearly</span>
          {isYearly && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Save 40%</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Icon className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const monthlyPrice = isYearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly;
          const isCurrentPlan = currentPlan.toLowerCase() === plan.id;

          return (
            <Card key={plan.id} className={cn('relative overflow-hidden transition-all hover:shadow-lg', plan.popular && 'border-purple-500 shadow-purple-500/20 shadow-lg')}>
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-purple-500 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">Most Popular</div>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', plan.color)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${monthlyPrice}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {isYearly && plan.price.monthly > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">${plan.price.yearly} billed yearly</p>
                  )}
                </div>
                <Button
                  className={cn('w-full', plan.popular && 'bg-purple-600 hover:bg-purple-700')}
                  variant={plan.ctaVariant}
                  disabled={isCurrentPlan}
                  onClick={() => {
                    if (plan.id === 'agency') {
                      window.location.href = 'mailto:sales@trendscout.ai?subject=Agency Plan Inquiry';
                    } else if (plan.id !== 'free') {
                      navigate(`/dashboard/checkout?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`);
                    }
                  }}
                >
                  {isCurrentPlan ? 'Current Plan' : plan.cta}
                </Button>
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key features</p>
                  <ul className="space-y-2">
                    {plan.id === 'free' && (
                      <>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />10 trend views/day</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />5 AI scripts/month</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />3 competitor tracking</li>
                      </>
                    )}
                    {plan.id === 'creator' && (
                      <>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />Unlimited trends & searches</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />50 AI scripts/month</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /><Mic className="h-3 w-3" /> 10 min Voice AI/day</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />Deep Scan (100 videos)</li>
                      </>
                    )}
                    {plan.id === 'pro' && (
                      <>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />Unlimited AI scripts</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /><Mic className="h-3 w-3" /> 60 min Voice AI/day</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />16 voice options</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />Visual clustering (AI)</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />Priority support</li>
                      </>
                    )}
                    {plan.id === 'agency' && (
                      <>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />5 team members</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /><Mic className="h-3 w-3" /> 180 min Voice AI/day</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />100 competitors</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />API access (10K/mo)</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />Dedicated support</li>
                      </>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">Compare all features</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Feature</th>
                <th className="text-center py-4 px-4 font-medium">Free</th>
                <th className="text-center py-4 px-4 font-medium">Creator</th>
                <th className="text-center py-4 px-4 font-medium text-purple-600">Pro</th>
                <th className="text-center py-4 px-4 font-medium">Agency</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-muted/30">
                <td colSpan={5} className="py-3 px-4 font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />Trend Analysis
                </td>
              </tr>
              {features.slice(0, 5).map((feature, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'free')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'creator')}</td>
                  <td className="text-center py-3 px-4 bg-purple-500/5">{getFeatureValue(feature, 'pro')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'agency')}</td>
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td colSpan={5} className="py-3 px-4 font-semibold text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />Video Search
                </td>
              </tr>
              {features.slice(5, 9).map((feature, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'free')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'creator')}</td>
                  <td className="text-center py-3 px-4 bg-purple-500/5">{getFeatureValue(feature, 'pro')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'agency')}</td>
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td colSpan={5} className="py-3 px-4 font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />AI Script Generation
                </td>
              </tr>
              {features.slice(9, 14).map((feature, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'free')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'creator')}</td>
                  <td className="text-center py-3 px-4 bg-purple-500/5">{getFeatureValue(feature, 'pro')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'agency')}</td>
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td colSpan={5} className="py-3 px-4 font-semibold text-sm flex items-center gap-2">
                  <Mic className="h-4 w-4" />Voice AI (PersonaPlex)
                  <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">NEW</Badge>
                </td>
              </tr>
              {features.slice(14, 18).map((feature, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'free')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'creator')}</td>
                  <td className="text-center py-3 px-4 bg-purple-500/5">{getFeatureValue(feature, 'pro')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'agency')}</td>
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td colSpan={5} className="py-3 px-4 font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />Competitor Tracking
                </td>
              </tr>
              {features.slice(18, 21).map((feature, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'free')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'creator')}</td>
                  <td className="text-center py-3 px-4 bg-purple-500/5">{getFeatureValue(feature, 'pro')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'agency')}</td>
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td colSpan={5} className="py-3 px-4 font-semibold text-sm flex items-center gap-2">
                  <Headphones className="h-4 w-4" />Team & Support
                </td>
              </tr>
              {features.slice(21).map((feature, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'free')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'creator')}</td>
                  <td className="text-center py-3 px-4 bg-purple-500/5">{getFeatureValue(feature, 'pro')}</td>
                  <td className="text-center py-3 px-4">{getFeatureValue(feature, 'agency')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Can I switch plans anytime?</h3>
              <p className="text-sm text-muted-foreground">Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What is Voice AI (PersonaPlex)?</h3>
              <p className="text-sm text-muted-foreground">Voice AI is our revolutionary feature powered by NVIDIA's PersonaPlex. It allows you to have real-time voice conversations with AI — dictate your ideas, get instant feedback, and brainstorm content hands-free.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and for Agency plans, we also offer invoice-based billing.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Is there a refund policy?</h3>
              <p className="text-sm text-muted-foreground">Yes, we offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-16 text-center">
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="py-12">
            <h2 className="text-2xl font-bold mb-4">Ready to go viral?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Join thousands of creators who use TrendScout AI to find trends, create viral content, and grow their audience.</p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700" onClick={() => navigate('/dashboard/checkout?plan=pro&billing=monthly')}>Start Pro Trial</Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')}>Try Free</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { Pricing as PricingPage };
