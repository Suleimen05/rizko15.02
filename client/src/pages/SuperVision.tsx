import { useState, useEffect, useCallback } from 'react';
import {
  ScanEye,
  Play,
  Pause,
  Zap,
  Settings2,
  Trash2,
  X,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  ArrowUpCircle,
  Sparkles,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import type { SuperVisionConfig, SuperVisionResult } from '@/types';

// =============================================================================
// HELPERS
// =============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

const formatTimeAgo = (dateStr: string | null): string => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
};

const formatTimeUntil = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'soon';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  return `in ${diffH}h`;
};

const estimateCredits = (maxVision: number): string => {
  const base = 2 + 4; // scraping + ~2 text batches
  const vision = maxVision * 5;
  return `~${base + vision}`;
};

// =============================================================================
// VIEWS PRESET OPTIONS
// =============================================================================

const VIEWS_OPTIONS = [
  { value: 100000, label: '100K+' },
  { value: 500000, label: '500K+' },
  { value: 1000000, label: '1M+' },
  { value: 5000000, label: '5M+' },
  { value: 10000000, label: '10M+' },
];

const DATE_OPTIONS = [
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

const INTERVAL_OPTIONS = [
  { value: 8, label: 'Every 8h' },
  { value: 12, label: 'Every 12h' },
  { value: 24, label: 'Every 24h' },
  { value: 48, label: 'Every 48h' },
];

const VISION_OPTIONS = [
  { value: 3, label: '3 videos' },
  { value: 5, label: '5 videos' },
  { value: 7, label: '7 videos' },
  { value: 10, label: '10 videos' },
];

// =============================================================================
// RESULT VIDEO CARD
// =============================================================================

function ResultCard({
  result,
  onDismiss,
  onSave,
}: {
  result: SuperVisionResult;
  onDismiss: (id: number) => void;
  onSave: (id: number) => void;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const scoreColor = result.final_score >= 80
    ? 'from-green-500 to-emerald-600'
    : result.final_score >= 60
    ? 'from-yellow-500 to-orange-500'
    : 'from-red-500 to-pink-500';

  return (
    <Card className="overflow-hidden bg-card border-border/50 hover:border-border transition-colors group">
      {/* Video Thumbnail */}
      <div className="relative aspect-[9/16] max-h-[280px] bg-muted overflow-hidden">
        {result.video_cover_url ? (
          <img
            src={result.video_cover_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play className="h-8 w-8" />
          </div>
        )}

        {/* Score badge */}
        <div className={cn(
          "absolute top-2 left-2 px-2 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r",
          scoreColor
        )}>
          {result.final_score}
        </div>

        {/* Vision badge */}
        {result.vision_score !== null && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-600/90 text-white text-[10px] font-medium flex items-center gap-0.5">
            <ScanEye className="h-2.5 w-2.5" />
            {result.vision_score}
          </div>
        )}

        {/* Play button overlay */}
        {result.video_url && (
          <a
            href={result.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
          >
            <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Author */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">@{result.video_author}</span>
          <div className="flex items-center gap-1">
            {result.text_reason && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 truncate max-w-[80px]">
                {result.text_reason}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[28px]">
          {result.video_description || 'No description'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{formatNumber(result.video_stats?.playCount || 0)}</span>
          <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{formatNumber(result.video_stats?.diggCount || 0)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{formatNumber(result.video_stats?.commentCount || 0)}</span>
          <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{formatNumber(result.video_stats?.shareCount || 0)}</span>
        </div>

        {/* Scores bar */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r", scoreColor)}
              style={{ width: `${result.final_score}%` }}
            />
          </div>
          <span className="text-muted-foreground font-medium">{result.final_score}%</span>
        </div>

        {/* Vision match reason */}
        {result.vision_match_reason && (
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full text-left text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <ScanEye className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{result.vision_match_reason}</span>
            <ChevronDown className={cn("h-3 w-3 flex-shrink-0 transition-transform", showAnalysis && "rotate-180")} />
          </button>
        )}

        {showAnalysis && result.vision_analysis && (
          <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10 text-[10px] text-muted-foreground max-h-[120px] overflow-y-auto">
            {result.vision_analysis.substring(0, 500)}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onSave(result.id)}
            disabled={result.is_saved}
          >
            {result.is_saved ? (
              <><BookmarkCheck className="h-3 w-3 mr-1 text-green-500" />Saved</>
            ) : (
              <><Bookmark className="h-3 w-3 mr-1" />Save</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDismiss(result.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SuperVision() {
  const { user } = useAuth();
  const { activeProject } = useProject();

  // Config state
  const [config, setConfig] = useState<SuperVisionConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showEditFilters, setShowEditFilters] = useState(false);

  // Results state
  const [results, setResults] = useState<SuperVisionResult[]>([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>('final_score');

  // Setup form state
  const [formMinViews, setFormMinViews] = useState(500000);
  const [formDateRange, setFormDateRange] = useState(7);
  const [formInterval, setFormInterval] = useState(12);
  const [formMaxVision, setFormMaxVision] = useState(5);
  const [formKeywords, setFormKeywords] = useState('');
  const [formThreshold, setFormThreshold] = useState(70);

  // Actions state
  const [triggering, setTriggering] = useState(false);
  const [creating, setCreating] = useState(false);

  const isPro = user?.subscription === 'pro' || user?.subscription === 'agency';
  const selectedProjectId = activeProject?.id;

  // Load config
  const loadConfig = useCallback(async () => {
    if (!selectedProjectId) {
      setConfig(null);
      setConfigLoading(false);
      return;
    }
    setConfigLoading(true);
    try {
      const data = await apiService.getSuperVisionConfig(selectedProjectId);
      setConfig(data);
      if (data) {
        setFormMinViews(data.min_views);
        setFormDateRange(data.date_range_days);
        setFormInterval(data.scan_interval_hours);
        setFormMaxVision(data.max_vision_videos);
        setFormKeywords(data.custom_keywords?.join(', ') || '');
        setFormThreshold(data.text_score_threshold);
      }
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, [selectedProjectId]);

  // Load results
  const loadResults = useCallback(async (page = 1) => {
    if (!selectedProjectId || !config) return;
    setResultsLoading(true);
    try {
      const data = await apiService.getSuperVisionResults(selectedProjectId, {
        page,
        per_page: 20,
        sort_by: sortBy,
      });
      setResults(data.items || []);
      setResultsTotal(data.total || 0);
      setResultsPage(page);
    } catch {
      // Config may not exist yet
    } finally {
      setResultsLoading(false);
    }
  }, [selectedProjectId, config, sortBy]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (config) loadResults(1); }, [config, sortBy]);

  // Actions
  const handleCreate = async () => {
    if (!selectedProjectId) return;
    setCreating(true);
    try {
      const keywords = formKeywords.split(',').map(k => k.trim()).filter(Boolean);
      const data = await apiService.createSuperVisionConfig({
        project_id: selectedProjectId,
        min_views: formMinViews,
        date_range_days: formDateRange,
        scan_interval_hours: formInterval,
        max_vision_videos: formMaxVision,
        custom_keywords: keywords,
        text_score_threshold: formThreshold,
      });
      setConfig(data);
      setShowSetup(false);
      toast.success('Super Vision configured!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create config');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProjectId) return;
    try {
      const keywords = formKeywords.split(',').map(k => k.trim()).filter(Boolean);
      const data = await apiService.updateSuperVisionConfig(selectedProjectId, {
        min_views: formMinViews,
        date_range_days: formDateRange,
        scan_interval_hours: formInterval,
        max_vision_videos: formMaxVision,
        custom_keywords: keywords,
        text_score_threshold: formThreshold,
      });
      setConfig(data);
      setShowEditFilters(false);
      toast.success('Filters updated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleActivate = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await apiService.activateSuperVision(selectedProjectId);
      setConfig(data);
      toast.success('Super Vision activated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to activate');
    }
  };

  const handlePause = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await apiService.pauseSuperVision(selectedProjectId);
      setConfig(data);
      toast.success('Super Vision paused');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to pause');
    }
  };

  const handleTrigger = async () => {
    if (!selectedProjectId) return;
    setTriggering(true);
    try {
      await apiService.triggerSuperVisionScan(selectedProjectId);
      toast.success('Scan triggered! Results will appear shortly.');
      // Refresh after a delay
      setTimeout(() => { loadConfig(); loadResults(1); }, 5000);
      setTimeout(() => { loadConfig(); loadResults(1); }, 15000);
      setTimeout(() => { loadConfig(); loadResults(1); }, 30000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to trigger scan');
    } finally {
      setTriggering(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Delete Super Vision config and all results?')) return;
    try {
      await apiService.deleteSuperVisionConfig(selectedProjectId);
      setConfig(null);
      setResults([]);
      toast.success('Super Vision deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleDismiss = async (resultId: number) => {
    try {
      await apiService.dismissSuperVisionResult(resultId);
      setResults(prev => prev.filter(r => r.id !== resultId));
      setResultsTotal(prev => prev - 1);
    } catch {
      toast.error('Failed to dismiss');
    }
  };

  const handleSave = async (resultId: number) => {
    try {
      await apiService.saveSuperVisionResult(resultId);
      setResults(prev => prev.map(r => r.id === resultId ? { ...r, is_saved: true } : r));
      toast.success('Saved!');
    } catch {
      toast.error('Failed to save');
    }
  };

  // ── RENDER: Upgrade required ──
  if (!isPro) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <ScanEye className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Super Vision</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered video curation with Gemini Vision. Automatically finds videos that perfectly match your project profile.
          </p>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400">
            Available on PRO and AGENCY plans
          </div>
          <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade to PRO
          </Button>
        </Card>
      </div>
    );
  }

  // ── RENDER: No project selected ──
  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md p-8 text-center space-y-4">
          <ScanEye className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Select a Project</h2>
          <p className="text-sm text-muted-foreground">
            Super Vision works per-project. Select an active project from the sidebar to get started.
          </p>
        </Card>
      </div>
    );
  }

  // ── RENDER: Loading ──
  if (configLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ── Filter form (shared between setup and edit) ──
  const filterForm = (
    <div className="space-y-4">
      {/* Min views */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">Minimum views</label>
        <div className="flex flex-wrap gap-2">
          {VIEWS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormMinViews(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                formMinViews === opt.value
                  ? "bg-purple-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">Date range</label>
        <div className="flex flex-wrap gap-2">
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormDateRange(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                formDateRange === opt.value
                  ? "bg-purple-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scan interval */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">Scan interval</label>
        <div className="flex flex-wrap gap-2">
          {INTERVAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormInterval(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                formInterval === opt.value
                  ? "bg-purple-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max vision videos */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          AI Vision analysis
          <span className="text-muted-foreground font-normal ml-1">(5 credits each)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {VISION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFormMaxVision(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                formMaxVision === opt.value
                  ? "bg-purple-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom keywords */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">
          Custom keywords
          <span className="text-muted-foreground font-normal ml-1">(optional, comma-separated)</span>
        </label>
        <input
          type="text"
          value={formKeywords}
          onChange={(e) => setFormKeywords(e.target.value)}
          placeholder="fitness, workout, gym..."
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Credit estimate */}
      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Estimated cost per scan</span>
        <span className="text-sm font-semibold text-purple-400">{estimateCredits(formMaxVision)} credits</span>
      </div>
    </div>
  );

  // ── RENDER: No config — Setup wizard ──
  if (!config && !showSetup) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <ScanEye className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Super Vision</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Automatically find videos that perfectly match your project <strong className="text-foreground">{activeProject?.name}</strong> using AI + Gemini Vision analysis.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Sparkles, title: 'AI Text Scoring', desc: 'Gemini rates relevance by metadata' },
              { icon: ScanEye, title: 'Vision Analysis', desc: 'Gemini watches videos to verify match' },
              { icon: Clock, title: 'Auto Schedule', desc: 'Runs every 8-48h automatically' },
            ].map((f, i) => (
              <Card key={i} className="p-4 text-center space-y-2 bg-card/50">
                <f.icon className="h-6 w-6 mx-auto text-purple-400" />
                <div className="text-xs font-semibold">{f.title}</div>
                <div className="text-[10px] text-muted-foreground">{f.desc}</div>
              </Card>
            ))}
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            size="lg"
            onClick={() => setShowSetup(true)}
          >
            Configure Super Vision
          </Button>
        </div>
      </div>
    );
  }

  if (!config && showSetup) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSetup(false)} className="p-2 rounded-lg hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold">Configure Super Vision</h2>
              <p className="text-xs text-muted-foreground">for {activeProject?.name}</p>
            </div>
          </div>

          {filterForm}

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanEye className="h-4 w-4 mr-2" />}
            Create & Activate
          </Button>
        </div>
      </div>
    );
  }

  // ── RENDER: Config exists — Dashboard + Results ──
  const statusColor = config?.status === 'active'
    ? 'text-green-400'
    : config?.status === 'error'
    ? 'text-red-400'
    : 'text-yellow-400';

  const StatusIcon = config?.status === 'active'
    ? CheckCircle
    : config?.status === 'error'
    ? AlertCircle
    : Pause;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <ScanEye className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              Super Vision
              <span className={cn("text-xs font-medium flex items-center gap-1", statusColor)}>
                <StatusIcon className="h-3 w-3" />
                {config?.status}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">{activeProject?.name} · {resultsTotal} results</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {config?.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleActivate}>
              <Play className="h-3.5 w-3.5 mr-1" /> Activate
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrigger}
            disabled={triggering}
          >
            {triggering ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
            Scan Now
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowEditFilters(!showEditFilters)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-card/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last scan</div>
          <div className="text-sm font-semibold">{formatTimeAgo(config?.last_run_at || null)}</div>
          {config?.last_run_status && (
            <div className={cn(
              "text-[10px] mt-0.5",
              config.last_run_status === 'success' ? 'text-green-400' : 'text-red-400'
            )}>
              {config.last_run_status}
            </div>
          )}
        </Card>
        <Card className="p-3 bg-card/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next scan</div>
          <div className="text-sm font-semibold">{formatTimeUntil(config?.next_run_at || null)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">every {config?.scan_interval_hours}h</div>
        </Card>
        <Card className="p-3 bg-card/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last scan stats</div>
          <div className="text-sm font-semibold">{config?.last_run_stats?.final_results || 0} found</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {config?.last_run_stats?.scraped || 0} scraped → {config?.last_run_stats?.vision_analyzed || 0} vision
          </div>
        </Card>
        <Card className="p-3 bg-card/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Credits used</div>
          <div className="text-sm font-semibold">{config?.last_run_stats?.credits_used || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {config?.last_run_stats?.duration_seconds ? `${config.last_run_stats.duration_seconds}s` : '—'}
          </div>
        </Card>
      </div>

      {/* Error banner */}
      {config?.status === 'error' && config.last_error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Paused after {config.consecutive_errors} errors</div>
            {config.last_error}
          </div>
        </div>
      )}

      {/* Edit filters panel */}
      {showEditFilters && (
        <Card className="p-4 border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" /> Edit Filters
            </h3>
            <button onClick={() => setShowEditFilters(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {filterForm}
          <Button className="w-full mt-4" onClick={handleUpdate}>
            Save Changes
          </Button>
        </Card>
      )}

      {/* Sort controls */}
      {results.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {['final_score', 'vision_score', 'found_at'].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs transition-colors",
                sortBy === s
                  ? "bg-purple-600/20 text-purple-400 font-medium"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {s === 'final_score' ? 'Score' : s === 'vision_score' ? 'Vision' : 'Recent'}
            </button>
          ))}
        </div>
      )}

      {/* Results grid */}
      {resultsLoading && results.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <ScanEye className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <div className="text-sm font-medium">No results yet</div>
          <p className="text-xs text-muted-foreground">
            {config?.status === 'active'
              ? 'Waiting for the first scan to complete...'
              : 'Activate Super Vision or trigger a manual scan to find videos.'}
          </p>
          {config?.status !== 'active' && (
            <Button variant="outline" size="sm" onClick={handleTrigger} disabled={triggering}>
              {triggering ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              Run First Scan
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map(result => (
              <ResultCard
                key={result.id}
                result={result}
                onDismiss={handleDismiss}
                onSave={handleSave}
              />
            ))}
          </div>

          {/* Pagination */}
          {resultsTotal > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={resultsPage <= 1}
                onClick={() => loadResults(resultsPage - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {resultsPage} of {Math.ceil(resultsTotal / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={resultsPage * 20 >= resultsTotal}
                onClick={() => loadResults(resultsPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
