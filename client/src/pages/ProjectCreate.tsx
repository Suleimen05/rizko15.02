import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Square,
  Loader2,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import type { Project } from '@/types';

// =============================================================================
// CONSTANTS
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
  'ugc',
  'talking_head',
  'tutorial',
  'vlog',
  'shorts',
  'educational',
  'entertainment',
  'review',
  'unboxing',
  'storytelling',
] as const;

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube', 'twitter'] as const;

const PLATFORM_EMOJIS: Record<string, string> = {
  tiktok: '\u{1F3B5}',
  instagram: '\u{1F4F7}',
  youtube: '\u{1F534}',
  twitter: '\u{1F426}',
};

const AUDIENCE_OPTIONS = ['13-17', '18-24', '25-34', '35-44', '45+'] as const;

const TOTAL_STEPS = 3;

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProjectCreate() {
  const { t } = useTranslation('projects');
  const navigate = useNavigate();
  const { createProject, generateProfile, transcribeAudio, setActiveProject } =
    useProject();

  // ─── State ────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProject, setGeneratedProject] = useState<Project | null>(
    null
  );
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ─── Derived ──────────────────────────────────────────────────
  const canAdvanceStep1 = projectName.trim().length > 0 && selectedNiche !== '';
  const progressPercent = (step / TOTAL_STEPS) * 100;

  // ─── Step labels ──────────────────────────────────────────────
  const stepLabels = [
    { title: t('create.step1Title'), desc: t('create.step1Desc') },
    { title: t('create.step2Title'), desc: t('create.step2Desc') },
    { title: t('create.step3Title'), desc: t('create.step3Desc') },
  ];

  // ─── Multi-select toggle helper ──────────────────────────────
  const toggleMultiSelect = (
    value: string,
    _selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // ─── Voice recording ─────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (blob.size > 0 && createdProjectId) {
          setIsTranscribing(true);
          try {
            const text = await transcribeAudio(createdProjectId, blob);
            if (text) {
              setDescriptionText((prev) =>
                prev ? `${prev}\n${text}` : text
              );
            }
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error(t('toast.error'));
    }
  }, [createdProjectId, transcribeAudio, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // ─── Navigate between steps ───────────────────────────────────
  const handleNext = useCallback(async () => {
    if (step === 1) {
      // Create the project on the backend when moving to step 2
      if (!createdProjectId) {
        const project = await createProject(projectName.trim());
        if (!project) return;
        setCreatedProjectId(project.id);
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }, [step, createdProjectId, createProject, projectName]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      navigate('/dashboard/projects');
    }
  }, [step, navigate]);

  // ─── Generate profile when entering step 3 ───────────────────
  const runProfileGeneration = useCallback(async () => {
    if (!createdProjectId) return;

    setIsGenerating(true);
    setGeneratedProject(null);

    const formData = {
      niche: selectedNiche,
      formats: selectedFormats,
      platforms: selectedPlatforms,
      audience: selectedAudience,
    };

    try {
      const result = await generateProfile(
        createdProjectId,
        formData,
        descriptionText
      );
      if (result) {
        setGeneratedProject(result);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    createdProjectId,
    selectedNiche,
    selectedFormats,
    selectedPlatforms,
    selectedAudience,
    descriptionText,
    generateProfile,
  ]);

  useEffect(() => {
    if (step === 3 && !generatedProject && !isGenerating) {
      runProfileGeneration();
    }
    // Only trigger on step change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Finish ───────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    if (generatedProject) {
      setActiveProject(generatedProject);
      toast.success(t('toast.profileGenerated'));
      navigate('/dashboard/projects');
    }
  }, [generatedProject, setActiveProject, navigate, t]);

  // =========================================================================
  // RENDER — Step 1: Visual Form
  // =========================================================================
  const renderStep1 = () => (
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
          autoFocus
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
              onClick={() =>
                toggleMultiSelect(fmt, selectedFormats, setSelectedFormats)
              }
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
              onClick={() =>
                toggleMultiSelect(
                  platform,
                  selectedPlatforms,
                  setSelectedPlatforms
                )
              }
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

      {/* Audience Age Selection */}
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
    </div>
  );

  // =========================================================================
  // RENDER — Step 2: Voice / Text Description
  // =========================================================================
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('create.descriptionLabel')}
        </label>
        <p className="text-sm text-muted-foreground">{t('create.orText')}</p>
      </div>

      {/* Voice Recording Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={startRecording}
            disabled={isTranscribing}
            className="gap-2"
          >
            <Mic className="h-5 w-5" />
            {t('create.recordVoice')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={stopRecording}
            className="gap-2 animate-pulse"
          >
            <Square className="h-4 w-4" />
            {t('create.stopRecording')}
          </Button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
            </span>
            {t('create.recording')}
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('create.transcribing')}
          </div>
        )}
      </div>

      {/* Text Area */}
      <Textarea
        value={descriptionText}
        onChange={(e) => setDescriptionText(e.target.value)}
        placeholder={t('create.descriptionPlaceholder')}
        className="min-h-[200px] text-base leading-relaxed resize-y"
        disabled={isRecording || isTranscribing}
      />
    </div>
  );

  // =========================================================================
  // RENDER — Step 3: AI Profile Review
  // =========================================================================
  const renderStep3 = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 h-16 w-16" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-lg font-medium text-foreground">
            {t('create.generating')}
          </p>
          <Progress value={60} className="w-48" />
        </div>
      );
    }

    if (!generatedProject || !generatedProject.profile_data) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-muted-foreground">{t('toast.error')}</p>
          <Button onClick={runProfileGeneration} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('create.regenerate')}
          </Button>
        </div>
      );
    }

    const profile = generatedProject.profile_data;

    return (
      <div className="space-y-6">
        {/* Success Indicator */}
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {t('create.profileReady')}
            </p>
            <p className="text-sm text-muted-foreground">
              {generatedProject.name}
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="p-6 space-y-5">
          {/* Niche + Sub-niche */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                {t('create.profile.niche')}
              </p>
              <p className="text-base font-semibold text-foreground">
                {profile.niche}
              </p>
            </div>
            {profile.sub_niche && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  {t('create.profile.subNiche')}
                </p>
                <p className="text-base font-semibold text-foreground">
                  {profile.sub_niche}
                </p>
              </div>
            )}
          </div>

          {/* Formats */}
          {profile.format && profile.format.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t('create.profile.format')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.format.map((f) => (
                  <Badge key={f} variant="secondary">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Audience */}
          {profile.audience && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t('create.profile.audience')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {profile.audience.age && (
                  <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
                    <span className="text-muted-foreground block text-xs">
                      Age
                    </span>
                    <span className="font-medium text-foreground">
                      {profile.audience.age}
                    </span>
                  </div>
                )}
                {profile.audience.gender && (
                  <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
                    <span className="text-muted-foreground block text-xs">
                      Gender
                    </span>
                    <span className="font-medium text-foreground">
                      {profile.audience.gender}
                    </span>
                  </div>
                )}
                {profile.audience.level && (
                  <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
                    <span className="text-muted-foreground block text-xs">
                      Level
                    </span>
                    <span className="font-medium text-foreground">
                      {profile.audience.level}
                    </span>
                  </div>
                )}
                {profile.audience.interests &&
                  profile.audience.interests.length > 0 && (
                    <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-1.5 mt-1">
                      {profile.audience.interests.map((interest) => (
                        <Badge key={interest} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Tone */}
          {profile.tone && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                {t('create.profile.tone')}
              </p>
              <p className="text-sm font-medium text-foreground">
                {profile.tone}
              </p>
            </div>
          )}

          {/* Platforms */}
          {profile.platforms && profile.platforms.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t('create.profile.platforms')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.platforms.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {profile.keywords && profile.keywords.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t('create.profile.keywords')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.keywords.map((kw) => (
                  <Badge key={kw} variant="default">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Excluded Content */}
          {profile.exclude && profile.exclude.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t('create.profile.exclude')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.exclude.map((ex) => (
                  <Badge key={ex} variant="destructive">
                    {ex}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleFinish} size="lg" className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            {t('create.looksGood')}
          </Button>
          <Button
            onClick={runProfileGeneration}
            variant="outline"
            size="lg"
            className="gap-2"
            disabled={isGenerating}
          >
            <RefreshCw
              className={cn('h-4 w-4', isGenerating && 'animate-spin')}
            />
            {t('create.regenerate')}
          </Button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="mb-8">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('create.back')}
          </button>

          <h1 className="text-2xl font-bold text-foreground">
            {t('create.title')}
          </h1>
        </div>

        {/* ─── Stepper ─────────────────────────────────────────── */}
        <div className="mb-8">
          {/* Progress bar */}
          <Progress value={progressPercent} className="mb-4 h-1.5" />

          {/* Step labels */}
          <div className="grid grid-cols-3 gap-2">
            {stepLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;

              return (
                <div key={stepNum} className="flex items-start gap-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isActive || isCompleted
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {label.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">
                      {label.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Step Content ────────────────────────────────────── */}
        <div className="mb-8">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* ─── Navigation Buttons (Steps 1 & 2) ───────────────── */}
        {step < 3 && (
          <div className="flex items-center justify-between border-t border-border/50 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('create.back')}
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={step === 1 && !canAdvanceStep1}
              className="gap-2"
            >
              {t('create.next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
