/**
 * Node Configuration Panel
 * Slide-over panel for configuring workflow nodes:
 * - Video nodes: video details
 * - Brand nodes: brand context textarea
 * - AI nodes: custom prompt + model selector
 * - Output nodes: format options + full output view
 */

import { useState, useEffect } from 'react';
import {
  X,
  Video,
  Building2,
  Search,
  Target,
  Palette,
  Wand2,
  MessageSquare,
  FileText,
  LayoutGrid,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Same icons as WorkflowBuilder
const GeminiIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <defs>
      <linearGradient id="geminiGradCfg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4"/>
        <stop offset="50%" stopColor="#9B72CB"/>
        <stop offset="100%" stopColor="#D96570"/>
      </linearGradient>
    </defs>
    <path fill="url(#geminiGradCfg)" d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
  </svg>
);

const ClaudeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#D97757">
    <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"/>
  </svg>
);

const GPTIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#10A37F">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
  </svg>
);

const modelOptions = [
  { id: 'gemini', name: 'Gemini 2.0 Flash', icon: GeminiIcon, cost: 1 },
  { id: 'claude', name: 'Claude 3.5 Sonnet', icon: ClaudeIcon, cost: 5 },
  { id: 'gpt4', name: 'GPT-4o', icon: GPTIcon, cost: 4 },
];

const nodeIcons: Record<string, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  brand: <Building2 className="h-4 w-4" />,
  analyze: <Search className="h-4 w-4" />,
  extract: <Target className="h-4 w-4" />,
  style: <Palette className="h-4 w-4" />,
  generate: <Wand2 className="h-4 w-4" />,
  refine: <MessageSquare className="h-4 w-4" />,
  script: <FileText className="h-4 w-4" />,
  storyboard: <LayoutGrid className="h-4 w-4" />,
};

const nodeColors: Record<string, string> = {
  video: 'from-blue-500 to-cyan-500',
  brand: 'from-blue-500 to-cyan-500',
  analyze: 'from-purple-500 to-pink-500',
  extract: 'from-purple-500 to-pink-500',
  style: 'from-purple-500 to-pink-500',
  generate: 'from-green-500 to-emerald-500',
  refine: 'from-green-500 to-emerald-500',
  script: 'from-orange-500 to-yellow-500',
  storyboard: 'from-orange-500 to-yellow-500',
};

const nodeTitles: Record<string, string> = {
  video: 'Video Input',
  brand: 'Brand Brief',
  analyze: 'Analyze',
  extract: 'Extract',
  style: 'Style Match',
  generate: 'Generate',
  refine: 'Refine',
  script: 'Script Output',
  storyboard: 'Storyboard',
};

const aiNodeTypes = ['analyze', 'extract', 'style', 'generate', 'refine', 'script', 'storyboard'];

const defaultPromptHints: Record<string, string> = {
  analyze: 'e.g., "Focus on hook techniques and emotional triggers for fitness content"',
  extract: 'e.g., "Extract only hooks and CTAs suitable for beauty niche"',
  style: 'e.g., "Match the fast-paced, text-heavy style with trending sounds"',
  generate: 'e.g., "Create a 30-second script about productivity tips for students"',
  refine: 'e.g., "Make it more conversational and add humor"',
  script: 'e.g., "Format for teleprompter use with clear timing cues"',
  storyboard: 'e.g., "Include B-roll suggestions and specific camera angles"',
};

const nodeDescriptions: Record<string, { title: string; description: string; tips: string[] }> = {
  video: {
    title: 'Video Input',
    description: 'Source video for analysis. Drag saved videos from the sidebar.',
    tips: [
      'Higher UTS score = better viral potential',
      'Video description is used for content analysis',
      'Connect to Analyze or Extract nodes'
    ]
  },
  brand: {
    title: 'Brand Brief',
    description: 'Define your brand identity to align all generated content.',
    tips: [
      'Include target audience demographics',
      'Specify tone of voice (casual, professional, etc.)',
      'Add any content restrictions or guidelines',
      'Mention key messages or values'
    ]
  },
  analyze: {
    title: 'Deep Analysis',
    description: 'AI analyzes content for viral mechanics, hooks, and engagement patterns.',
    tips: [
      'Identifies why content works',
      'Extracts replicable patterns',
      'Best for understanding viral mechanics'
    ]
  },
  extract: {
    title: 'Element Extraction',
    description: 'Pulls out reusable components: hooks, CTAs, hashtags, and templates.',
    tips: [
      'Creates copy-paste ready hooks',
      'Generates hashtag strategy',
      'Outputs CTA templates'
    ]
  },
  style: {
    title: 'Style Guide',
    description: 'Creates detailed style guidelines for consistent content replication.',
    tips: [
      'Defines visual aesthetic',
      'Specifies editing patterns',
      'Includes audio/music direction'
    ]
  },
  generate: {
    title: 'Script Generator',
    description: 'AI creates complete, production-ready TikTok scripts.',
    tips: [
      'Generates hook, body, and CTA',
      'Includes visual directions',
      'Adds hashtag recommendations'
    ]
  },
  refine: {
    title: 'Polish & Improve',
    description: 'Optimizes existing scripts for maximum viral potential.',
    tips: [
      'Strengthens hooks',
      'Adds viral mechanics',
      'Improves engagement triggers'
    ]
  },
  script: {
    title: 'Final Script',
    description: 'Formats script for production use - ready to film.',
    tips: [
      'Clean, professional format',
      'Includes timing markers',
      'Choose output format (Markdown/Plain/JSON)'
    ]
  },
  storyboard: {
    title: 'Visual Storyboard',
    description: 'Scene-by-scene breakdown with visuals, actions, and timing.',
    tips: [
      'Shot-by-shot guide',
      'Includes transitions',
      'Equipment/prop checklist'
    ]
  },
};

