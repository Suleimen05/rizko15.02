import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, Zap, Bookmark, Music, AlertCircle, Activity } from 'lucide-react';
import type { UTSBreakdown as UTSBreakdownType } from '@/types';

interface UTSBreakdownProps {
  uts_score: number;
  breakdown?: UTSBreakdownType;
}

const LAYER_INFO = {
  l1_viral_lift: {
    name: 'Viral Lift',
    weight: 30,
    desc: 'Views vs Followers ratio - how well this video performed relative to audience size',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  l2_velocity: {
    name: 'Velocity',
    weight: 20,
    desc: 'Growth speed over time - requires historical data for accurate calculation',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  l3_retention: {
    name: 'Retention',
    weight: 20,
    desc: 'Bookmark/save rate - how much people want to return to this content',
    icon: Bookmark,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  l4_cascade: {
    name: 'Sound Cascade',
    weight: 15,
    desc: 'Sound popularity - how many other videos use this sound',
    icon: Music,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  l5_saturation: {
    name: 'Saturation',
    weight: 10,
    desc: 'Trend freshness - penalty for overused trends (lower = more saturated)',
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  l7_stability: {
    name: 'Stability',
    weight: 5,
    desc: 'Overall engagement stability - shares + bookmarks relative to views',
    icon: Activity,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
};

export function UTSBreakdown({ uts_score, breakdown }: UTSBreakdownProps) {
  if (!breakdown) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            UTS breakdown not available. Upgrade to Pro for detailed analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const layers = [
    { key: 'l1_viral_lift' as const, score: breakdown.l1_viral_lift },
    { key: 'l2_velocity' as const, score: breakdown.l2_velocity },
    { key: 'l3_retention' as const, score: breakdown.l3_retention },
    { key: 'l4_cascade' as const, score: breakdown.l4_cascade },
    { key: 'l5_saturation' as const, score: breakdown.l5_saturation },
    { key: 'l7_stability' as const, score: breakdown.l7_stability },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-blue-500';
    if (score >= 0.4) return 'bg-yellow-500';
    if (score >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Average';
    if (score >= 0.2) return 'Below Average';
    return 'Poor';
  };

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {uts_score.toFixed(1)}
            </div>
            <div>
              <div className="text-lg">UTS Score Breakdown</div>
              <div className="text-xs text-muted-foreground font-normal">
                Universal Transfer Score (6-Layer Analysis)
              </div>
            </div>
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Our proprietary 6-layer algorithm that predicts viral potential.
                  This mathematical model is unique to Risko.ai.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {layers.map(({ key, score }) => {
          const info = LAYER_INFO[key];
          const Icon = info.icon;
          const scoreValue = score * 10; // Convert to 0-10 scale for display
          
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${info.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${info.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {info.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({info.weight}%)
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">{info.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {scoreValue.toFixed(1)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    score >= 0.8 ? 'bg-green-500/10 text-green-600' :
                    score >= 0.6 ? 'bg-blue-500/10 text-blue-600' :
                    score >= 0.4 ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-orange-500/10 text-orange-600'
                  }`}>
                    {getScoreLabel(score)}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={score * 100} 
                  className="h-2"
                />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getScoreColor(score)}`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Final Weighted Score:</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {uts_score.toFixed(1)}
              </span>
              <span className="text-muted-foreground">/ 10.0</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {uts_score >= 8 ? '🔥 High viral potential! This content has excellent performance across all metrics.' :
             uts_score >= 6 ? '✨ Good viral potential. This trend is worth exploring.' :
             uts_score >= 4 ? '📊 Moderate potential. Consider the context and your niche.' :
             '⚠️ Lower potential. May work for specific audiences.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
