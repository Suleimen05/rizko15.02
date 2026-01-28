import { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2, TrendingUp, Layers, Zap, AlertCircle, Brain } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeepAnalyzeProgressProps {
  isActive: boolean;
}

interface ProgressStep {
  id: number;
  title: string;
  subtitle: string;
  icon: any;
  duration: number; // seconds
}

const STEPS: ProgressStep[] = [
  {
    id: 1,
    title: 'Collecting Videos',
    subtitle: 'Parsing TikTok data via Apify...',
    icon: Loader2,
    duration: 15,
  },
  {
    id: 2,
    title: 'Calculating UTS Scores',
    subtitle: '6 layers: Viral Lift, Velocity, Retention, Cascade, Saturation, Stability',
    icon: TrendingUp,
    duration: 15,
  },
  {
    id: 3,
    title: 'Visual Clustering (AI)',
    subtitle: 'CLIP embeddings + DBSCAN clustering',
    icon: Layers,
    duration: 15,
  },
  {
    id: 4,
    title: 'Finalizing Results',
    subtitle: 'Preparing deep analysis report',
    icon: Zap,
    duration: 10,
  },
];

export function DeepAnalyzeProgress({ isActive }: DeepAnalyzeProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setCurrentStep(0);
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const totalDuration = 55; // 55 seconds total
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(Math.floor(elapsed));
      
      // Calculate progress (0-100%)
      const newProgress = Math.min((elapsed / totalDuration) * 100, 98);
      setProgress(newProgress);

      // Determine current step based on elapsed time
      let cumulativeTime = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cumulativeTime += STEPS[i].duration;
        if (elapsed < cumulativeTime) {
          setCurrentStep(i);
          break;
        }
      }
      
      if (elapsed >= totalDuration) {
        setCurrentStep(STEPS.length - 1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <Card className="w-full border-2 border-purple-500 bg-gradient-to-br from-purple-500/5 to-pink-500/5 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                🔬 Deep Analyze Running
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">PRO</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyzing with 6-layer UTS algorithm
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-2xl text-purple-600">{Math.round(progress)}%</p>
            <p className="text-xs text-muted-foreground">⏱️ {elapsedTime}s / ~55s</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <Progress value={progress} className="h-3" />

        {/* Steps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActiveStep = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={`p-3 rounded-lg border transition-all ${
                  isActiveStep
                    ? 'border-purple-500 bg-purple-500/10 shadow-md'
                    : isCompleted
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-muted bg-muted/20 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActiveStep
                        ? 'bg-purple-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                  </div>
                  <span className={`text-sm font-medium ${isActiveStep ? 'text-purple-600' : ''}`}>
                    {step.title}
                  </span>
                  {isActiveStep && <Loader2 className="h-3 w-3 text-purple-500 animate-spin ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {step.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        {/* Warning */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span>Deep Analyze takes ~45-90 seconds. Please wait...</span>
          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
