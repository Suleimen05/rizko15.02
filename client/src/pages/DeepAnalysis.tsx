import { useState } from 'react';
import {
  BarChart3,
  Search,
  Zap,
  TrendingUp,
  Layers,
  Brain,
  Sparkles,
  Play,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSearchWithFilters } from '@/hooks/useTikTok';
import { DeepAnalyzeProgress } from '@/components/DeepAnalyzeProgress';
import { UTSBreakdown } from '@/components/metrics/UTSBreakdown';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAuth } from '@/contexts/AuthContext';
import type { TikTokVideo, TikTokVideoDeep } from '@/types';

export function DeepAnalysis() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TikTokVideoDeep | null>(null);

  const { videos, mode, clusters, refetch } = useSearchWithFilters({
    niche: keyword,
    is_deep: true,
    user_tier: user?.subscription || 'free',
  });

  const handleDeepAnalyze = async () => {
    if (!keyword.trim()) return;

    setIsAnalyzing(true);
    setAnalysisComplete(false);

    try {
      await refetch(keyword);
      setAnalysisComplete(true);
    } catch (err: any) {
      if (err.isUpgradeRequired) {
        setShowUpgradeModal(true);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getUTSColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-purple-500" />
          Deep Analysis
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">PRO</Badge>
        </h1>
        <p className="text-muted-foreground">
          Advanced 6-layer UTS algorithm for viral trend detection
        </p>
      </div>

      {/* Search Section */}
      <Card className="border-2 border-dashed border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter keyword, hashtag, or niche to analyze..."
                className="pl-10 h-12 text-lg"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeepAnalyze()}
              />
            </div>
            <Button
              onClick={handleDeepAnalyze}
              disabled={!keyword.trim() || isAnalyzing}
              className="h-12 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isAnalyzing ? (
                <>
                  <Brain className="h-5 w-5 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Deep Analyze
                </>
              )}
            </Button>
          </div>

          {/* Algorithm Info */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-background">
              <Layers className="h-3 w-3 mr-1" />
              6-Layer UTS
            </Badge>
            <Badge variant="outline" className="bg-background">
              <TrendingUp className="h-3 w-3 mr-1" />
              Viral Lift
            </Badge>
            <Badge variant="outline" className="bg-background">
              <Zap className="h-3 w-3 mr-1" />
              Velocity
            </Badge>
            <Badge variant="outline" className="bg-background">
              <Clock className="h-3 w-3 mr-1" />
              Retention
            </Badge>
            <Badge variant="outline" className="bg-background">
              <Share2 className="h-3 w-3 mr-1" />
              Cascade
            </Badge>
            <Badge variant="outline" className="bg-background">
              <Filter className="h-3 w-3 mr-1" />
              Saturation
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isAnalyzing && <DeepAnalyzeProgress isActive={isAnalyzing} />}

      {/* Results */}
      {analysisComplete && videos.length > 0 && (
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Play className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{videos.length}</p>
                    <p className="text-xs text-muted-foreground">Videos Analyzed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {videos.filter(v => (v.uts_score || 0) >= 70).length}
                    </p>
                    <p className="text-xs text-muted-foreground">High Viral Potential</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatNumber(videos.reduce((acc, v) => acc + (v.stats?.playCount || 0), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{clusters?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Visual Clusters</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Mode Badge */}
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "text-sm",
              mode === 'deep'
                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
            )}>
              {mode === 'deep' ? '🔬 Deep Analysis Mode' : '⚡ Light Analysis Mode'}
            </Badge>
            {mode === 'deep' && (
              <span className="text-sm text-muted-foreground">
                6-layer UTS algorithm applied
              </span>
            )}
          </div>

          {/* Video Results */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Results ({videos.length})</TabsTrigger>
              <TabsTrigger value="viral">
                High Viral ({videos.filter(v => (v.uts_score || 0) >= 70).length})
              </TabsTrigger>
              <TabsTrigger value="trending">
                Trending ({videos.filter(v => (v.uts_score || 0) >= 50 && (v.uts_score || 0) < 70).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.slice(0, 12).map((video) => (
                  <VideoAnalysisCard
                    key={video.id}
                    video={video}
                    onSelect={() => setSelectedVideo(video as TikTokVideoDeep)}
                    formatNumber={formatNumber}
                    getUTSColor={getUTSColor}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="viral" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.filter(v => (v.uts_score || 0) >= 70).slice(0, 12).map((video) => (
                  <VideoAnalysisCard
                    key={video.id}
                    video={video}
                    onSelect={() => setSelectedVideo(video as TikTokVideoDeep)}
                    formatNumber={formatNumber}
                    getUTSColor={getUTSColor}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trending" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.filter(v => (v.uts_score || 0) >= 50 && (v.uts_score || 0) < 70).slice(0, 12).map((video) => (
                  <VideoAnalysisCard
                    key={video.id}
                    video={video}
                    onSelect={() => setSelectedVideo(video as TikTokVideoDeep)}
                    formatNumber={formatNumber}
                    getUTSColor={getUTSColor}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && !analysisComplete && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a keyword, hashtag, or niche above to run deep analysis with our
              6-layer UTS algorithm. Discover viral patterns and trending content.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {analysisComplete && videos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Try a different keyword or hashtag. Make sure to use popular terms
              that have recent activity on TikTok.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Video Detail Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                UTS Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UTSBreakdown
                uts_score={selectedVideo.uts_score || 0}
                breakdown={selectedVideo.uts_breakdown}
              />
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => setSelectedVideo(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Deep Analysis"
      />
    </div>
  );
}

// Video Analysis Card Component
interface VideoAnalysisCardProps {
  video: TikTokVideo;
  onSelect: () => void;
  formatNumber: (num: number) => string;
  getUTSColor: (score: number) => string;
}

function VideoAnalysisCard({ video, onSelect, formatNumber, getUTSColor }: VideoAnalysisCardProps) {
  const utsScore = video.uts_score || video.viralScore || 0;

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-muted">
        {video.cover_url || video.video?.cover ? (
          <img
            src={video.cover_url || video.video?.cover}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* UTS Score Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={cn(
            "font-bold",
            utsScore >= 70
              ? "bg-green-500/90 text-white"
              : utsScore >= 50
              ? "bg-yellow-500/90 text-white"
              : "bg-gray-500/90 text-white"
          )}>
            UTS: {utsScore.toFixed(0)}
          </Badge>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" size="sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            View Breakdown
          </Button>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3">
        <p className="text-sm font-medium line-clamp-2 mb-2">
          {video.title || video.description || 'No description'}
        </p>

        <p className="text-xs text-muted-foreground mb-2">
          @{video.author_username || video.author?.uniqueId || 'unknown'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(video.stats?.playCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {formatNumber(video.stats?.diggCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {formatNumber(video.stats?.commentCount || 0)}
          </span>
        </div>

        {/* UTS Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Viral Potential</span>
            <span className={getUTSColor(utsScore)}>{utsScore.toFixed(0)}%</span>
          </div>
          <Progress value={utsScore} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
