import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Heart, MessageCircle, Share2, Eye, Bookmark, Sparkles, TrendingUp, Music, ExternalLink, Info, Flame, Copy, Loader2, Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UTSBreakdown } from '@/components/metrics/UTSBreakdown';
import { UpgradeModal } from '@/components/UpgradeModal';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import i18n from '@/lib/i18n';
// TikTok Embed - официальное легальное решение
import type { TikTokVideo, TikTokVideoDeep, AnalysisMode } from '@/types';
import { useProject } from '@/contexts/ProjectContext';

interface VideoCardProps {
  video: TikTokVideo | TikTokVideoDeep;
  mode?: AnalysisMode;
  onSave?: (video: TikTokVideo) => void;
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
  projectLabel?: { name: string; icon?: string } | null;
}

export function VideoCard({
  video,
  mode = 'light',
  onSave,
  showStats = true,
  size = 'medium',
  projectLabel,
}: VideoCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { activeProject } = useProject();

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

    setSavingInProgress(true);

    try {
      if (isSaved && favoriteId) {
        // Remove from favorites
        await apiService.removeFavorite(favoriteId);
        setIsSaved(false);
        setFavoriteId(null);
        toast.success('Removed from saved videos');
      } else {
        // Check if video has trend_id (Deep Analyze or cached)
        const trendId = video.trend_id || (typeof video.id === 'number' ? video.id : null);

        if (trendId) {
          // Already in DB — just add to favorites
          const result = await apiService.addFavorite({
            trend_id: trendId,
            ...(activeProject?.id && { project_id: activeProject.id }),
          });
          setIsSaved(true);
          setFavoriteId(result.id);
        } else {
          // Light Analyze — save video to DB + favorites in one step
          const finalPlayAddr = video.play_addr || video.video?.playAddr || video.video?.downloadAddr || playAddr || '';
          const result = await apiService.saveVideo({
            platform_id: String(video.id),
            url: videoUrl !== '#' ? videoUrl : `https://www.tiktok.com/@${video.author_username || video.author?.uniqueId || 'user'}/video/${video.id}`,
            description: video.description || '',
            cover_url: video.cover_url || video.video?.cover || '',
            play_addr: finalPlayAddr,
            author_username: video.author_username || video.author?.uniqueId || 'unknown',
            stats: video.stats || {},
            viral_score: video.viralScore || video.uts_score || 0,
            ...(activeProject?.id && { project_id: activeProject.id }),
          });
          setIsSaved(true);
          setFavoriteId(result.id);
        }
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
  
  // Navigate to AI Chat (Workspace) with video data as context
  const handleAIAnalysis = () => {
    const authorName = video.author?.uniqueId || video.author_username || '';
    const videoUrl = video.url || (video.id ? `https://www.tiktok.com/@${authorName}/video/${video.id}` : '');
    const coverImage = video.video?.cover || video.cover_url || '';

    setShowDetails(false);
    navigate('/dashboard/ai-workspace', {
      state: {
        videoContext: {
          url: videoUrl,
          description: video.description || video.title || '',
          author: authorName,
          cover: coverImage,
          stats: {
            playCount: video.stats?.playCount || 0,
            diggCount: video.stats?.diggCount || 0,
            commentCount: video.stats?.commentCount || 0,
            shareCount: video.stats?.shareCount || 0,
          },
          uts_score: video.uts_score || (video as any).viralScore || 0,
          play_addr: video.play_addr || video.video?.playAddr || '',
        },
      },
    });
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
          if (!isPlaying && playAddr) {
            setIsPlaying(true); // Start video playback on click
          }
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
          {isPlaying && playAddr ? (
            // HTML5 Video Player with direct CDN URL
            <video
              src={playAddr}
              className="w-full h-full object-cover"
              controls
              autoPlay
              muted={false}
              playsInline
              onEnded={() => setIsPlaying(false)}
              onClick={(e) => e.stopPropagation()}
            />
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

          {/* Project Badge */}
          {projectLabel && (
            <div className={cn(
              "absolute left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600/80 backdrop-blur-sm text-white text-[10px] font-medium shadow-sm",
              viralScore > 0 ? "top-10" : "top-2"
            )}>
              {projectLabel.icon && <span>{projectLabel.icon}</span>}
              <span className="max-w-[80px] truncate">{projectLabel.name}</span>
            </div>
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
                  #{typeof hashtag === 'string' ? hashtag : hashtag?.name}
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
                onClick={handleAIAnalysis}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Bot className="h-4 w-4 mr-2" />
                {i18n.language === 'ru' ? 'AI Анализ' : 'AI Analysis'}
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
                    onClick={handleAIAnalysis}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    {i18n.language === 'ru' ? 'AI Анализ' : 'AI Analysis'}
                  </Button>
                </div>
              </div>
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
