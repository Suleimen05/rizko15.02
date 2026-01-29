import { useState, useRef, useEffect } from 'react';
import { Play, Heart, MessageCircle, Share2, Eye, Bookmark, Sparkles, TrendingUp, Music, ExternalLink, Info, Flame, Copy, Wand2, Loader2, Check, Lock, ArrowRight, Bot, Send, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UTSBreakdown } from '@/components/metrics/UTSBreakdown';
import { UpgradeModal } from '@/components/UpgradeModal';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
// TikTok Embed - официальное легальное решение
import type { TikTokVideo, TikTokVideoDeep, AnalysisMode } from '@/types';
import { useAIScriptGenerator } from '@/hooks/useTikTok';

interface VideoCardProps {
  video: TikTokVideo | TikTokVideoDeep;
  mode?: AnalysisMode;
  showUpgradePrompt?: boolean;
  onGenerateScript?: (video: TikTokVideo) => void;
  onSave?: (video: TikTokVideo) => void;
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function VideoCard({
  video,
  mode = 'light',
  showUpgradePrompt = false,
  onGenerateScript,
  onSave,
  showStats = true,
  size = 'medium',
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeepMetrics, setShowDeepMetrics] = useState(false);
  
  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Script Generator hook
  const { script, loading: scriptLoading, error: scriptError, generate } = useAIScriptGenerator();
  
  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Check if video is saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      // Need trend_id (database ID) to check - this comes from backend
      // The video object should have an 'id' that matches the trend's platform_id
      // or a numeric id if it's from the trends table
      const trendId = video.trend_id || (typeof video.id === 'number' ? video.id : null);
      if (!trendId) return;

      try {
        const result = await apiService.checkFavorite(trendId);
        setIsSaved(result.is_favorited);
        setFavoriteId(result.favorite_id);
      } catch (error) {
        // Silently fail - user might not be authenticated
        console.debug('Could not check favorite status:', error);
      }
    };

