import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Play, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CompetitorVideo {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  stats: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
    saveCount?: number;
  };
  posted_at: string;
  uts_score?: number;
  is_new?: boolean;
}

interface CompetitorVideoCardProps {
  video: CompetitorVideo;
  onSave?: (video: CompetitorVideo) => void;
  onGenerateScript?: (video: CompetitorVideo) => void;
}

export function CompetitorVideoCard({ video, onSave, onGenerateScript }: CompetitorVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const handleOpenVideo = () => {
    // Toggle video playback on card click
    if (video.video_url) {
      setIsPlaying(!isPlaying);
    } else {
      toast.error('Video URL not available');
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave(video);
      toast.success('Video saved to favorites!');
    }
  };

  const handleGenerateScript = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGenerateScript) {
      onGenerateScript(video);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-orange-500';
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden",
        video.is_new && "ring-2 ring-red-500 ring-offset-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpenVideo}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-muted overflow-hidden">
        {/* New Badge */}
        {video.is_new && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-red-500 text-white animate-pulse">
              🆕 NEW!
            </Badge>
          </div>
        )}

        {/* UTS Score Badge */}
        {video.uts_score !== undefined && (
          <div className="absolute top-2 right-2 z-10">
            <Badge
              variant="secondary"
              className={cn("font-bold backdrop-blur-sm bg-black/50 text-white", getScoreColor(video.uts_score))}
            >
              ⭐ {video.uts_score.toFixed(1)}/10
            </Badge>
          </div>
        )}

        {/* Video Player or Thumbnail */}
        {isPlaying && video.video_url ? (
          <video
            src={video.video_url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            muted={false}
            playsInline
            onEnded={() => setIsPlaying(false)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : !imageError && video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-300",
              isHovered && "scale-105"
            )}
            onError={() => setImageError(true)}
            loading="lazy"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 gap-2">
            <Play className="h-16 w-16 text-white/50" />
            {imageError && (
              <span className="text-xs text-white/40 text-center px-2">
                Thumbnail expired - click Refresh
              </span>
            )}
          </div>
        )}

        {/* Play Overlay */}
        {isHovered && !isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300">
            <div className="bg-white/90 rounded-full p-4">
              <Play className="h-8 w-8 text-purple-600 fill-purple-600" />
            </div>
          </div>
        )}

        {/* Stats Overlay */}
        {!isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  {formatNumber(video.stats.playCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatNumber(video.stats.diggCount)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {formatNumber(video.stats.commentCount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-3 space-y-2">
        {/* Time Posted */}
        <p className="text-xs text-muted-foreground">
          ⏰ {formatTimeAgo(video.posted_at)}
        </p>

        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">
          {video.title || video.description || 'No title'}
        </h3>

        {/* Engagement Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2 border-t">
          <div className="text-center">
            <div className="font-medium text-foreground">{formatNumber(video.stats.playCount)}</div>
            <div>Views</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{formatNumber(video.stats.diggCount)}</div>
            <div>Likes</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{formatNumber(video.stats.commentCount)}</div>
            <div>Comments</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={handleSave}
          >
            <Bookmark className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 bg-gradient-to-r from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20"
            onClick={handleGenerateScript}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI Script
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVideo();
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
