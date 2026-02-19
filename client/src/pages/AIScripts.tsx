import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Copy,
  Download,
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Loader2,
  Check,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// =============================================================================
// TYPES
// =============================================================================

interface AnalyzeVideoData {
  url: string;
  description: string;
  author: string;
  cover: string;
  stats: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
  };
  uts_score: number;
  play_addr?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AIScripts() {
  const { t } = useTranslation('aiscripts');
  const location = useLocation();
  const navigate = useNavigate();
  const analysisRef = useRef<HTMLDivElement>(null);

  // Video analysis state
  const videoData = (location.state as { analyzeVideo?: AnalyzeVideoData })?.analyzeVideo || null;
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);

  // Auto-start analysis when video data is present
  useEffect(() => {
    if (videoData && !analysisResult && !analysisLoading && !analysisError) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoData]);

  const runAnalysis = async () => {
    if (!videoData) return;

    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await apiService.analyzeVideo({
        url: videoData.url,
        author: videoData.author,
        views: String(videoData.stats.playCount || 0),
        uts: videoData.uts_score || 0,
        desc: videoData.description,
      });

      setAnalysisResult(result.analysis || result.result || result.response || JSON.stringify(result));
      setCreditsUsed(result.credits_used || 3);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 402) {
        setAnalysisError(t('analysis.insufficientCredits'));
      } else {
        setAnalysisError(
          error?.response?.data?.detail || t('analysis.error')
        );
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    toast.success(t('copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadResult = () => {
    if (!analysisResult) return;
    const blob = new Blob([analysisResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${videoData?.author || 'video'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Empty state (no video) ────────────────────────────────────
  if (!videoData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-purple-500" />
          </div>
          <h2 className="text-xl font-bold">{t('pageTitle')}</h2>
          <p className="text-muted-foreground">
            {t('analysis.emptyDescription')}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/discover')}
          >
            {t('analysis.goToDiscover')}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main: Video Analysis ──────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            {t('analysis.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('analysis.subtitle')}
          </p>
        </div>
        {creditsUsed > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            {creditsUsed} {t('analysis.credits')}
          </Badge>
        )}
      </div>

      {/* Video Info Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Cover */}
          <div className="sm:w-48 flex-shrink-0">
            {videoData.play_addr ? (
              <video
                src={videoData.play_addr}
                className="w-full sm:h-full object-cover max-h-64 sm:max-h-none"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : videoData.cover ? (
              <img
                src={videoData.cover}
                alt=""
                className="w-full sm:h-full object-cover max-h-64 sm:max-h-none"
              />
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <CardContent className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">@{videoData.author}</span>
              {videoData.uts_score > 0 && (
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  UTS {videoData.uts_score.toFixed(0)}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {videoData.description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {formatNumber(videoData.stats.playCount)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {formatNumber(videoData.stats.diggCount)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {formatNumber(videoData.stats.commentCount)}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="h-4 w-4" />
                {formatNumber(videoData.stats.shareCount)}
              </span>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Analysis Section */}
      <div ref={analysisRef}>
        {/* Loading */}
        {analysisLoading && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20 h-16 w-16" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Sparkles className="h-8 w-8 text-purple-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">{t('analysis.analyzing')}</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t('analysis.analyzingDesc')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('analysis.analyzingWait')}
              </div>
            </div>
          </Card>
        )}

        {/* Error */}
        {analysisError && (
          <Card className="p-8 border-red-200 dark:border-red-800">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400 mb-1">
                  {t('analysis.errorTitle')}
                </p>
                <p className="text-sm text-muted-foreground">{analysisError}</p>
              </div>
              <Button variant="outline" onClick={runAnalysis}>
                {t('analysis.retry')}
              </Button>
            </div>
          </Card>
        )}

        {/* Result */}
        {analysisResult && (
          <Card>
            {/* Result Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-semibold">{t('analysis.resultTitle')}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyResult}
                  className="gap-1.5"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? t('copied') : t('copy')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadResult}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {t('analysis.download')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runAnalysis}
                  disabled={analysisLoading}
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('analysis.reanalyze')}
                </Button>
              </div>
            </div>

            {/* Result Content */}
            <CardContent className="p-6">
              <div className="text-sm leading-relaxed space-y-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:font-semibold [&_em]:italic [&_p]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground">
                <ReactMarkdown>{analysisResult}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