// Markdown components for output rendering
const MarkdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-xs">{children}</p>
  ),
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xs font-bold mb-1.5 mt-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-2 space-y-0.5 text-xs">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-0.5 text-xs">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  code: ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-zinc-900 text-zinc-300 rounded-md p-2 my-2 text-[10px] overflow-x-auto">
          <code>{children}</code>
        </pre>
      );
    }
    return <code className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded text-[10px]">{children}</code>;
  },
};

interface NodeConfig {
  customPrompt?: string;
  model?: string;
  brandContext?: string;
  outputFormat?: string;
}

interface WorkflowNode {
  id: number;
  type: string;
  x: number;
  y: number;
  videoData?: {
    id: number;
    platform: string;
    author: string;
    desc: string;
    views: string;
    uts: number;
    thumb: string;
    url?: string;
  };
  outputContent?: string;
  config?: NodeConfig;
}

interface SavedVideoItem {
  id: number;
  platform: string;
  author: string;
  desc: string;
  views: string;
  uts: number;
  thumb: string;
  url?: string;
}

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onClose: () => void;
  onUpdate: (nodeId: number, config: NodeConfig) => void;
  savedVideos?: SavedVideoItem[];
  onAttachVideo?: (nodeId: number, videoData: SavedVideoItem) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate, savedVideos = [], onAttachVideo }: NodeConfigPanelProps) {
  const [customPrompt, setCustomPrompt] = useState(node.config?.customPrompt || '');
  const [selectedModel, setSelectedModel] = useState(node.config?.model || 'gemini');
  const [brandContext, setBrandContext] = useState(node.config?.brandContext || '');
  const [outputFormat, setOutputFormat] = useState(node.config?.outputFormat || 'markdown');
  const [copied, setCopied] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);

  // Sync when node changes
  useEffect(() => {
    setCustomPrompt(node.config?.customPrompt || '');
    setSelectedModel(node.config?.model || 'gemini');
    setBrandContext(node.config?.brandContext || '');
    setOutputFormat(node.config?.outputFormat || 'markdown');
  }, [node.id]);

  const isAINode = aiNodeTypes.includes(node.type);

  const handleSave = () => {
    const config: NodeConfig = {};
    if (isAINode && customPrompt.trim()) config.customPrompt = customPrompt.trim();
    if (isAINode && selectedModel !== 'gemini') config.model = selectedModel;
    if (node.type === 'brand' && brandContext.trim()) config.brandContext = brandContext.trim();
    if (['script', 'storyboard'].includes(node.type)) config.outputFormat = outputFormat;

    onUpdate(node.id, config);
    onClose();
  };

  const handleCopyOutput = async () => {
    if (!node.outputContent) return;
    try {
      await navigator.clipboard.writeText(node.outputContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className={cn("px-4 py-3 border-b border-border bg-gradient-to-r", nodeColors[node.type] || 'from-purple-500 to-pink-500')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {nodeIcons[node.type]}
            <span className="font-medium text-sm">{nodeTitles[node.type] || node.type}</span>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">
              #{node.id}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Node Description */}
          {nodeDescriptions[node.type] && (
            <div className="bg-secondary/50 border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">
                {nodeDescriptions[node.type].description}
              </p>
              <div className="space-y-1">
                {nodeDescriptions[node.type].tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                    <span className="text-purple-400">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Node Config */}
          {node.type === 'video' && (
            <>
              {node.videoData ? (
                <div className="space-y-3">
                  <div className="w-full h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden relative">
                    {node.videoData.thumb ? (
                      <img src={node.videoData.thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-10 w-10 text-gray-600" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-xs">
                      UTS {node.videoData.uts}
                    </Badge>
                    <Badge className="absolute top-2 right-2 bg-black/60 text-white border-0 text-xs">
                      {node.videoData.platform}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{node.videoData.views} views</Badge>
                    </div>
                    <p className="text-xs font-medium">@{node.videoData.author}</p>
                    <p className="text-xs text-muted-foreground">{node.videoData.desc}</p>
                    {node.videoData.url && (
                      <a
                        href={node.videoData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Open original
                      </a>
                    )}
                  </div>
                  {/* Change Video Button */}
                  {savedVideos.length > 0 && onAttachVideo && (
                    <div>
                      <button
                        onClick={() => setShowVideoPicker(prev => !prev)}
                        className="w-full text-xs text-center py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-purple-500 transition-colors"
                      >
                        Change Video
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No video attached</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    {savedVideos.length > 0 ? 'Select a video below or drag from the sidebar' : 'Drag a video from the sidebar onto this node'}
                  </p>
                  {savedVideos.length > 0 && !showVideoPicker && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowVideoPicker(true)}
                      className="text-xs"
                    >
                      <Video className="h-3 w-3 mr-1.5" />
                      Browse Saved Videos
                    </Button>
                  )}
                </div>
              )}

              {/* Video Picker */}
              {showVideoPicker && savedVideos.length > 0 && onAttachVideo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground tracking-wide font-semibold">Select Video</span>
                    <button
                      onClick={() => setShowVideoPicker(false)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                    {savedVideos.map(video => (
                      <button
                        key={video.id}
                        onClick={() => {
                          onAttachVideo(node.id, video);
                          setShowVideoPicker(false);
                        }}
                        className={cn(
                          "w-full flex gap-2 p-2 rounded-lg border text-left transition-all",
                          node.videoData?.id === video.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-border bg-secondary/30 hover:border-purple-400 hover:bg-secondary/60"
                        )}
                      >
                        <div className="w-10 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded overflow-hidden flex-shrink-0">
                          {video.thumb ? (
                            <img src={video.thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-3 w-3 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-[8px] px-1 py-0 h-3.5">
                              {video.uts}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{video.platform}</span>
                          </div>
                          <p className="text-[10px] font-medium truncate">@{video.author}</p>
                          <p className="text-[9px] text-muted-foreground line-clamp-1">{video.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Brand Node Config */}
          {node.type === 'brand' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Brand Context
                  <span className="text-purple-400 ml-1">*</span>
                </label>
                <textarea
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                  placeholder={`Example:
Brand: FitLife App - fitness tracking for busy professionals
Audience: 25-40 year olds, health-conscious, time-poor
Voice: Motivational but not preachy, casual, data-driven
Values: Simplicity, progress over perfection, community
Avoid: Extreme diet talk, unrealistic promises`}
                  className="w-full h-48 bg-secondary border border-border rounded-lg p-3 text-xs resize-none focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5">
                <p className="text-[10px] text-purple-300">
                  <strong>Pro tip:</strong> The more specific your brand context, the better aligned your generated content will be. Include what makes you unique!
                </p>
              </div>
            </div>
          )}

          {/* AI Node Config (analyze, extract, style, generate, refine, script, storyboard) */}
          {isAINode && (
            <>
              {/* Model Selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">AI Model</label>
                <div className="space-y-1.5">
                  {modelOptions.map(model => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                        selectedModel === model.id
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-border bg-secondary/50 hover:border-purple-400"
                      )}
                    >
                      <model.icon />
                      <div className="flex-1 text-left">
                        <div className="text-xs font-medium">{model.name}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {model.cost} cr
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Custom Prompt
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={defaultPromptHints[node.type] || 'Enter a custom prompt for this node...'}
                  className="w-full h-32 bg-secondary border border-border rounded-lg p-3 text-xs resize-none focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty to use the default prompt. The input from connected nodes is automatically prepended.
                </p>
              </div>
            </>
          )}

          {/* Output Format for script/storyboard */}
          {['script', 'storyboard'].includes(node.type) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Output Format</label>
              <div className="flex gap-1.5">
                {['markdown', 'plain', 'json'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={cn(
                      "flex-1 py-1.5 text-xs rounded-lg border transition-colors capitalize",
                      outputFormat === fmt
                        ? "border-purple-500 bg-purple-500/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:border-purple-400"
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Output Content (for any node that has been processed) */}
          {node.outputContent && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Output</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={handleCopyOutput}
                >
                  {copied ? (
                    <><Check className="h-3 w-3 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
              <div className="bg-secondary border border-border rounded-lg p-3 max-h-[300px] overflow-y-auto">
                <div className="prose prose-invert prose-xs max-w-none text-xs text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                    {node.outputContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Save */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          onClick={handleSave}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