    checkSavedStatus();
  }, [video.id, video.trend_id]);

  // Handle save/unsave toggle
  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (savingInProgress) return;

    // Get database trend_id - available in Deep mode or from cached results
    const trendId = video.trend_id || (typeof video.id === 'number' ? video.id : null);
    if (!trendId) {
      toast.error('Save is only available for Deep Analyze results. Enable Deep Analyze to save videos.');
      return;
    }

    setSavingInProgress(true);

    try {
      if (isSaved && favoriteId) {
        // Remove from favorites
        await apiService.removeFavorite(favoriteId);
        setIsSaved(false);
        setFavoriteId(null);
        toast.success('Removed from saved videos');
      } else {
        // Add to favorites
        const result = await apiService.addFavorite({ trend_id: trendId });
        setIsSaved(true);
        setFavoriteId(result.id);
        toast.success('Video saved!');
      }

      // Call optional onSave callback
      onSave?.(video);
    } catch (error: any) {
      console.error('Failed to save/unsave video:', error);
      const message = error.response?.data?.detail || 'Failed to update saved status';
      toast.error(message);
    } finally {
      setSavingInProgress(false);
    }
  };
  
  // AI Chat function
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      // Build context about the video
      const videoContext = `
Video: "${video.description || video.title}"
Author: @${video.author?.uniqueId || video.author_username}
Views: ${video.stats?.playCount?.toLocaleString() || 0}
Likes: ${video.stats?.diggCount?.toLocaleString() || 0}
Comments: ${video.stats?.commentCount?.toLocaleString() || 0}
Shares: ${video.stats?.shareCount?.toLocaleString() || 0}
UTS Score: ${video.uts_score || video.viralScore || 0}
`.trim();

      // Use the same API base URL as other endpoints
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/ai-scripts/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: videoContext,
          history: chatMessages.slice(-6) // Last 6 messages for context
        })
      });
      
      if (!response.ok) throw new Error('Failed to get AI response');
      
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };
  
  // Check if video has Deep Analyze data
  const isDeepVideo = 'uts_breakdown' in video && mode === 'deep';

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleGenerateScript = async () => {
    await generate(
      video.description || video.title || 'Viral TikTok video',
      {
        playCount: video.stats?.playCount || 0,
        diggCount: video.stats?.diggCount || 0,
        commentCount: video.stats?.commentCount || 0,
        shareCount: video.stats?.shareCount || 0,
      },
      'engaging',
      'general',
      30
    );
    setShowScriptModal(true);
  };

  const engagementRate = video.engagementRate || 0;
  const viralScore = video.uts_score || video.viralScore || 0;

  const sizeClasses = {
    small: 'w-32',
    medium: 'w-full',  // Full width of grid cell
    large: 'w-full',
  };

  // Placeholder image for missing covers
  const coverImage = video.video?.cover || video.cover_url || '/placeholder-video.svg';
  const authorAvatar = video.author?.avatar || '/placeholder-avatar.svg';
  const authorName = video.author?.nickname || video.author?.uniqueId || video.author_username || 'Unknown';

  // Get UTS score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-red-500 to-orange-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-blue-500 to-purple-500';
    return 'from-gray-400 to-gray-500';
  };

  // Get video URL for opening in TikTok
  const videoUrl = video.url || video.video?.playAddr || '#';

  // Get direct video playback URL
  const playAddr = video.play_addr || video.video?.playAddr || '';

  // Extract video ID for embedding
  const getVideoId = (): string | null => {
    // First try to use video.id directly (most reliable for TikTok embeds)
    if (video.id && /^\d+$/.test(video.id)) {
      return video.id;
    }
    // Fallback: try to extract from URL
    if (videoUrl && videoUrl !== '#') {
      const match = videoUrl.match(/\/video\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getVideoId();


  return (
    <>
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer border-2',
          viralScore >= 80 && 'border-red-500/30 hover:border-red-500/60',
          viralScore >= 60 && viralScore < 80 && 'border-yellow-500/30 hover:border-yellow-500/60',
          viralScore < 60 && 'hover:border-purple-500/40',
          sizeClasses[size]
        )}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        onClick={(e) => {
          e.preventDefault();
          if (!isPlaying && videoId) {
            setIsPlaying(true); // Start video playback on click
          }
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
          {isPlaying && videoId ? (
            // TikTok Official Embed - легальное решение
            <div className="relative h-full w-full bg-black">
              <button
                className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                }}
              >
                ✕
              </button>
              <iframe
                src={`https://www.tiktok.com/embed/v2/${videoId}?autoplay=1`}
                className="w-full h-full"
                style={{ border: 'none', minHeight: '400px' }}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          ) : coverImage && coverImage !== '/placeholder-video.svg' ? (
            <img
              src={coverImage}
              alt={video.title || 'Video thumbnail'}
              className={cn(
                'h-full w-full object-cover transition-transform duration-300',
                isHovered && 'scale-110'
              )}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-video.svg';
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-500">
              <Play className="h-16 w-16" />
            </div>
          )}

          {/* Overlay - only show when not playing */}
          {!isPlaying && (
            <div className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-60'
            )}>
              {/* Play Button - Always visible, bigger on hover */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  'rounded-full bg-white/90 flex items-center justify-center transition-all duration-300 shadow-lg',
                  isHovered ? 'w-16 h-16 scale-110' : 'w-12 h-12'
                )}>
                  <Play className={cn(
                    'text-black fill-black ml-1',
                    isHovered ? 'h-8 w-8' : 'h-6 w-6'
                  )} />
                </div>
              </div>

              {/* Duration */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.video?.duration || 0)}
              </div>

              {/* AI Generate Button */}
              {onGenerateScript && isHovered && (
                <Button
                  size="sm"
                  className="absolute bottom-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateScript(video);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI Script
                </Button>
              )}
            </div>
          )}
          

          {/* UTS/Viral Score Badge - Always show if available */}
          {viralScore > 0 && (
            <Badge
              className={cn(
                "absolute top-2 left-2 text-white border-0 font-bold text-sm px-3 py-1",
                `bg-gradient-to-r ${getScoreColor(viralScore)}`
              )}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              {viralScore.toFixed(0)}
            </Badge>
          )}

          {/* Open TikTok Button */}
          {videoUrl && videoUrl !== '#' && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 bg-black/70 hover:bg-black/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                window.open(videoUrl, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          {/* Info Button - Opens Modal */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
            title="View Details"
          >
            <Info className="h-4 w-4" />
          </Button>

          {/* Save Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-12 h-8 w-8 bg-black/50 hover:bg-black/70 text-white transition-opacity",
              isSaved ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={handleSaveToggle}
            disabled={savingInProgress}
          >
            {savingInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark className={cn('h-4 w-4', isSaved && 'fill-white text-yellow-400')} />
            )}
          </Button>
        </div>

        {/* Content */}
        <CardContent className="p-3 space-y-2">
          {/* Author */}
          <div className="flex items-center gap-2">
            {authorAvatar && authorAvatar !== '/placeholder-avatar.svg' ? (
              <img
                src={authorAvatar}
                alt={authorName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-purple-500/30"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-avatar.svg';
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold truncate block hover:text-purple-600 cursor-pointer transition-colors">
                @{authorName}
              </span>
            </div>
            {video.author?.verified && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-white shrink-0">
                ✓
              </Badge>
            )}
          </div>

          {/* Title/Description */}
          <p className="text-xs line-clamp-2 text-foreground leading-snug">
            {video.description || video.title || 'No description available'}
          </p>

          {/* Hashtags */}
          {video.hashtags && video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.hashtags.slice(0, 3).map((hashtag) => (
                <Badge key={hashtag?.id || hashtag?.name} variant="outline" className="text-xs">
                  #{hashtag?.name || hashtag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats - Compact */}
          {showStats && (
            <div className="space-y-1.5 pt-1.5 border-t">
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                  <Eye className="h-3 w-3" />
                  <span>{formatNumber(video.stats?.playCount || 0)}</span>
                </div>
                <div className="flex items-center gap-1 text-pink-600 dark:text-pink-400 font-medium">
                  <Heart className="h-3 w-3" />
                  <span>{formatNumber(video.stats?.diggCount || 0)}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <MessageCircle className="h-3 w-3" />
                  <span>{formatNumber(video.stats?.commentCount || 0)}</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <Share2 className="h-3 w-3" />
                  <span>{formatNumber(video.stats?.shareCount || 0)}</span>
                </div>
              </div>
              {engagementRate > 0 && (
                <Badge variant="secondary" className="text-xs w-full justify-center">
                  Engagement: {engagementRate.toFixed(1)}%
                </Badge>
              )}
            </div>
          )}

          {/* UTS Viral Score Bar - More prominent */}
          {viralScore > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  UTS Score
                </span>
                <span className="text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {viralScore.toFixed(0)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden shadow-inner">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 shadow-lg',
                    `bg-gradient-to-r ${getScoreColor(viralScore)}`
                  )}
                  style={{ width: `${Math.min(viralScore, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Analysis Modal - Professional Layout */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                {authorAvatar && authorAvatar !== '/placeholder-avatar.svg' ? (
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/20"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-avatar.svg';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="font-semibold">@{authorName}</h3>
              </div>
              <Button
                onClick={handleGenerateScript}
                size="sm"
                disabled={scriptLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {scriptLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate AI Script
                  </>
                )}
              </Button>
            </div>

            {/* Main Content: Video + Metrics */}
            <div className="flex gap-6 p-6 flex-1 min-h-0 overflow-hidden">
              {/* Left: Video Player */}
              <div className="flex-shrink-0 w-[300px]">
                <div className="aspect-[9/16] rounded-lg overflow-hidden bg-black relative group">
                  {playAddr ? (
                    <video
                      className="h-full w-full object-contain"
                      src={playAddr}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                    />
                  ) : videoId ? (
                    <iframe
                      src={`https://www.tiktok.com/embed/v2/${videoId}`}
                      className="h-full w-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media;"
                      style={{ border: 'none' }}
                    />
                  ) : (
                    <div className="relative h-full w-full">
                      <img
                        src={coverImage}
                        alt={video.description}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-video.svg';
                        }}
                      />
                      {/* Overlay button to watch on TikTok */}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Button
                          size="lg"
                          onClick={() => window.open(videoUrl, '_blank')}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Watch on TikTok
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Metrics & Info */}
              <div className="flex-1 space-y-4 overflow-y-auto min-w-0 max-w-[500px]">
                {/* Deep Analyze Badge */}
                {isDeepVideo && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="font-semibold text-purple-600">Deep Analyze Results</span>
                    <Badge className="ml-auto bg-purple-500/20 text-purple-600 border-purple-500/30">PRO</Badge>
                  </div>
                )}

                {/* UTS Breakdown (Deep mode only) */}
                {isDeepVideo && (video as TikTokVideoDeep).uts_breakdown && (
                  <UTSBreakdown 
                    uts_score={viralScore} 
                    breakdown={(video as TikTokVideoDeep).uts_breakdown!} 
                  />
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-200/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-medium text-muted-foreground">UTS Score</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{viralScore.toFixed(1)}</div>
                  </Card>

                  <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground">Views</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{formatNumber(video.stats?.playCount || 0)}</div>
                  </Card>

                  <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200/20">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium text-muted-foreground">Engagement</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{engagementRate.toFixed(1)}%</div>
                  </Card>
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-200/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-4 w-4 text-pink-500" />
                      <span className="text-xs font-medium text-muted-foreground">Likes</span>
                    </div>
                    <div className="text-2xl font-bold text-pink-600">{formatNumber(video.stats?.diggCount || 0)}</div>
                  </Card>

                  <Card className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/20">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-medium text-muted-foreground">Comments</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{formatNumber(video.stats?.commentCount || 0)}</div>
                  </Card>

                  <Card className="p-3 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border-indigo-200/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Share2 className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-medium text-muted-foreground">Shares</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">{formatNumber(video.stats?.shareCount || 0)}</div>
                  </Card>
                </div>

                {/* Deep Analyze Extra Metrics */}
                {isDeepVideo && (
                  <div className="grid grid-cols-2 gap-3">
                    {(video as TikTokVideoDeep).cascade_count !== undefined && (
                      <Card className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-200/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Music className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs font-medium text-muted-foreground">Sound Cascade</span>
                        </div>
                        <div className="text-xl font-bold text-yellow-600">
                          {(video as TikTokVideoDeep).cascade_count} videos
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Using this sound</p>
                      </Card>
                    )}
                    {(video as TikTokVideoDeep).saturation_score !== undefined && (
                      <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-200/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Info className="h-4 w-4 text-cyan-600" />
                          <span className="text-xs font-medium text-muted-foreground">Saturation</span>
                        </div>
                        <div className="text-xl font-bold text-cyan-600">
                          {((video as TikTokVideoDeep).saturation_score! * 100).toFixed(0)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(video as TikTokVideoDeep).saturation_score! > 0.7 ? '✅ Fresh trend' : '⚠️ Getting saturated'}
                        </p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Description */}
                <Card className="p-4">
                  <p className="text-sm leading-relaxed">{video.description}</p>
                </Card>

                {/* Music */}
                {video.music && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Music:</span>
                      <span className="text-sm text-muted-foreground">{video.music.title}</span>
                    </div>
                  </Card>
                )}

                {/* Hashtags */}
                {video.hashtags && video.hashtags.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {video.hashtags.map((hashtag) => (
                        <Badge
                          key={hashtag.id}
                          variant="secondary"
                          className="hover:bg-purple-100 dark:hover:bg-purple-900/20 cursor-pointer"
                        >
                          #{hashtag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(videoUrl);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(videoUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in TikTok
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={() => {
                      setShowDetails(false);
                      setShowAIChat(true);
                      // Add initial context message
                      if (chatMessages.length === 0) {
                        setChatMessages([{
                          role: 'assistant',
                          content: `Hi! I'm analyzing this video by @${video.author?.uniqueId || video.author_username}. It has ${video.stats?.playCount?.toLocaleString() || 0} views and a UTS Score of ${video.uts_score || video.viralScore || 0}. What would you like to know about it?`
                        }]);
                      }
                    }}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Ask AI
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Script Modal */}
      <Dialog open={showScriptModal} onOpenChange={setShowScriptModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              Generated Viral Script
            </DialogTitle>
          </DialogHeader>

          {scriptLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-muted-foreground">Generating your viral script with AI...</span>
            </div>
          )}

          {scriptError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">{scriptError}</p>
            </div>
          )}

          {script && !scriptLoading && (
            <div className="space-y-6">
              {/* Hook Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">Hook (0-3s)</Badge>
                </div>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200">
                  <p className="text-lg font-semibold">{script.hook}</p>
                </Card>
              </div>

              {/* Body Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Body</Badge>
                </div>
                <div className="space-y-3">
                  {script.body.map((line, index) => (
                    <Card key={index} className="p-4">
                      <p className="text-sm leading-relaxed">{line}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Call to Action */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-green-600 to-emerald-600">Call to Action</Badge>
                </div>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200">
                  <p className="text-lg font-semibold">{script.callToAction}</p>
                </Card>
              </div>

              {/* Viral Elements */}
              {script.viralElements && script.viralElements.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold">Viral Elements</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {script.viralElements.map((element, index) => (
                      <Badge key={index} variant="secondary" className="bg-orange-100 dark:bg-orange-900/20">
                        {element}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {script.tips && script.tips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold">Pro Tips</span>
                  </div>
                  <ul className="space-y-2">
                    {script.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Duration: ~{script.duration}s</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const scriptText = `
HOOK: ${script.hook}

BODY:
${script.body.map((line, i) => `${i + 1}. ${line}`).join('\n')}

CALL TO ACTION: ${script.callToAction}

VIRAL ELEMENTS: ${script.viralElements?.join(', ')}

TIPS:
${script.tips?.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

Duration: ~${script.duration}s
                    `.trim();
                    navigator.clipboard.writeText(scriptText);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Script
                </Button>
                <Button
                  onClick={handleGenerateScript}
                  variant="outline"
                  disabled={scriptLoading}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Chat Modal */}
      <Dialog open={showAIChat} onOpenChange={setShowAIChat}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-purple-600/10 to-pink-600/10">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">AI Video Analyst</DialogTitle>
              <p className="text-xs text-muted-foreground">Ask me anything about this video</p>
            </div>
          </div>

          {/* Video Context Card */}
          <div className="px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-3">
              {coverImage && coverImage !== '/placeholder-video.svg' && (
                <img src={coverImage} alt="" className="w-12 h-16 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">@{video.author?.uniqueId || video.author_username}</p>
                <p className="text-xs text-muted-foreground truncate">{video.description || video.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {(video.stats?.playCount || 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {(video.stats?.diggCount || 0).toLocaleString()}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    UTS: {video.uts_score || video.viralScore || 0}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="p-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 h-fit">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="p-1.5 rounded-full bg-muted h-fit">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="p-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto">
            {['Why is this viral?', 'How to recreate?', 'Target audience?', 'Best posting time?'].map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => {
                  setChatInput(q);
                  setTimeout(() => sendChatMessage(), 100);
                }}
                disabled={chatLoading}
              >
                {q}
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about this video..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                disabled={chatLoading}
              />
              <Button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || chatLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Deep Analyze"
      />
    </>
  );
}
