import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  RefreshCw,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

// =============================================================================
// CONSTANTS (same as ProjectCreate)
// =============================================================================

const NICHE_OPTIONS = [
  { key: 'fitness', emoji: '\u{1F4AA}' },
  { key: 'cooking', emoji: '\u{1F373}' },
  { key: 'beauty', emoji: '\u{1F484}' },
  { key: 'fashion', emoji: '\u{1F457}' },
  { key: 'tech', emoji: '\u{1F4BB}' },
  { key: 'education', emoji: '\u{1F4DA}' },
  { key: 'entertainment', emoji: '\u{1F3AC}' },
  { key: 'business', emoji: '\u{1F4BC}' },
  { key: 'lifestyle', emoji: '\u{1F31F}' },
  { key: 'gaming', emoji: '\u{1F3AE}' },
  { key: 'travel', emoji: '\u2708\uFE0F' },
  { key: 'music', emoji: '\u{1F3B5}' },
  { key: 'art', emoji: '\u{1F3A8}' },
  { key: 'health', emoji: '\u{1F3E5}' },
  { key: 'finance', emoji: '\u{1F4B0}' },
  { key: 'pets', emoji: '\u{1F43E}' },
  { key: 'other', emoji: '\u26A1' },
] as const;

const FORMAT_OPTIONS = [
  'ugc', 'talking_head', 'tutorial', 'vlog', 'shorts',
  'educational', 'entertainment', 'review', 'unboxing', 'storytelling',
] as const;

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube', 'twitter'] as const;

const PLATFORM_EMOJIS: Record<string, string> = {
  tiktok: '\u{1F3B5}',
  instagram: '\u{1F4F7}',
  youtube: '\u{1F534}',
  twitter: '\u{1F426}',
};

