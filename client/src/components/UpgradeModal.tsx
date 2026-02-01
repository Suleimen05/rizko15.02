import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, TrendingUp, Zap, Music, AlertCircle, Activity } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const DEEP_ANALYZE_FEATURES = [
  {
    icon: TrendingUp,
    title: '6-Layer UTS Score',
    description: 'Proprietary algorithm analyzing Viral Lift, Velocity, Retention, Cascade, Saturation & Stability',
  },
  {
    icon: Sparkles,
    title: 'Visual Clustering (AI)',
    description: 'CLIP-based grouping of similar videos to find viral patterns',
  },
  {
    icon: Zap,
    title: 'Growth Velocity Prediction',
    description: 'Track video performance over 24h and predict future growth',
  },
  {
    icon: AlertCircle,
    title: 'Saturation Indicator',
    description: 'Know when a trend is fresh vs oversaturated - timing is everything',
  },
  {
    icon: Music,
    title: 'Sound Cascade Analysis',
    description: 'See how many videos use the same sound and its viral trajectory',
  },
  {
    icon: Activity,
    title: 'Auto-Rescan (24h)',
    description: 'Automatic tracking of video performance for velocity calculation',
  },
];

export function UpgradeModal({ isOpen, onClose, feature: _feature }: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/dashboard/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Unlock Deep Analyze</DialogTitle>
              <Badge className="mt-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                Pro Feature
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-base">
            Get access to our proprietary 6-layer mathematical analysis that NO competitor has.
            See exactly why videos go viral with Deep Analyze.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-semibold mb-2 text-sm">Light Analyze (Current)</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Basic metrics (views, likes)</li>
                <li>• Simple engagement rate</li>
                <li>• Generic viral score</li>
                <li className="text-xs italic">Like other tools...</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                Deep Analyze (Pro)
                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                  UNIQUE
                </Badge>
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  6-layer UTS breakdown
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  AI visual clustering
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Velocity & saturation
                </li>
                <li className="text-xs italic font-semibold text-purple-600">
                  Exclusive to Rizko.ai
                </li>
              </ul>
            </div>
          </div>

          {/* Features List */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              What you'll get with Deep Analyze:
            </h3>
            <div className="space-y-3">
              {DEEP_ANALYZE_FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">Pro Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock all Deep Analyze features
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">$49</div>
                <div className="text-sm text-muted-foreground">/month</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm mb-6">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited Deep Analyze scans (500 videos/scan)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited AI script generation
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                60 min Voice AI per day
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
              onClick={handleUpgrade}
            >
              Upgrade to Pro Now
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              14-day money-back guarantee • Cancel anytime
            </p>
          </div>

          {/* Social Proof */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Join 2,500+ creators using Deep Analyze to go viral
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-background"
                  />
                ))}
              </div>
              <span className="text-sm font-medium">+2,495 more</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