const AUDIENCE_OPTIONS = ['13-17', '18-24', '25-34', '35-44', '45+'] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProjectEdit() {
  const { t } = useTranslation('projects');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, generateProfile } = useProject();

  // ─── State ─────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState('');
  const [tone, setTone] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const project = projects.find(p => p.id === Number(id));

  // ─── Load existing data ────────────────────────────────────────
  useEffect(() => {
    if (project && !loaded) {
      setProjectName(project.name || '');
      const profile = project.profile_data;
      if (profile) {
        // Match niche to our options (case-insensitive)
        const matchedNiche = NICHE_OPTIONS.find(
          n => n.key === profile.niche?.toLowerCase()
        );
        setSelectedNiche(matchedNiche?.key || profile.niche || '');

        setSelectedFormats(profile.format || []);
        setSelectedPlatforms(profile.platforms || []);
        setSelectedAudience(profile.audience?.age || '');
        setTone(profile.tone || '');
        setKeywords(profile.keywords || []);
        setExclude(profile.exclude || []);
      }
      setLoaded(true);
    }
  }, [project, loaded]);

  // ─── Toggle helper ─────────────────────────────────────────────
  const toggleMultiSelect = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const updatedProfile = {
        ...project.profile_data,
        niche: selectedNiche,
        format: selectedFormats,
        platforms: selectedPlatforms,
        audience: {
          ...project.profile_data?.audience,
          age: selectedAudience,
        },
        tone,
        keywords,
        exclude,
      };

      await updateProject(project.id, {
        name: projectName.trim(),
        profile_data: updatedProfile,
      });
      toast.success(t('toast.updated'));
      navigate('/dashboard/projects');
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setIsSaving(false);
    }
  }, [
    project, projectName, selectedNiche, selectedFormats,
    selectedPlatforms, selectedAudience, tone, keywords, exclude,
    updateProject, navigate, t,
  ]);

  // ─── Regenerate AI profile ─────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!project) return;
    setIsRegenerating(true);
    try {
      const formData = {
        niche: selectedNiche,
        formats: selectedFormats,
        platforms: selectedPlatforms,
        audience: selectedAudience,
      };
      const result = await generateProfile(project.id, formData, '');
      if (result?.profile_data) {
        const profile = result.profile_data;
        setSelectedNiche(
          NICHE_OPTIONS.find(n => n.key === profile.niche?.toLowerCase())?.key ||
          profile.niche || ''
        );
        setSelectedFormats(profile.format || []);
        setSelectedPlatforms(profile.platforms || []);
        setSelectedAudience(profile.audience?.age || '');
        setTone(profile.tone || '');
        setKeywords(profile.keywords || []);
        setExclude(profile.exclude || []);
        toast.success(t('toast.profileGenerated'));
      }
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setIsRegenerating(false);
    }
  }, [project, selectedNiche, selectedFormats, selectedPlatforms, selectedAudience, generateProfile, t]);

  // ─── Tag add helpers ───────────────────────────────────────────
  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
    }
    setNewKeyword('');
  };

  const addExclude = () => {
    const ex = newExclude.trim().toLowerCase();
    if (ex && !exclude.includes(ex)) {
      setExclude(prev => [...prev, ex]);
    }
    setNewExclude('');
  };

  // ─── Not found ─────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t('toast.error')}</p>
          <Button variant="outline" onClick={() => navigate('/dashboard/projects')}>
            {t('edit.backToProjects')}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard/projects')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('edit.backToProjects')}
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {t('edit.title')}
            </h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isRegenerating || isSaving}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
                {t('edit.regenerate')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !projectName.trim()}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('edit.save')}
              </Button>
            </div>
          </div>
        </div>

        {/* Regeneration overlay */}
        {isRegenerating && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium">{t('create.generating')}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Project Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('create.projectName')}
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('create.projectNamePlaceholder')}
              className="h-11 text-base"
            />
          </div>

          {/* Niche Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t('create.niche')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {NICHE_OPTIONS.map(({ key, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedNiche(key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-200 cursor-pointer',
                    'hover:border-primary/50 hover:bg-primary/5',
                    selectedNiche === key
                      ? 'ring-2 ring-primary bg-primary/10 border-primary'
                      : 'border-border/50 bg-card'
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs font-medium text-foreground truncate w-full text-center">
                    {t(`create.niches.${key}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t('create.format')}
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => toggleMultiSelect(fmt, setSelectedFormats)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer',
                    'hover:border-primary/50 hover:bg-primary/5',
                    selectedFormats.includes(fmt)
                      ? 'ring-2 ring-primary bg-primary/10 border-primary text-primary'
                      : 'border-border/50 bg-card text-foreground'
                  )}
                >
                  {t(`create.formats.${fmt}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t('create.platform')}
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => toggleMultiSelect(platform, setSelectedPlatforms)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer',
                    'hover:border-primary/50 hover:bg-primary/5',
                    selectedPlatforms.includes(platform)
                      ? 'ring-2 ring-primary bg-primary/10 border-primary text-primary'
                      : 'border-border/50 bg-card text-foreground'
                  )}
                >
                  <span>{PLATFORM_EMOJIS[platform]}</span>
                  {t(`create.platforms_list.${platform}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t('create.audience')}
            </label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => setSelectedAudience(age)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer',
                    'hover:border-primary/50 hover:bg-primary/5',
                    selectedAudience === age
                      ? 'ring-2 ring-primary bg-primary/10 border-primary text-primary'
                      : 'border-border/50 bg-card text-foreground'
                  )}
                >
                  {t(`create.audiences.${age}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('edit.tone')}
            </label>
            <Input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder={t('edit.tonePlaceholder')}
              className="h-11"
            />
          </div>

          {/* Keywords */}
          <Card className="p-5 space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t('create.profile.keywords')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <Badge key={kw} variant="default" className="gap-1 pr-1">
                  {kw}
                  <button
                    type="button"
                    onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder={t('edit.addKeyword')}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Excluded Content */}
          <Card className="p-5 space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t('create.profile.exclude')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {exclude.map((ex) => (
                <Badge key={ex} variant="destructive" className="gap-1 pr-1">
                  {ex}
                  <button
                    type="button"
                    onClick={() => setExclude(prev => prev.filter(e => e !== ex))}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newExclude}
                onChange={(e) => setNewExclude(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExclude())}
                placeholder={t('edit.addExclude')}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addExclude}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Bottom Save Button */}
          <div className="flex items-center justify-between border-t border-border/50 pt-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/projects')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('create.back')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !projectName.trim()}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('edit.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
