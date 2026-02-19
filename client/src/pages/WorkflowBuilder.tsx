import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/lib/i18n';
import {
  Send,
  ChevronDown,
  Check,
  Trash2,
  Play,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Video,
  Building2,
  Search,
  Target,
  Palette,
  Wand2,
  MessageSquare,
  FileText,
  LayoutGrid,
  Loader2,
  FolderOpen,
  X,
  Plus,
  ChevronRight,
  Copy,
  RefreshCw,
  Sparkles,
  Bot,
  User,
  Zap,
  Lightbulb,
  PenTool,
  TrendingUp,
  Save,
  MoreVertical,
  Pencil,
  Pin,
  Settings2,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  Download,
  Award,
  Timer,
  Coins,
  Component,
  Heart,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useWorkflow, type SavedVideo } from '@/contexts/WorkflowContext';
import { useProject } from '@/contexts/ProjectContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import { DevAccessGate } from '@/components/DevAccessGate';
import { NodeConfigPanel, NODE_MODEL_COSTS } from '@/components/workflow/NodeConfigPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================================
// AI MODELS & CONTENT MODES
// ============================================================================

const GeminiIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <defs>
      <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4"/>
        <stop offset="50%" stopColor="#9B72CB"/>
        <stop offset="100%" stopColor="#D96570"/>
      </linearGradient>
    </defs>
    <path fill="url(#geminiGrad)" d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
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

const NanoBanaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <defs>
      <linearGradient id="nanoBanaGradWf" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EA4335"/>
        <stop offset="33%" stopColor="#FBBC04"/>
        <stop offset="66%" stopColor="#34A853"/>
        <stop offset="100%" stopColor="#4285F4"/>
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#nanoBanaGradWf)" opacity="0.9"/>
    <circle cx="9" cy="10" r="2.5" fill="white" opacity="0.9"/>
    <path d="M5 17l4-5 3 3.5 2-2.5 5 4H5z" fill="white" opacity="0.85"/>
  </svg>
);

const getAiModels = (t: TFunction) => [
  { id: 'gemini', name: t('models.gemini.name'), icon: GeminiIcon, available: true, description: t('models.gemini.description'), creditCost: 1 },
  { id: 'nano-bana', name: t('models.nano-bana.name'), icon: NanoBanaIcon, available: true, description: t('models.nano-bana.description'), creditCost: 2, isImageGen: true },
  { id: 'claude', name: t('models.claude.name'), icon: ClaudeIcon, available: true, description: t('models.claude.description'), creditCost: 5 },
  { id: 'gpt4', name: t('models.gpt4.name'), icon: GPTIcon, available: true, description: t('models.gpt4.description'), creditCost: 4 },
];

const getContentModes = (t: TFunction) => [
  { id: 'chat', name: t('modes.chat.name'), icon: MessageSquare, description: t('modes.chat.description'), color: 'from-zinc-600 to-zinc-700' },
  { id: 'script', name: t('modes.script.name'), icon: PenTool, description: t('modes.script.description'), color: 'from-zinc-600 to-zinc-700' },
  { id: 'ideas', name: t('modes.ideas.name'), icon: Lightbulb, description: t('modes.ideas.description'), color: 'from-zinc-600 to-zinc-700' },
  { id: 'analysis', name: t('modes.analysis.name'), icon: TrendingUp, description: t('modes.analysis.description'), color: 'from-zinc-600 to-zinc-700' },
  { id: 'improve', name: t('modes.improve.name'), icon: Zap, description: t('modes.improve.description'), color: 'from-zinc-600 to-zinc-700' },
  { id: 'hook', name: t('modes.hook.name'), icon: Sparkles, description: t('modes.hook.description'), color: 'from-zinc-600 to-zinc-700' },
  { id: 'prompt-enhancer', name: t('modes.prompt-enhancer.name'), icon: Wand2, description: t('modes.prompt-enhancer.description'), color: 'from-zinc-600 to-zinc-700' },
];


// ============================================================================
// NODE TYPES
// ============================================================================

const getNodeTypes = (t: TFunction): Record<string, {
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  hasInput: boolean;
  hasOutput: boolean;
}> => ({
  video: { title: t('nodes.video.title'), icon: <Video className="h-4 w-4" />, description: t('nodes.video.description'), color: 'from-zinc-600 to-zinc-700', hasInput: false, hasOutput: true },
  brand: { title: t('nodes.brand.title'), icon: <Building2 className="h-4 w-4" />, description: t('nodes.brand.description'), color: 'from-zinc-600 to-zinc-700', hasInput: false, hasOutput: true },
  analyze: { title: t('nodes.analyze.title'), icon: <Search className="h-4 w-4" />, description: t('nodes.analyze.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: true },
  extract: { title: t('nodes.extract.title'), icon: <Target className="h-4 w-4" />, description: t('nodes.extract.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: true },
  style: { title: t('nodes.style.title'), icon: <Palette className="h-4 w-4" />, description: t('nodes.style.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: true },
  generate: { title: t('nodes.generate.title'), icon: <Wand2 className="h-4 w-4" />, description: t('nodes.generate.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: true },
  refine: { title: t('nodes.refine.title'), icon: <MessageSquare className="h-4 w-4" />, description: t('nodes.refine.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: true },
  script: { title: t('nodes.script.title'), icon: <FileText className="h-4 w-4" />, description: t('nodes.script.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: false },
  storyboard: { title: t('nodes.storyboard.title'), icon: <LayoutGrid className="h-4 w-4" />, description: t('nodes.storyboard.description'), color: 'from-zinc-600 to-zinc-700', hasInput: true, hasOutput: false },
});

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowNode {
  id: number;
  type: string;
  x: number;
  y: number;
  videoData?: SavedVideo;
  outputContent?: string;
  config?: {
    customPrompt?: string;
    model?: string;
    brandContext?: string;
    outputFormat?: string;
  };
}

interface Connection {
  from: number;
  to: number;
}

// SavedVideo type imported from WorkflowContext


// ============================================================================
// PLATFORM ICONS
// ============================================================================

const platformIcons: Record<string, string> = {
  'TikTok': 'T',
  'Instagram': 'IG',
  'YouTube': 'YT',
  'Snapchat': 'SC',
  'X': 'X',
  'Pinterest': 'P',
  'LinkedIn': 'LI',
};

// ============================================================================
// MARKDOWN COMPONENTS
// ============================================================================

const MarkdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{children}</p>
  ),
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-base font-bold mb-2 mt-3 first:mt-0" style={{ wordBreak: 'break-word' }}>{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-bold mb-2 mt-2 first:mt-0" style={{ wordBreak: 'break-word' }}>{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0" style={{ wordBreak: 'break-word' }}>{children}</h3>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="leading-relaxed" style={{ wordBreak: 'break-word' }}>{children}</li>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-foreground/80">{children}</em>
  ),
  code: ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-secondary text-foreground/80 rounded-md p-2 my-2 text-xs overflow-x-auto">
          <code style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-secondary text-foreground/90 px-1 py-0.5 rounded text-xs font-mono" style={{ wordBreak: 'break-all' }}>{children}</code>
    );
  },
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-2 border-blue-500 pl-3 my-2 text-muted-foreground italic" style={{ wordBreak: 'break-word' }}>
      {children}
    </blockquote>
  ),
  a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline" style={{ wordBreak: 'break-all' }}>{children}</a>
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => {
    const imgSrc = src?.startsWith('/uploads')
      ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000'}${src}`
      : src;
    return <img src={imgSrc} alt={alt || 'Generated image'} className="rounded-lg max-w-full my-2" style={{ maxHeight: '512px' }} />;
  },
};

// ============================================================================
// UTILITY FUNCTIONS (outside component for stable references)
// ============================================================================

// detectPlatform & formatViews moved to WorkflowContext

// NODE_MODEL_COSTS imported from NodeConfigPanel (single source of truth)

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
};

// Static templates — no need to fetch from API, they never change
const getTemplates = (t: TFunction) => [
  { id: 'video-analysis', name: t('templates.video-analysis'), node_count: 4, estimated_credits: 3 },
  { id: 'script-generator', name: t('templates.script-generator'), node_count: 5, estimated_credits: 5 },
  { id: 'full-pipeline', name: t('templates.full-pipeline'), node_count: 8, estimated_credits: 10 },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkflowBuilder() {
  const { t } = useTranslation('workflow');
  const { user: _user, tokens } = useAuth();
  const { activeProject } = useProject();
  const token = tokens?.accessToken;

  // Use shared chat context
  const {
    currentSessionId,
    messages,
    isStreaming,
    credits,
    sessions: chatSessions,
    createSession,
    selectSession,
    deleteSession: deleteChatSession,
    renameSession: renameChatSession,
    pinSession: pinChatSession,
    sendMessage: sendChatMessage,
    stopGeneration,
  } = useChat();

  // Use workflow context for persistence + preloaded data
  const {
    workflows,
    currentWorkflow,
    isDirty,
    loadWorkflows,
    loadWorkflow,
    saveWorkflow,
    deleteWorkflow: deleteWf,
    closeWorkflow,
    markDirty,
    setCurrentWorkflow,
    savedVideos,
    loadingSaved,
    runHistory,
    loadingHistory,
    loadRunHistory,
    removeSavedVideo,
    removeRunHistoryItem,
    renameRun,
    pinRun,
  } = useWorkflow();

  // Memoized translated data
  const aiModels = useMemo(() => getAiModels(t), [t]);
  const contentModes = useMemo(() => getContentModes(t), [t]);
  const nodeTypes = useMemo(() => getNodeTypes(t), [t]);
  const TEMPLATES = useMemo(() => getTemplates(t), [t]);

  // Canvas state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [nodeIdCounter, setNodeIdCounter] = useState(0);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Sidebar state
  const [openPanel, setOpenPanel] = useState<'nodes' | 'saved' | 'history' | 'chat' | null>('nodes');
  const [savedTab, setSavedTab] = useState<'videos' | 'workflows'>('workflows');
  const [historyTab, setHistoryTab] = useState<'runs' | 'chats'>('runs');
  // savedVideos & loadingSaved come from useWorkflow() context
  const [platformFilter, setPlatformFilter] = useState('All');

  // Workflow name editing
  const [workflowName, setWorkflowName] = useState(t('untitledWorkflow'));
  const [editingName, setEditingName] = useState(false);

  // Node config panel
  const [configNode, setConfigNode] = useState<WorkflowNode | null>(null);

  // Selected connection for deletion
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  // Chat UI state (local only)
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(aiModels.find(m => m.available) || aiModels[0]);
  const [selectedMode, setSelectedMode] = useState(contentModes[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  // showModeMenu removed (unused)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteRunConfirmId, setDeleteRunConfirmId] = useState<number | null>(null);
  const [renamingRunId, setRenamingRunId] = useState<number | null>(null);
  const [renameRunValue, setRenameRunValue] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Image helpers
  const extractImageUrls = useCallback((content: string): string[] => {
    const urls: string[] = [];
    let m;
    const re = /!\[[^\]]*\]\(([^)]+)\)/g;
    while ((m = re.exec(content)) !== null) urls.push(m[1]);
    return urls;
  }, []);

  const resolveImgSrc = useCallback((src: string) => {
    if (src.startsWith('/uploads')) {
      const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000';
      return `${base}${src}`;
    }
    return src;
  }, []);

  const handleDownloadImage = useCallback(async (imgSrc: string) => {
    try {
      const res = await fetch(imgSrc, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rizko-ai-${Date.now()}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch {
      // Fallback: open image via backend proxy-like download
      const a = document.createElement('a');
      a.href = imgSrc;
      a.download = `rizko-ai-${Date.now()}.png`;
      a.target = '_blank';
      a.click();
    }
  }, []);

  // History (runHistory & loadingHistory come from useWorkflow() context)
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState<any | null>(null);
  const [showRunDetailModal, setShowRunDetailModal] = useState(false);

  // Fullscreen results view
  const [showResultsView, setShowResultsView] = useState(false);
  const [lastRunResults, setLastRunResults] = useState<{
    results: any[];
    final_script?: string;
    storyboard?: string;
    credits_used?: number;
    execution_time_ms?: number;
    error?: string;
  } | null>(null);
  const [resultsActiveTab, setResultsActiveTab] = useState<'script' | 'storyboard' | 'nodes' | 'all'>('all');
  const [resultsCopied, setResultsCopied] = useState<string | null>(null);

  // Workflow
  const [isRunning, setIsRunning] = useState(false);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [processedNodes, setProcessedNodes] = useState<Set<number>>(new Set());

  // Connection dragging (port-to-port)
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: number; x: number; y: number } | null>(null);
  const [connectingMouse, setConnectingMouse] = useState<{ x: number; y: number } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const spaceHeldRef = useRef(false);

  // Dragging state
  const [draggingNode, setDraggingNode] = useState<{
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // ============================================================================
  // LOAD SAVED VIDEOS
  // ============================================================================

  // All data (workflows, savedVideos, runHistory) preloaded via WorkflowContext on auth

  // Load a run's full workflow onto the canvas with results
  const handleLoadRunOnCanvas = useCallback(async (run: any) => {
    try {
      setSelectedRun(run);
      const detail = await apiService.getWorkflowRun(run.id);
      setSelectedRunDetail(detail);

      if (!detail?.input_graph?.nodes) {
        toast.error(t('toasts.noGraphData'));
        return;
      }

      // Restore nodes from input_graph, apply results as outputContent
      const restoredNodes: WorkflowNode[] = detail.input_graph.nodes.map((n: any) => {
        const nodeResult = detail.results?.find((r: any) => r.node_id === n.id);
        return {
          id: n.id,
          type: n.type,
          x: n.x || 0,
          y: n.y || 0,
          videoData: n.videoData || undefined,
          config: n.config || undefined,
          outputContent: nodeResult?.success ? nodeResult.content : n.outputContent || undefined,
        };
      });

      // Restore connections
      const restoredConnections: Connection[] = (detail.input_graph.connections || []).map((c: any) => ({
        from: c.from ?? c.from_node,
        to: c.to ?? c.to_node,
      }));

      // Apply to canvas
      setNodes(restoredNodes);
      setConnections(restoredConnections);
      setNodeIdCounter(Math.max(0, ...restoredNodes.map(n => n.id)) + 1);
      setWorkflowName(detail.workflow_name || t('untitledWorkflow'));

      // Mark processed nodes
      const processedSet = new Set<number>();
      restoredNodes.forEach(n => { if (n.outputContent) processedSet.add(n.id); });
      setProcessedNodes(processedSet);

      // Show results view
      setLastRunResults({
        results: detail.results || [],
        final_script: detail.final_script,
        storyboard: detail.storyboard,
        credits_used: detail.credits_used,
        execution_time_ms: detail.execution_time_ms,
        error: detail.error_message,
      });
      setResultsActiveTab(detail.final_script ? 'script' : detail.storyboard ? 'storyboard' : 'all');
      setShowResultsView(true);

      toast.success(t('toasts.runLoadedOnCanvas'));
    } catch (error) {
      console.error('Failed to load run on canvas:', error);
      toast.error(t('toasts.failedLoadRunDetails'));
    }
  }, [t]);

  // ============================================================================
  // WORKFLOW PERSISTENCE - sync currentWorkflow ↔ local canvas state
  // ============================================================================

  // When a saved workflow is loaded, restore canvas state
  useEffect(() => {
    if (currentWorkflow) {
      const graph = currentWorkflow.graph_data || { nodes: [], connections: [] };
      setNodes(graph.nodes || []);
      setConnections(graph.connections || []);
      setWorkflowName(currentWorkflow.name);
      const maxId = (graph.nodes || []).reduce((max: number, n: any) => Math.max(max, n.id), -1);
      setNodeIdCounter(maxId + 1);
      // Restore canvas
      const cs = currentWorkflow.canvas_state;
      if (cs) {
        setZoom(cs.zoom || 1);
        setPanOffset({ x: cs.panX || 0, y: cs.panY || 0 });
      }
      setConfigNode(null);
      setSelectedNode(null);
    }
  }, [currentWorkflow?.id]);

  // Handle save
  const handleSaveWorkflow = useCallback(async () => {
    if (!token) {
      toast.error(t('toasts.loginToSave'));
      return;
    }
    const graphData = {
      nodes: nodes.map(n => ({ ...n, outputContent: undefined })),
      connections,
    };
    const canvasState = { zoom, panX: panOffset.x, panY: panOffset.y };

    await saveWorkflow({
      name: workflowName,
      graph_data: graphData,
      canvas_state: canvasState,
    });
    toast.success(t('toasts.workflowSaved'));
  }, [token, nodes, connections, zoom, panOffset, workflowName, saveWorkflow]);

  // Handle new workflow — just reset local state, no DB entry until Save
  const handleNewWorkflow = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setNodeIdCounter(0);
    setWorkflowName(t('untitledWorkflow'));
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setConfigNode(null);
    setSelectedNode(null);
    setLastRunResults(null);
    setShowResultsView(false);
    closeWorkflow();
  }, [closeWorkflow]);

  // Handle load workflow from list
  const handleLoadWorkflow = useCallback(async (id: number) => {
    await loadWorkflow(id);
  }, [loadWorkflow]);

  // Handle node config update from NodeConfigPanel
  const handleNodeConfigUpdate = useCallback((nodeId: number, config: {
    customPrompt?: string;
    model?: string;
    brandContext?: string;
    outputFormat?: string;
  }) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, config: Object.keys(config).length > 0 ? config : undefined } : n
    ));
    markDirty();
  }, [markDirty]);

  // Create workflow from template
  const handleUseTemplate = useCallback(async (templateId: string) => {
    if (!token) {
      toast.error(t('toasts.loginToTemplates'));
      return;
    }
    try {
      const wf = await apiService.createFromTemplate(templateId);
      setCurrentWorkflow(wf);
      await loadWorkflows();
      toast.success(t('toasts.createdFromTemplate'));
    } catch (error) {
      console.error('Failed to create from template:', error);
      toast.error(t('toasts.failedCreateTemplate'));
    }
  }, [token, setCurrentWorkflow, loadWorkflows]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Space for pan mode
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('input, textarea')) {
        e.preventDefault();
        spaceHeldRef.current = true;
      }

      // Don't intercept when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected connection
        if (selectedConnection) {
          const [fromStr, toStr] = selectedConnection.split('-');
          const fromId = parseInt(fromStr);
          const toId = parseInt(toStr);
          setConnections(prev => prev.filter(c => !(c.from === fromId && c.to === toId)));
          setSelectedConnection(null);
          markDirty();
          e.preventDefault();
          return;
        }
        // Delete selected node
        if (selectedNode !== null) {
          setNodes(prev => prev.filter(n => n.id !== selectedNode));
          setConnections(prev => prev.filter(c => c.from !== selectedNode && c.to !== selectedNode));
          if (configNode?.id === selectedNode) setConfigNode(null);
          setSelectedNode(null);
          markDirty();
          e.preventDefault();
          return;
        }
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedConnection(null);
        setConfigNode(null);
      }

      // Ctrl+S: save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveWorkflow();
      }

      // Ctrl+0: reset zoom
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
      }

      // Ctrl+= / Ctrl+-: zoom in/out
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(prev => Math.min(2, +(prev + 0.1).toFixed(2)));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom(prev => Math.max(0.3, +(prev - 0.1).toFixed(2)));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedConnection, selectedNode, configNode, handleSaveWorkflow, markDirty]);

  // ============================================================================
  // CHAT FUNCTIONS
  // ============================================================================

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isStreaming) return;

    if (!token) {
      toast.error(t('toasts.loginToChat'));
      return;
    }

    setInputValue('');

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Use context's sendMessage which handles session creation
    await sendChatMessage(text, selectedMode.id, selectedModel.id);
  }, [inputValue, isStreaming, token, selectedMode.id, selectedModel.id, sendChatMessage]);

  const copyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast.error(t('toasts.failedToCopy'));
    }
  }, []);

  const regenerateResponse = useCallback(async () => {
    if (messages.length < 2 || isStreaming || !currentSessionId) return;

    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Regenerate using context
    await sendChatMessage(lastUserMessage.content, selectedMode.id, selectedModel.id);
  }, [messages, isStreaming, currentSessionId, selectedMode.id, selectedModel.id, sendChatMessage]);

  // ============================================================================
  // NODE MANIPULATION
  // ============================================================================

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType');
    const videoDataStr = e.dataTransfer.getData('videoData');

    if (!canvasRef.current || !canvasAreaRef.current) return;

    const canvasRect = canvasAreaRef.current.getBoundingClientRect();
    const x = (e.clientX - canvasRect.left - panOffset.x) / zoom;
    const y = (e.clientY - canvasRect.top - panOffset.y) / zoom;

    if (videoDataStr) {
      const videoData = JSON.parse(videoDataStr);

      // Check if dropped onto an existing video node (within ~200x160 node area)
      const existingVideoNode = nodes.find(n =>
        n.type === 'video' &&
        x >= n.x && x <= n.x + 200 &&
        y >= n.y && y <= n.y + 160
      );

      if (existingVideoNode) {
        // Update existing video node with new video data
        setNodes(prev => prev.map(n =>
          n.id === existingVideoNode.id ? { ...n, videoData } : n
        ));
        markDirty();
        toast.success(t('toasts.videoAttached', { id: existingVideoNode.id }));
      } else {
        // Create new video node
        const newNode: WorkflowNode = {
          id: nodeIdCounter,
          type: 'video',
          x,
          y,
          videoData,
        };
        setNodes(prev => [...prev, newNode]);
        setNodeIdCounter(prev => prev + 1);
      }
    } else if (nodeType && nodeTypes[nodeType]) {
      const newNode: WorkflowNode = {
        id: nodeIdCounter,
        type: nodeType,
        x,
        y,
      };
      setNodes(prev => [...prev, newNode]);
      setNodeIdCounter(prev => prev + 1);
    }
  }, [nodeIdCounter, panOffset, zoom, nodes]);

  // handleDragOver moved outside component for stable reference

  // ============================================================================
  // PAN & ZOOM (optimized with requestAnimationFrame)
  // ============================================================================

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Space+click or middle-mouse: always pan (even over nodes)
    if (spaceHeldRef.current || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // Don't start panning if clicking inside a workflow node
    if (target.closest('.workflow-node')) return;
    if (e.button === 0 && !draggingNode && !connectingFrom && target.closest('.canvas-area')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Connection drag preview
    if (connectingFrom && canvasAreaRef.current) {
      const rect = canvasAreaRef.current.getBoundingClientRect();
      setConnectingMouse({
        x: (e.clientX - rect.left - panOffset.x) / zoom,
        y: (e.clientY - rect.top - panOffset.y) / zoom,
      });
      return;
    }

    if (!isPanning && !draggingNode) return;

    // Use rAF for smooth 120hz rendering
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (isPanning) {
        setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      } else if (draggingNode && canvasAreaRef.current) {
        isDraggingRef.current = true;
        const canvasRect = canvasAreaRef.current.getBoundingClientRect();
        const x = (e.clientX - canvasRect.left - panOffset.x) / zoom - draggingNode.offsetX;
        const y = (e.clientY - canvasRect.top - panOffset.y) / zoom - draggingNode.offsetY;
        setNodes(prev => prev.map(n => n.id === draggingNode.id ? { ...n, x, y } : n));
      }
    });
  }, [isPanning, draggingNode, panStart, panOffset, zoom, connectingFrom]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(rafRef.current);

    // Finish connection drag
    if (connectingFrom && canvasAreaRef.current) {
      // Check if mouse is over an input port
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panOffset.x) / zoom;
      const mouseY = (e.clientY - rect.top - panOffset.y) / zoom;

      for (const node of nodes) {
        if (node.id === connectingFrom.nodeId) continue;
        const nodeDef = nodeTypes[node.type];
        if (!nodeDef?.hasInput) continue;

        // Input port is at left edge, center height
        const portX = node.x;
        const portY = node.y + 60;
        const dist = Math.sqrt((mouseX - portX) ** 2 + (mouseY - portY) ** 2);

        if (dist < 30 && canConnect(connectingFrom.nodeId, node.id)) {
          setConnections(prev => [...prev, { from: connectingFrom.nodeId, to: node.id }]);
          markDirty();
          break;
        }
      }

      setConnectingFrom(null);
      setConnectingMouse(null);
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      markDirty();
    }
    setIsPanning(false);
    setDraggingNode(null);
  }, [connectingFrom, panOffset, zoom, nodes, markDirty]);

  // Canvas wheel handler: Ctrl+scroll = zoom, scroll = pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Walk up from target to find any scrollable element inside a node
    let current = e.target as HTMLElement | null;
    const canvasEl = canvasAreaRef.current;
    while (current && current !== canvasEl) {
      const style = window.getComputedStyle(current);
      const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll')
        && current.scrollHeight > current.clientHeight;
      if (isScrollable) return; // let browser handle native scroll inside node
      current = current.parentElement;
    }
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+scroll = zoom (centered on mouse position)
      const rect = canvasAreaRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(prev => {
          const newZoom = Math.min(2, Math.max(0.3, +(prev + delta).toFixed(2)));
          const scale = newZoom / prev;
          // Adjust pan so zoom centers on mouse
          setPanOffset(p => ({
            x: mouseX - scale * (mouseX - p.x),
            y: mouseY - scale * (mouseY - p.y),
          }));
          return newZoom;
        });
      }
    } else {
      // Regular scroll = pan canvas
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  // Estimate credit cost for current workflow (memoized)
  const estimatedCost = useMemo(() => nodes.reduce((total, node) => {
    const costs = NODE_MODEL_COSTS[node.type];
    if (!costs) return total;
    const model = node.config?.model || 'gemini';
    return total + (costs[model] ?? 0);
  }, 0), [nodes]);

  const runWorkflow = async () => {
    if (!token) {
      toast.error(t('toasts.loginToRun'));
      return;
    }

    if (nodes.length === 0) {
      toast.error(t('toasts.addNodesFirst'));
      return;
    }

    if (connections.length === 0) {
      toast.error(t('toasts.connectNodes'));
      return;
    }

    // Check if user has enough credits
    if (credits && credits.remaining < estimatedCost) {
      toast.error(t('toasts.notEnoughCredits', { need: estimatedCost, have: credits.remaining }));
      return;
    }

    setIsRunning(true);
    setActiveConnections(new Set());
    setProcessedNodes(new Set());

    try {
      const animateConnections = async () => {
        for (const connection of connections) {
          setActiveConnections(prev => new Set(prev).add(`${connection.from}-${connection.to}`));
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      };

      const animationPromise = animateConnections();

      const workflowData = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          x: n.x,
          y: n.y,
          config: n.config || undefined,
          videoData: n.videoData ? {
            id: n.videoData.id,
            platform: n.videoData.platform,
            author: n.videoData.author,
            desc: n.videoData.desc,
            views: n.videoData.views,
            uts: n.videoData.uts,
            thumb: n.videoData.thumb,
            url: n.videoData.url,
            localPath: n.videoData.localPath,
          } : undefined,
        })),
        connections: connections.map(c => ({ from: c.from, to: c.to })),
        workflow_id: currentWorkflow?.id,
        workflow_name: workflowName,
        language: i18n.language === 'ru' ? 'Russian' : 'English',
        ...(activeProject?.id && { project_id: activeProject.id }),
      };

      const result = await apiService.executeWorkflow(workflowData);

      await animationPromise;

      // Reload history after run
      loadRunHistory();

      if (result.success) {
        const processedSet = new Set<number>();
        setNodes(prev => prev.map(node => {
          const nodeResult = result.results.find((r: any) => r.node_id === node.id);
          if (nodeResult && nodeResult.success) {
            processedSet.add(node.id);
            return { ...node, outputContent: nodeResult.content };
          }
          return node;
        }));
        setProcessedNodes(processedSet);

        // Store results and show fullscreen results view
        setLastRunResults({
          results: result.results || [],
          final_script: result.final_script,
          storyboard: result.storyboard,
          credits_used: result.credits_used,
          execution_time_ms: result.execution_time_ms,
        });
        setResultsActiveTab(result.final_script ? 'script' : result.storyboard ? 'storyboard' : 'all');
        setShowResultsView(true);

        const creditsMsg = result.credits_used ? t('toasts.creditsUsedSuffix', { count: result.credits_used }) : '';
        toast.success(t('toasts.workflowCompleted', { credits: creditsMsg }));

        // Auto-save workflow after successful run
        try {
          const graphData = {
            nodes: nodes.map(n => {
              const nodeResult = result.results.find((r: any) => r.node_id === n.id);
              return { ...n, outputContent: nodeResult?.success ? nodeResult.content : n.outputContent };
            }),
            connections,
          };
          const canvasState = { zoom, panX: panOffset.x, panY: panOffset.y };
          await saveWorkflow({
            name: workflowName,
            graph_data: graphData,
            canvas_state: canvasState,
          });
        } catch (saveErr) {
          console.error('Auto-save after run failed:', saveErr);
        }
      } else {
        // Store error results too
        setLastRunResults({
          results: result.results || [],
          error: result.error,
          credits_used: result.credits_used,
          execution_time_ms: result.execution_time_ms,
        });
        setShowResultsView(true);
        toast.error(result.error || t('toasts.failedExecute'));
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast.error(t('toasts.failedExecute'));
    } finally {
      setIsRunning(false);
      setTimeout(() => {
        setActiveConnections(new Set());
        setProcessedNodes(new Set());
      }, 2000);
    }
  };

  // ============================================================================
  // RENDER NODES & CONNECTIONS
  // ============================================================================

  // Connection validation
  const canConnect = useCallback((fromId: number, toId: number): boolean => {
    if (fromId === toId) return false;
    if (connections.some(c => c.from === fromId && c.to === toId)) return false;
    const fromNode = nodes.find(n => n.id === fromId);
    if (!fromNode || !nodeTypes[fromNode.type]?.hasOutput) return false;
    const toNode = nodes.find(n => n.id === toId);
    if (!toNode || !nodeTypes[toNode.type]?.hasInput) return false;
    return true;
  }, [connections, nodes]);

  // Memoized connection paths for performance
  const connectionPaths = useMemo(() => {
    return connections.map(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return null;
      const startX = fromNode.x + 176;
      const startY = fromNode.y + 60;
      const endX = toNode.x;
      const endY = toNode.y + 60;
      const dx = Math.abs(endX - startX) * 0.5;
      return {
        conn,
        startX, startY, endX, endY,
        pathD: `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`,
        midX: (startX + endX) / 2,
        midY: (startY + endY) / 2,
        key: `${conn.from}-${conn.to}`,
      };
    }).filter(Boolean) as Array<{
      conn: Connection; startX: number; startY: number; endX: number; endY: number;
      pathD: string; midX: number; midY: number; key: string;
    }>;
  }, [connections, nodes]);

  const renderConnections = useCallback(() => {
    return connectionPaths.map(({ conn, pathD, midX, midY, key }) => {
      const isActive = activeConnections.has(key);
      const isSelected = selectedConnection === key;

      return (
        <g key={key}>
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            className="cursor-pointer pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedConnection(isSelected ? null : key);
              setSelectedNode(null);
            }}
          />
          <path
            d={pathD}
            fill="none"
            stroke={isSelected ? '#ef4444' : isActive ? '#3b82f6' : 'hsl(var(--border))'}
            strokeWidth={isSelected ? 3 : isActive ? 3 : 2}
            strokeDasharray={isSelected ? '8 4' : undefined}
            className={isActive ? "animate-pulse" : undefined}
          />
          {isActive && (
            <circle r="4" fill="#3b82f6" className="animate-pulse">
              <animateMotion dur="1s" repeatCount="indefinite" path={pathD} />
            </circle>
          )}
          {isSelected && (
            <foreignObject x={midX - 12} y={midY - 12} width={24} height={24} className="pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConnections(prev => prev.filter(c => !(c.from === conn.from && c.to === conn.to)));
                  setSelectedConnection(null);
                  markDirty();
                }}
                className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
              >
                <X className="h-3 w-3" />
              </button>
            </foreignObject>
          )}
        </g>
      );
    });
  }, [connectionPaths, activeConnections, selectedConnection, markDirty]);

  // Live connection preview line during port drag (GPU-accelerated)
  const renderConnectingLine = useCallback(() => {
    if (!connectingFrom || !connectingMouse) return null;
    const sx = connectingFrom.x;
    const sy = connectingFrom.y;
    const ex = connectingMouse.x;
    const ey = connectingMouse.y;
    const dx = Math.abs(ex - sx) * 0.5;
    const pathD = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`;
    return (
      <g style={{ willChange: 'contents' }}>
        {/* Glow effect */}
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={6}
          opacity={0.2}
          strokeLinecap="round"
        />
        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeDasharray="8 4"
          opacity={0.9}
          strokeLinecap="round"
        />
        {/* End indicator circle */}
        <circle
          cx={ex}
          cy={ey}
          r={6}
          fill="#3b82f6"
          opacity={0.6}
        />
      </g>
    );
  }, [connectingFrom, connectingMouse]);

  const renderNode = (node: WorkflowNode) => {
    const nodeDef = nodeTypes[node.type];
    if (!nodeDef) return null;
    const isProcessed = processedNodes.has(node.id);
    const isNodeRunning = isRunning && !isProcessed && !node.outputContent;
    const isBeingDragged = draggingNode?.id === node.id;
    const isSelected = selectedNode === node.id;

    return (
      <div
        key={node.id}
        className={cn(
          "workflow-node absolute w-44 bg-card border-2 rounded-xl shadow-lg select-none",
          // No transition during drag for instant response
          !isBeingDragged && "transition-shadow duration-150",
          isBeingDragged && "shadow-2xl z-50",
          isNodeRunning && "border-yellow-500 shadow-yellow-500/20 animate-pulse",
          isProcessed && "border-green-500 shadow-green-500/20",
          !isNodeRunning && !isProcessed && isSelected && "border-blue-500 shadow-blue-500/20",
          !isNodeRunning && !isProcessed && !isSelected && "border-border hover:border-border/80"
        )}
        style={{
          // GPU-accelerated transform instead of left/top
          transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
          willChange: isBeingDragged ? 'transform' : 'auto',
          cursor: isBeingDragged ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('.port-handle') || (e.target as HTMLElement).closest('button')) return;
          e.stopPropagation();
          setSelectedNode(node.id);
          setSelectedConnection(null);
          setDraggingNode({
            id: node.id,
            offsetX: (e.clientX - canvasAreaRef.current!.getBoundingClientRect().left - panOffset.x) / zoom - node.x,
            offsetY: (e.clientY - canvasAreaRef.current!.getBoundingClientRect().top - panOffset.y) / zoom - node.y,
          });
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.port-handle')) return;
          e.stopPropagation();
          setSelectedNode(node.id);
          setSelectedConnection(null);
          setConfigNode(node);
        }}
      >
        <div className={cn("px-3 py-2 rounded-t-[10px] bg-gradient-to-r", nodeDef.color)}>
          <div className="flex items-center gap-2">
            {isNodeRunning ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : nodeDef.icon}
            <span className="text-sm font-medium text-white truncate">{nodeDef.title}</span>
            {isProcessed && <Check className="h-3 w-3 text-white" />}
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfigNode(node);
                }}
              >
                <Settings2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setNodes(prev => prev.filter(n => n.id !== node.id));
                  setConnections(prev => prev.filter(c => c.from !== node.id && c.to !== node.id));
                  if (configNode?.id === node.id) setConfigNode(null);
                  markDirty();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3">
          {node.videoData ? (
            <div className="space-y-2">
              <div className="w-full h-20 bg-secondary rounded-lg overflow-hidden relative">
                {node.videoData.thumb ? (
                  <img src={node.videoData.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Badge className="absolute top-1 left-1 bg-primary/80 text-primary-foreground border-0 text-xs px-1.5 py-0.5">
                  {node.videoData.uts}
                </Badge>
                <Badge className="absolute top-1 right-1 bg-black/60 text-white border-0 text-xs px-1.5 py-0.5">
                  {platformIcons[node.videoData.platform]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{node.videoData.desc}</p>
            </div>
          ) : node.outputContent ? (
            <div className="bg-secondary rounded-lg p-2 text-xs text-muted-foreground max-h-[80px] overflow-y-auto whitespace-pre-wrap cursor-pointer hover:bg-secondary/80"
              onClick={(e) => { e.stopPropagation(); setConfigNode(node); }}
            >
              {node.outputContent.substring(0, 200)}{node.outputContent.length > 200 ? '...' : ''}
            </div>
          ) : node.config?.customPrompt || node.config?.model ? (
            <div className="text-xs text-muted-foreground space-y-1">
              {node.config?.customPrompt && (
                <div className="flex justify-between">
                  <span>{t('nodeConfig.prompt')}</span>
                  <span className="font-medium text-muted-foreground">{t('nodeConfig.custom')}</span>
                </div>
              )}
              {node.config?.model && (
                <div className="flex justify-between">
                  <span>{t('nodeConfig.model')}</span>
                  <span className="font-medium text-foreground">{node.config.model}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('nodeConfig.ready')}</span>
            </div>
          )}
        </div>

        {/* Connection ports - larger, GPU-accelerated hover */}
        <div className="flex justify-between px-3 pb-2">
          {nodeDef.hasInput ? (
            <div
              className="port-handle w-4 h-4 bg-border border-2 border-card rounded-full -ml-5 cursor-crosshair hover:bg-blue-500 hover:border-blue-300"
              style={{ transition: 'background-color 100ms, border-color 100ms, transform 100ms', transform: 'scale(1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title={t('canvas.input')}
            />
          ) : <div />}
          {nodeDef.hasOutput ? (
            <div
              className={cn(
                "port-handle w-4 h-4 bg-border border-2 border-card rounded-full -mr-5 cursor-crosshair hover:bg-blue-500 hover:border-blue-300",
                connectingFrom?.nodeId === node.id && "bg-blue-500 border-blue-300"
              )}
              style={{ transition: 'background-color 100ms, border-color 100ms, transform 100ms', transform: connectingFrom?.nodeId === node.id ? 'scale(1.5)' : 'scale(1)' }}
              onMouseEnter={(e) => { if (!connectingFrom) e.currentTarget.style.transform = 'scale(1.5)'; }}
              onMouseLeave={(e) => { if (!connectingFrom) e.currentTarget.style.transform = 'scale(1)'; }}
              title={t('canvas.dragToConnect')}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setConnectingFrom({
                  nodeId: node.id,
                  x: node.x + 176,
                  y: node.y + 60,
                });
              }}
            />
          ) : <div />}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const filteredVideos = useMemo(() => platformFilter === 'All'
    ? savedVideos
    : savedVideos.filter(v => v.platform === platformFilter),
    [savedVideos, platformFilter]);

  // ModeIcon unused — mode selection is done via pills in header

  return (
    <DevAccessGate>
      <div className="flex h-full bg-background">
        {/* Left: Icon Rail + Expandable Panel */}
        <div className="flex flex-shrink-0 h-full">
          {/* Icon Rail - clean outlined icons */}
          <div className="w-[52px] bg-card/80 border-r border-border flex flex-col items-center py-3 flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              {[
                { id: 'nodes' as const, icon: Component, label: t('sidebar.nodesTab') },
                { id: 'saved' as const, icon: Heart, label: t('sidebar.savedTab') },
                { id: 'history' as const, icon: RotateCcw, label: t('sidebar.historyTab') },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = openPanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setOpenPanel(isActive ? null : item.id)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-blue-500/15 text-blue-500"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
            {/* Separator */}
            <div className="w-6 h-px bg-border my-2" />
            {/* Chat icon */}
            <button
              onClick={() => setOpenPanel(openPanel === 'chat' ? null : 'chat')}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                openPanel === 'chat'
                  ? "bg-blue-500/15 text-blue-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={t('sidebar.aiChat')}
            >
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Expandable Panel */}
          {openPanel && (
            <div className={cn(
              "bg-card border-r border-border flex flex-col animate-in slide-in-from-left-2 duration-200",
              openPanel === 'chat' ? "w-[340px]" : "w-[260px]"
            )}>
              <div className="flex items-center justify-between px-3.5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  {openPanel === 'chat' && <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                  <span className="text-[13px] font-semibold text-foreground capitalize">
                    {openPanel === 'chat' ? t('sidebar.aiAssistant') : openPanel === 'nodes' ? t('sidebar.nodesTab') : openPanel === 'saved' ? t('sidebar.savedTab') : t('sidebar.historyTab')}
                  </span>
                  {openPanel === 'chat' && credits && (
                    <Badge variant="outline" className="text-xs h-5 border-border text-muted-foreground">
                      {credits.remaining} cr
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {openPanel === 'chat' && (
                    <button
                      onClick={() => createSession()}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title={t('sidebar.newChat')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpenPanel(null)}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {openPanel === 'saved' && (
                <div className="flex gap-1 bg-secondary rounded-lg p-0.5 mx-2.5 mt-2.5">
                  {(['workflows', 'videos'] as const).map(tab => (
                    <button
                      key={tab}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                        savedTab === tab
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setSavedTab(tab)}
                    >
                      {t(`sidebar.${tab}`)}
                    </button>
                  ))}
                </div>
              )}

              {openPanel === 'history' && (
                <div className="flex gap-1 bg-secondary rounded-lg p-0.5 mx-2.5 mt-2.5">
                  {(['runs', 'chats'] as const).map(tab => (
                    <button
                      key={tab}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                        historyTab === tab
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setHistoryTab(tab)}
                    >
                      {t(`sidebar.${tab}`)}
                    </button>
                  ))}
                </div>
              )}

              {openPanel !== 'chat' && <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-2.5">
                  {openPanel === 'nodes' && (
                    <div className="space-y-3">
                      {/* Templates */}
                      {TEMPLATES.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm uppercase text-muted-foreground tracking-wider font-semibold">{t('sidebar.quickStart')}</span>
                          </div>
                          <div className="space-y-1">
                            {TEMPLATES.map((tpl, idx) => {
                              const tplIcons = [Zap, PenTool, Sparkles];
                              const TplIcon = tplIcons[idx % 3];
                              return (
                                <button
                                  key={tpl.id}
                                  onClick={() => handleUseTemplate(tpl.id)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg border border-border hover:border-border/80 bg-secondary/40 hover:bg-secondary/70 transition-all duration-200 text-left group"
                                >
                                  <div className="w-5 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                    <TplIcon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold leading-tight text-foreground/90 group-hover:text-foreground transition-colors">{tpl.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-xs text-muted-foreground">{t('sidebar.nodesCount', { count: tpl.node_count })}</span>
                                      <span className="text-xs text-muted-foreground/50">·</span>
                                      <span className="text-xs text-muted-foreground">{t('sidebar.creditsEstimate', { credits: tpl.estimated_credits })}</span>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      {TEMPLATES.length > 0 && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center px-2"><div className="w-full border-t border-border/50" /></div>
                          <div className="relative flex justify-center">
                            <span className="bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground/60">{t('sidebar.dragToCanvas')}</span>
                          </div>
                        </div>
                      )}

                      {/* Node groups */}
                      {[
                        { title: t('sidebar.nodeGroupInput'), types: ['video', 'brand'] },
                        { title: t('sidebar.nodeGroupProcess'), types: ['analyze', 'extract', 'style'] },
                        { title: t('sidebar.nodeGroupAI'), types: ['generate', 'refine'] },
                        { title: t('sidebar.nodeGroupOutput'), types: ['script', 'storyboard'] },
                      ].map(group => (
                        <div key={group.title}>
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{group.title}</span>
                          </div>
                          <div className="space-y-0.5">
                            {group.types.map(type => (
                              <div
                                key={type}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('nodeType', type);
                                  e.dataTransfer.effectAllowed = 'copy';
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-grab border border-transparent hover:border-border hover:bg-secondary/60 transition-all duration-150 group active:scale-[0.98] active:opacity-80"
                              >
                                <div className="w-5 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                  {nodeTypes[type].icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium leading-tight">{nodeTypes[type].title}</div>
                                  <div className="text-xs text-muted-foreground/70 leading-tight">{nodeTypes[type].description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {openPanel === 'saved' && (
                    <div className="space-y-3">
                      {savedTab === 'workflows' ? (
                        /* Saved Workflows List */
                        <div className="space-y-1.5">
                          {workflows.length === 0 ? (
                            <div className="text-center py-8">
                              <Wand2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">{t('sidebar.noSavedWorkflows')}</p>
                              <p className="text-xs text-muted-foreground mt-1">{t('sidebar.saveFirstWorkflow')}</p>
                            </div>
                          ) : (
                            workflows.map(wf => (
                              <div
                                key={wf.id}
                                onClick={() => handleLoadWorkflow(wf.id)}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                  currentWorkflow?.id === wf.id
                                    ? "border-blue-500/50 bg-blue-500/10"
                                    : "border-border bg-secondary/30 hover:border-border/80"
                                )}
                              >
                                <div className="w-5 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                  <Wand2 className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{wf.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {t('sidebar.nodesCount', { count: wf.node_count })} · {wf.status}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteWf(wf.id); }}
                                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        /* Saved Videos List */
                        <>
                          <div className="flex flex-wrap gap-1">
                            {['All', 'TikTok', 'Instagram', 'YouTube'].map(platform => (
                              <button
                                key={platform}
                                className={cn(
                                  "px-2.5 py-1 text-xs rounded-full border transition-colors",
                                  platformFilter === platform
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary/50 text-muted-foreground border-border hover:border-border/80"
                                )}
                                onClick={() => setPlatformFilter(platform)}
                              >
                                {platform === 'All' ? t('sidebar.all') : platform}
                              </button>
                            ))}
                          </div>

                          {loadingSaved ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : filteredVideos.length === 0 ? (
                            <div className="text-center py-8">
                              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">{t('sidebar.noSavedVideos')}</p>
                              <p className="text-xs text-muted-foreground mt-1">{t('sidebar.saveFromTrends')}</p>
                            </div>
                          ) : (
                            filteredVideos.map(video => (
                              <div
                                key={video.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('videoData', JSON.stringify(video))}
                                className="group flex gap-2 p-2 bg-secondary/50 border border-border rounded-lg cursor-grab hover:border-blue-500 transition-all relative"
                              >
                                <div className="w-12 h-16 bg-secondary rounded overflow-hidden flex-shrink-0 relative">
                                  {video.thumb ? (
                                    <img src={video.thumb} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <Badge className="bg-primary/80 text-primary-foreground border-0 text-[11px] px-1.5 py-0">
                                      {video.uts}
                                    </Badge>
                                    <span className="text-xs font-medium truncate">@{video.author}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2">{video.desc}</p>
                                </div>
                                {/* Delete button */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    try {
                                      await apiService.removeFavorite(video.id);
                                      removeSavedVideo(video.id);
                                      toast.success(t('toasts.videoRemoved'));
                                    } catch {
                                      toast.error(t('toasts.failedRemoveVideo'));
                                    }
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded-md bg-red-500/0 text-transparent group-hover:bg-red-500/10 group-hover:text-red-400 hover:!bg-red-500/20 transition-all"
                                  title={t('sidebar.removeVideo')}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {openPanel === 'history' && (
                    <div className="space-y-3">
                      {historyTab === 'runs' && (
                      <>
                      {/* Header with refresh */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase text-muted-foreground tracking-wide font-medium">{t('sidebar.runHistory')}</div>
                        <button
                          onClick={loadRunHistory}
                          disabled={loadingHistory}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RefreshCw className={cn("h-3 w-3", loadingHistory && "animate-spin")} />
                        </button>
                      </div>

                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : runHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-muted-foreground">{t('sidebar.noWorkflowRuns')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t('sidebar.runWorkflowHint')}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {runHistory.map(run => {
                            const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
                              completed: { bg: 'bg-green-500/10', text: 'text-green-500', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                              failed: { bg: 'bg-red-500/10', text: 'text-red-500', icon: <XCircle className="h-3.5 w-3.5" /> },
                              running: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
                              cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', icon: <X className="h-3.5 w-3.5" /> },
                            };
                            const statusStyle = statusColors[run.status] || statusColors.completed;

                            // Format time ago
                            const runDate = new Date(run.started_at);
                            const now = new Date();
                            const diffMs = now.getTime() - runDate.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);
                            let timeAgo = t('history.justNow');
                            if (diffMins > 0 && diffMins < 60) timeAgo = t('history.minutesAgo', { count: diffMins });
                            else if (diffHours > 0 && diffHours < 24) timeAgo = t('history.hoursAgo', { count: diffHours });
                            else if (diffDays > 0) timeAgo = t('history.daysAgo', { count: diffDays });

                            return (
                              <div
                                key={run.id}
                                onClick={() => handleLoadRunOnCanvas(run)}
                                className={cn(
                                  "group/run flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                  selectedRun?.id === run.id
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-border bg-secondary/50 hover:border-border/80"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                  run.is_pinned ? "bg-blue-500/10 text-blue-500" : statusStyle.bg + " " + statusStyle.text
                                )}>
                                  {run.is_pinned ? <Pin className="h-4 w-4" /> : statusStyle.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {renamingRunId === run.id ? (
                                    <input
                                      autoFocus
                                      value={renameRunValue}
                                      onChange={(e) => setRenameRunValue(e.target.value)}
                                      onBlur={() => {
                                        if (renameRunValue.trim() && renameRunValue !== run.workflow_name) {
                                          renameRun(run.id, renameRunValue.trim());
                                        }
                                        setRenamingRunId(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          if (renameRunValue.trim() && renameRunValue !== run.workflow_name) {
                                            renameRun(run.id, renameRunValue.trim());
                                          }
                                          setRenamingRunId(null);
                                        } else if (e.key === 'Escape') {
                                          setRenamingRunId(null);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full text-xs font-medium bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-medium truncate">{run.workflow_name}</span>
                                      {run.run_number > 1 && (
                                        <span className="text-[11px] text-muted-foreground">#{run.run_number}</span>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" />
                                      {timeAgo}
                                    </span>
                                    <span>·</span>
                                    <span>{t('sidebar.nodesCount', { count: run.node_count })}</span>
                                    {run.credits_used > 0 && (
                                      <>
                                        <span>·</span>
                                        <span className="text-muted-foreground">{t('sidebar.creditsEstimate', { credits: run.credits_used })}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="p-1 rounded opacity-0 group-hover/run:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 hover:bg-secondary text-muted-foreground transition-all">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" side="bottom" className="w-44">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        pinRun(run.id, !run.is_pinned);
                                      }}
                                    >
                                      <Pin className="h-4 w-4" />
                                      {run.is_pinned
                                        ? (i18n.language === 'ru' ? 'Открепить' : 'Unpin')
                                        : (i18n.language === 'ru' ? 'Закрепить' : 'Pin')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenamingRunId(run.id);
                                        setRenameRunValue(run.workflow_name);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      {i18n.language === 'ru' ? 'Переименовать' : 'Rename'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteRunConfirmId(run.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      {i18n.language === 'ru' ? 'Удалить' : 'Delete'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected Run — loaded on canvas indicator */}
                      {selectedRun && selectedRunDetail && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-400">{t('sidebar.loadedOnCanvas')}</span>
                            <button
                              onClick={() => { setSelectedRun(null); setSelectedRunDetail(null); }}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className={cn(
                              "font-medium capitalize",
                              selectedRunDetail.status === 'completed' && "text-green-500",
                              selectedRunDetail.status === 'failed' && "text-red-500"
                            )}>
                              {selectedRunDetail.status}
                            </span>
                            <span>{selectedRunDetail.node_count} {t('sidebar.nodesLabel')}</span>
                            {selectedRunDetail.execution_time_ms && (
                              <span>{(selectedRunDetail.execution_time_ms / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                          {!showResultsView && (
                            <Button
                              size="sm"
                              onClick={() => setShowResultsView(true)}
                              className="w-full h-7 text-xs bg-blue-500 hover:bg-blue-600"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {t('sidebar.viewFullResults')}
                            </Button>
                          )}
                        </div>
                      )}

                      </>
                      )}

                      {historyTab === 'chats' && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-xs uppercase text-muted-foreground tracking-wide font-medium">{t('sidebar.chatHistory')}</div>
                          <button
                            onClick={() => { createSession(); setOpenPanel('chat'); }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title={t('sidebar.newChat')}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {chatSessions.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">{t('sidebar.noChatSessions')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('sidebar.startChatHint')}</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {[...chatSessions].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map(session => {
                              const isActive = currentSessionId === session.session_id;
                              const sessionDate = new Date(session.updated_at || session.created_at);
                              const now = new Date();
                              const diffMs = now.getTime() - sessionDate.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);
                              let timeAgo = t('history.justNow');
                              if (diffMins > 0 && diffMins < 60) timeAgo = t('history.minutesAgo', { count: diffMins });
                              else if (diffHours > 0 && diffHours < 24) timeAgo = t('history.hoursAgo', { count: diffHours });
                              else if (diffDays > 0) timeAgo = t('history.daysAgo', { count: diffDays });

                              return (
                                <div
                                  key={session.session_id}
                                  onClick={() => { selectSession(session.session_id); setOpenPanel('chat'); }}
                                  className={cn(
                                    "group/session flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                    isActive
                                      ? "border-blue-500/50 bg-blue-500/10"
                                      : "border-border bg-secondary/30 hover:border-border/80"
                                  )}
                                >
                                  <div className="w-5 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                    {session.is_pinned ? <Pin className="h-3.5 w-3.5 text-blue-400" /> : <MessageSquare className="h-3.5 w-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {renamingSessionId === session.session_id ? (
                                      <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onBlur={() => {
                                          if (renameValue.trim() && renameValue.trim() !== session.title) {
                                            renameChatSession(session.session_id, renameValue.trim());
                                          }
                                          setRenamingSessionId(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            if (renameValue.trim() && renameValue.trim() !== session.title) {
                                              renameChatSession(session.session_id, renameValue.trim());
                                            }
                                            setRenamingSessionId(null);
                                          } else if (e.key === 'Escape') {
                                            setRenamingSessionId(null);
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full text-xs font-medium bg-background border border-blue-500/50 rounded px-1.5 py-0.5 outline-none"
                                      />
                                    ) : (
                                      <div className="text-xs font-medium line-clamp-2 break-words">
                                        {session.title || t('sidebar.untitledChat')}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <span>{t('sidebar.msgsCount', { count: session.message_count })}</span>
                                      <span>·</span>
                                      <span>{timeAgo}</span>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className="p-1 rounded opacity-0 group-hover/session:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 hover:bg-secondary text-muted-foreground transition-all">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" side="bottom" className="w-40">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          pinChatSession(session.session_id, !session.is_pinned);
                                        }}
                                      >
                                        <Pin className="h-4 w-4" />
                                        {session.is_pinned
                                          ? (i18n.language === 'ru' ? 'Открепить' : 'Unpin')
                                          : (i18n.language === 'ru' ? 'Закрепить' : 'Pin')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenameValue(session.title || '');
                                          setRenamingSessionId(session.session_id);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        {i18n.language === 'ru' ? 'Переименовать' : 'Rename'}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmId(session.session_id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        {i18n.language === 'ru' ? 'Удалить' : 'Delete'}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                      )}
                    </div>
                  )}
                </div>
              </div>}

              {/* Chat Panel Content */}
              {openPanel === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Mode Pills */}
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border overflow-x-auto scrollbar-none">
                    {contentModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setSelectedMode(mode)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                            selectedMode.id === mode.id
                              ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {mode.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Messages Area — native overflow instead of Radix ScrollArea to fix width constraint */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="p-3 space-y-2 max-w-full">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                            <Sparkles className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <h3 className="text-sm font-medium text-foreground/70">{t('chat.whatCanIHelp')}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{t('chat.chatSubtitle')}</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id} className="w-full">
                            {message.role === 'user' ? (
                              <div className="flex flex-col items-end mb-2">
                                <div className="max-w-[85%] flex items-end gap-1.5">
                                  <div className="bg-blue-500/15 text-foreground rounded-2xl rounded-br-sm px-3 py-2">
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                  </div>
                                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                    <User className="h-2.5 w-2.5 text-muted-foreground" />
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground/50 mr-7 mt-0.5">
                                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-start mb-2">
                                <div className="max-w-[90%] flex items-start gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                                    <Bot className="h-2.5 w-2.5 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className="bg-secondary/60 border border-border rounded-2xl rounded-tl-sm px-3 py-2"
                                      onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.tagName === 'IMG') {
                                          setLightboxImage((target as HTMLImageElement).src);
                                          setLightboxZoom(1);
                                        }
                                      }}
                                    >
                                      <div className="text-sm text-foreground [&>*]:break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_img]:cursor-pointer">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                                          {message.content}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 mt-0.5 ml-1">
                                      <span className="text-[10px] text-muted-foreground/50 mr-1">
                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <button onClick={() => copyMessage(message.content, message.id)} className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-muted-foreground" title={t('chat.copy')}>
                                        {copiedMessageId === message.id ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                                      </button>
                                      {message === messages[messages.length - 1] && (
                                        <button onClick={regenerateResponse} disabled={isStreaming} className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-50" title={t('chat.regenerate')}>
                                          <RefreshCw className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                      {extractImageUrls(message.content).map((imgUrl, idx) => {
                                        const imgSrc = resolveImgSrc(imgUrl);
                                        return (
                                          <div key={idx} className="flex items-center gap-0.5">
                                            <button onClick={() => { setLightboxImage(imgSrc); setLightboxZoom(1); }} className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-muted-foreground" title={t('chat.fullSize')}>
                                              <ZoomIn className="h-2.5 w-2.5" />
                                            </button>
                                            <button onClick={() => handleDownloadImage(imgSrc)} className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-muted-foreground" title={t('chat.downloadImage')}>
                                              <Download className="h-2.5 w-2.5" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {isStreaming && (
                        <div className="flex gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <Bot className="h-2.5 w-2.5 text-muted-foreground" />
                          </div>
                          <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-3 py-2">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="p-2.5 border-t border-border">
                    <div className="relative">
                      <div className="bg-secondary/50 border border-border rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                        <textarea
                          ref={inputRef}
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder={t('chat.askMeTo', { action: selectedMode.description.toLowerCase() })}
                          className="w-full p-2.5 pb-10 bg-transparent resize-none focus:outline-none text-sm placeholder:text-muted-foreground/50 text-foreground min-h-[44px] max-h-[100px]"
                          rows={1}
                          disabled={isStreaming}
                        />
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-1">
                          <div className="relative">
                            <button
                              onClick={() => setShowModelMenu(!showModelMenu)}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                              <selectedModel.icon />
                              <span>{selectedModel.name}</span>
                              <span className="text-[11px] text-muted-foreground/50">
                                {credits?.model_costs?.[selectedModel.id] ?? selectedModel.creditCost}cr
                              </span>
                              <ChevronDown className="h-2.5 w-2.5" />
                            </button>
                            {showModelMenu && (
                              <div className="absolute bottom-full left-0 mb-2 w-60 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50">
                                <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('chat.modelLabel')}</div>
                                {aiModels.map((model) => {
                                  const IconComponent = model.icon;
                                  const cost = credits?.model_costs?.[model.id] ?? model.creditCost;
                                  return (
                                    <button
                                      key={model.id}
                                      onClick={() => { if (model.available) { setSelectedModel(model); setShowModelMenu(false); }}}
                                      disabled={!model.available}
                                      className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors",
                                        !model.available ? "opacity-40 cursor-not-allowed" : "hover:bg-secondary cursor-pointer"
                                      )}
                                    >
                                      <IconComponent />
                                      <div className="flex-1 text-left">
                                        <div className="text-xs font-medium text-foreground">{model.name}</div>
                                        <div className="text-[11px] text-muted-foreground">{model.description}</div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-muted-foreground">{cost}cr</span>
                                        {selectedModel.id === model.id && model.available && (
                                          <Check className="h-3 w-3 text-blue-400" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {isStreaming ? (
                            <Button
                              onClick={stopGeneration}
                              size="sm"
                              className="rounded-lg px-2.5 h-6 text-xs bg-red-500 hover:bg-red-600 text-white transition-all"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleSendMessage()}
                              disabled={!inputValue.trim()}
                              size="sm"
                              className={cn(
                                "rounded-lg px-2.5 h-6 text-xs transition-all",
                                inputValue.trim()
                                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                                  : "bg-secondary text-muted-foreground"
                              )}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main: Toolbar + Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Toolbar */}
          <div className="h-12 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-3 gap-2 flex-shrink-0 z-50">
            {/* Left: Back + Workflow Name */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.location.href = '/dashboard'}
                title={t('toolbar.backToDashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border" />
              {editingName ? (
                <input
                  autoFocus
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
                  className="bg-transparent text-sm font-medium outline-none border-b border-blue-500 w-48"
                />
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-sm font-medium hover:text-muted-foreground transition-colors truncate max-w-[200px]"
                >
                  {workflowName}
                </button>
              )}
              {isDirty && <span className="w-2 h-2 rounded-full bg-orange-500" title={t('toolbar.unsavedChanges')} />}
              {currentWorkflow && (
                <span className="text-xs text-muted-foreground">#{currentWorkflow.id}</span>
              )}
            </div>

            {/* Center: Zoom controls */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} title={t('toolbar.resetView')}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => { setNodes([]); setConnections([]); }}
                title={t('toolbar.clearCanvas')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border" />
              <Button onClick={handleSaveWorkflow} disabled={nodes.length === 0} variant="outline" size="sm" className="h-8">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {t('toolbar.save')}
              </Button>
              <Button onClick={handleNewWorkflow} variant="outline" size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t('toolbar.new')}
              </Button>
              <Button
                onClick={runWorkflow}
                disabled={isRunning || nodes.length === 0}
                size="sm"
                className={cn(
                  "h-8",
                  isRunning
                    ? "bg-muted-foreground"
                    : "bg-blue-500 hover:bg-blue-600"
                )}
              >
                {isRunning ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t('toolbar.running')}</>
                ) : (
                  <><Play className="h-3.5 w-3.5 mr-1.5" />{estimatedCost > 0 ? t('toolbar.runWithCost', { cost: estimatedCost }) : t('toolbar.run')}</>
                )}
              </Button>
            </div>
          </div>

          {/* Canvas Area */}
        <div
          ref={canvasAreaRef}
          className="flex-1 relative overflow-hidden bg-background canvas-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div
            ref={canvasRef}
            className={cn(
              "absolute w-[3000px] h-[3000px]",
              isPanning ? "cursor-grabbing" : "cursor-default"
            )}
            style={{
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange: isPanning || draggingNode ? 'transform' : 'auto',
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
              {renderConnections()}
              {renderConnectingLine()}
            </svg>

            {nodes.map(renderNode)}
          </div>

          {/* Empty state - always centered in viewport, outside canvas transform */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
                  <Wand2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('canvas.buildYourWorkflow')}</h3>
                <p className="text-muted-foreground text-sm max-w-xs mb-4">
                  {t('canvas.dragNodesHint')}
                </p>
                <Button onClick={handleNewWorkflow} variant="outline" size="sm" className="h-9 px-4">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t('toolbar.new')}
                </Button>
              </div>
            </div>
          )}

          {/* Node Config Panel */}
          {configNode && (
            <NodeConfigPanel
              node={configNode}
              onClose={() => setConfigNode(null)}
              onUpdate={handleNodeConfigUpdate}
              savedVideos={savedVideos}
              onAttachVideo={(nodeId, videoData) => {
                setNodes(prev => prev.map(n =>
                  n.id === nodeId ? { ...n, videoData } : n
                ));
                setConfigNode(prev => prev && prev.id === nodeId ? { ...prev, videoData } : prev);
                markDirty();
              }}
              onUploadVideo={async (nodeId, file) => {
                try {
                  const result = await apiService.uploadVideo(file);
                  const uploadedVideo: SavedVideo = {
                    id: Date.now(),
                    platform: 'Upload',
                    author: file.name.replace(/\.[^/.]+$/, ''),
                    desc: `${file.name} (${result.size_mb}MB)`,
                    views: '0',
                    uts: 0,
                    thumb: '',
                    localPath: result.local_path,
                  };
                  setNodes(prev => prev.map(n =>
                    n.id === nodeId ? { ...n, videoData: uploadedVideo } : n
                  ));
                  setConfigNode(prev => prev && prev.id === nodeId ? { ...prev, videoData: uploadedVideo } : prev);
                  markDirty();
                  toast.success(t('toasts.videoUploaded'));
                } catch (error: any) {
                  toast.error(error?.response?.data?.detail || t('nodeConfig.uploadFailed'));
                }
              }}
            />
          )}

        </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* FULLSCREEN RESULTS VIEW                                         */}
      {/* ================================================================ */}
      {showResultsView && lastRunResults && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
          {/* Results Header */}
          <div className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResultsView(false)}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('results.backToCanvas')}
                </Button>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    lastRunResults.error
                      ? "bg-red-500/20"
                      : "bg-secondary"
                  )}>
                    {lastRunResults.error ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Award className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">
                      {lastRunResults.error ? t('results.workflowFailed') : t('results.workflowResults')}
                    </h1>
                    <p className="text-xs text-muted-foreground">{workflowName}</p>
                  </div>
                </div>
              </div>

              {/* Stats Pills */}
              <div className="flex items-center gap-3">
                {lastRunResults.execution_time_ms && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Timer className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400">
                      {(lastRunResults.execution_time_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
                {lastRunResults.credits_used !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('results.creditsCount', { count: lastRunResults.credits_used })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-medium text-green-400">
                    {t('results.nodesCount', { success: lastRunResults.results.filter(r => r.success).length, total: lastRunResults.results.length })}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-6xl mx-auto px-6 flex gap-1">
              {[
                { id: 'all' as const, label: t('results.overview'), icon: Eye },
                ...(lastRunResults.final_script ? [{ id: 'script' as const, label: t('results.scriptTab'), icon: FileText }] : []),
                ...(lastRunResults.storyboard ? [{ id: 'storyboard' as const, label: t('results.storyboardTab'), icon: LayoutGrid }] : []),
                { id: 'nodes' as const, label: t('results.allNodes'), icon: Wand2 },
              ].map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setResultsActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                      resultsActiveTab === tab.id
                        ? "border-blue-500 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 py-8">
              {/* Error Banner */}
              {lastRunResults.error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-400">{t('results.executionError')}</p>
                    <p className="text-sm text-red-400/80 mt-1">{lastRunResults.error}</p>
                  </div>
                </div>
              )}

              {/* Overview Tab */}
              {resultsActiveTab === 'all' && (
                <div className="space-y-8">
                  {/* Quick Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-secondary flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{lastRunResults.results.filter(r => r.success).length}</p>
                      <p className="text-xs text-muted-foreground">{t('results.successfulNodes')}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-secondary flex items-center justify-center">
                        <Coins className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{lastRunResults.credits_used || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('results.creditsUsed')}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-secondary flex items-center justify-center">
                        <Timer className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">
                        {lastRunResults.execution_time_ms ? `${(lastRunResults.execution_time_ms / 1000).toFixed(1)}s` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('results.executionTime')}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-secondary flex items-center justify-center">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{lastRunResults.results.length}</p>
                      <p className="text-xs text-muted-foreground">{t('results.totalNodes')}</p>
                    </div>
                  </div>

                  {/* Script Preview (if exists) */}
                  {lastRunResults.final_script && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{t('results.generatedScript')}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(lastRunResults.final_script!);
                              setResultsCopied('script');
                              setTimeout(() => setResultsCopied(null), 2000);
                            }}
                            className="h-8"
                          >
                            {resultsCopied === 'script' ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                            {resultsCopied === 'script' ? t('results.copied') : t('results.copy')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResultsActiveTab('script')}
                            className="h-8 text-muted-foreground hover:text-foreground"
                          >
                            {t('results.viewFull')}
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-5 prose dark:prose-invert prose-sm max-w-none max-h-64 overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                          {lastRunResults.final_script.length > 1000 ? lastRunResults.final_script.substring(0, 1000) + '\n\n*...click "View Full" to see complete script*' : lastRunResults.final_script}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Storyboard Preview */}
                  {lastRunResults.storyboard && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{t('results.storyboard')}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(lastRunResults.storyboard!);
                              setResultsCopied('storyboard');
                              setTimeout(() => setResultsCopied(null), 2000);
                            }}
                            className="h-8"
                          >
                            {resultsCopied === 'storyboard' ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                            {resultsCopied === 'storyboard' ? t('results.copied') : t('results.copy')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResultsActiveTab('storyboard')}
                            className="h-8 text-muted-foreground hover:text-foreground"
                          >
                            {t('results.viewFull')}
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-5 prose dark:prose-invert prose-sm max-w-none max-h-64 overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                          {lastRunResults.storyboard.length > 800 ? lastRunResults.storyboard.substring(0, 800) + '\n\n*...click "View Full" to see complete storyboard*' : lastRunResults.storyboard}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Node Results Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                        {t('results.processingPipeline')}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResultsActiveTab('nodes')}
                        className="text-muted-foreground"
                      >
                        {t('results.viewDetails')}
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {lastRunResults.results.map((result, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex-shrink-0 w-40 p-3 rounded-xl border transition-all",
                            result.success
                              ? "bg-card border-green-500/20 hover:border-green-500/40"
                              : "bg-card border-red-500/20 hover:border-red-500/40"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center",
                              result.success ? "bg-green-500/20" : "bg-red-500/20"
                            )}>
                              {result.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </div>
                            <span className="text-xs font-medium truncate">
                              {nodeTypes[result.node_type]?.title || result.node_type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {result.content ? result.content.substring(0, 80) + '...' : result.error || t('results.noOutput')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Script Full View */}
              {resultsActiveTab === 'script' && lastRunResults.final_script && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      {t('results.generatedScript')}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(lastRunResults.final_script!);
                          setResultsCopied('script-full');
                          setTimeout(() => setResultsCopied(null), 2000);
                        }}
                      >
                        {resultsCopied === 'script-full' ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                        {resultsCopied === 'script-full' ? t('results.copied') : t('results.copyScript')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([lastRunResults.final_script!], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}-script.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        {t('results.download')}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6 md:p-8 prose dark:prose-invert prose-sm md:prose-base max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                      {lastRunResults.final_script}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Storyboard Full View */}
              {resultsActiveTab === 'storyboard' && lastRunResults.storyboard && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                      {t('results.storyboard')}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(lastRunResults.storyboard!);
                          setResultsCopied('storyboard-full');
                          setTimeout(() => setResultsCopied(null), 2000);
                        }}
                      >
                        {resultsCopied === 'storyboard-full' ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                        {resultsCopied === 'storyboard-full' ? t('results.copied') : t('results.copyStoryboard')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([lastRunResults.storyboard!], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}-storyboard.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        {t('results.download')}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6 md:p-8 prose dark:prose-invert prose-sm md:prose-base max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                      {lastRunResults.storyboard}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* All Nodes Tab */}
              {resultsActiveTab === 'nodes' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-muted-foreground" />
                    {t('results.nodeResults')}
                    <Badge variant="secondary" className="ml-2">
                      {lastRunResults.results.filter(r => r.success).length}/{lastRunResults.results.length}
                    </Badge>
                  </h2>
                  <div className="space-y-4">
                    {lastRunResults.results.map((result, idx) => {
                      const nodeDef = nodeTypes[result.node_type];
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "bg-card border rounded-xl overflow-hidden transition-all",
                            result.success ? "border-border" : "border-red-500/30"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-between px-5 py-3 border-b",
                            result.success
                              ? "bg-secondary/30 border-border"
                              : "bg-red-500/5 border-red-500/20"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                nodeDef?.color || "from-gray-500 to-gray-600"
                              )}>
                                {nodeDef?.icon || <Wand2 className="h-4 w-4 text-white" />}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">
                                  {nodeDef?.title || result.node_type}
                                </h4>
                                <span className="text-xs text-muted-foreground">{t('results.nodeId', { id: result.node_id })}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t('results.success')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {t('results.failed')}
                                </Badge>
                              )}
                              {result.content && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(result.content);
                                    setResultsCopied(`node-${idx}`);
                                    setTimeout(() => setResultsCopied(null), 2000);
                                  }}
                                >
                                  {resultsCopied === `node-${idx}` ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          {result.content && (
                            <div className="p-5 prose dark:prose-invert prose-sm max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                                {result.content}
                              </ReactMarkdown>
                            </div>
                          )}
                          {result.error && (
                            <div className="p-4 text-sm text-red-400 bg-red-500/5">
                              {result.error}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty Results */}
              {!lastRunResults.final_script && !lastRunResults.storyboard && lastRunResults.results.length === 0 && !lastRunResults.error && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t('results.noResultsAvailable')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('results.noResultsHint')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResultsView(false)}
                className="text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {t('results.backToCanvas')}
              </Button>
              <div className="flex items-center gap-2">
                {(lastRunResults.final_script || lastRunResults.storyboard) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const allContent = [
                        lastRunResults.final_script ? `# ${t('results.script')}\n\n${lastRunResults.final_script}` : '',
                        lastRunResults.storyboard ? `# ${t('results.storyboard')}\n\n${lastRunResults.storyboard}` : '',
                        ...lastRunResults.results
                          .filter(r => r.success && r.content)
                          .map(r => `# ${nodeTypes[r.node_type]?.title || r.node_type} (${t('results.nodeId', { id: r.node_id })})\n\n${r.content}`)
                      ].filter(Boolean).join('\n\n---\n\n');
                      await navigator.clipboard.writeText(allContent);
                      setResultsCopied('all');
                      setTimeout(() => setResultsCopied(null), 2000);
                    }}
                  >
                    {resultsCopied === 'all' ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {resultsCopied === 'all' ? t('results.copiedAll') : t('results.copyAll')}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => setShowResultsView(false)}
                >
                  {t('results.continueEditing')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run Detail Modal */}
      {showRunDetailModal && selectedRunDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selectedRunDetail.status === 'completed' && "bg-green-500/20 text-green-500",
                  selectedRunDetail.status === 'failed' && "bg-red-500/20 text-red-500",
                  selectedRunDetail.status === 'running' && "bg-yellow-500/20 text-yellow-500"
                )}>
                  {selectedRunDetail.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                   selectedRunDetail.status === 'failed' ? <XCircle className="h-5 w-5" /> :
                   <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
                <div>
                  <h2 className="font-semibold">{selectedRunDetail.workflow_name}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{t('modal.run', { number: selectedRunDetail.run_number })}</span>
                    <span>·</span>
                    <span>{t('modal.nodesLabel', { count: selectedRunDetail.node_count })}</span>
                    <span>·</span>
                    <span className="text-muted-foreground">{t('modal.creditsLabel', { count: selectedRunDetail.credits_used })}</span>
                    {selectedRunDetail.execution_time_ms && (
                      <>
                        <span>·</span>
                        <span>{(selectedRunDetail.execution_time_ms / 1000).toFixed(1)}s</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRunDetailModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Error Message */}
                {selectedRunDetail.error_message && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-500 font-medium mb-1">
                      <XCircle className="h-4 w-4" />
                      {t('modal.error')}
                    </div>
                    <p className="text-sm text-red-400">{selectedRunDetail.error_message}</p>
                  </div>
                )}

                {/* Final Script */}
                {selectedRunDetail.final_script && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {t('modal.finalScript')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedRunDetail.final_script);
                          toast.success(t('toasts.scriptCopied'));
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        {t('results.copy')}
                      </Button>
                    </div>
                    <div className="bg-secondary/50 border border-border rounded-xl p-4 prose dark:prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents as any}
                      >
                        {selectedRunDetail.final_script}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Storyboard */}
                {selectedRunDetail.storyboard && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                        {t('modal.storyboard')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedRunDetail.storyboard);
                          toast.success(t('toasts.storyboardCopied'));
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        {t('results.copy')}
                      </Button>
                    </div>
                    <div className="bg-secondary/50 border border-border rounded-xl p-4 prose dark:prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents as any}
                      >
                        {selectedRunDetail.storyboard}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Node Results */}
                {selectedRunDetail.results?.length > 0 && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Wand2 className="h-4 w-4 text-muted-foreground" />
                      {t('modal.nodeResultsCount', { success: selectedRunDetail.results.filter((r: any) => r.success).length, total: selectedRunDetail.results.length })}
                    </h3>
                    <div className="space-y-3">
                      {selectedRunDetail.results.map((result: any, idx: number) => (
                        <div
                          key={idx}
                          className={cn(
                            "border rounded-lg overflow-hidden",
                            result.success ? "border-border" : "border-red-500/50"
                          )}
                        >
                          <div className={cn(
                            "px-3 py-2 flex items-center justify-between text-sm font-medium",
                            result.success ? "bg-secondary/50" : "bg-red-500/10"
                          )}>
                            <span className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              {nodeTypes[result.node_type]?.title || result.node_type}
                            </span>
                            <span className="text-xs text-muted-foreground">{t('results.nodeId', { id: result.node_id })}</span>
                          </div>
                          {result.content && (
                            <div className="p-3 text-sm max-h-48 overflow-y-auto">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={MarkdownComponents as any}
                              >
                                {result.content.length > 1500 ? result.content.substring(0, 1500) + '...' : result.content}
                              </ReactMarkdown>
                            </div>
                          )}
                          {result.error && (
                            <div className="p-3 text-sm text-red-400 bg-red-500/5">
                              {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!selectedRunDetail.final_script && !selectedRunDetail.storyboard && (!selectedRunDetail.results || selectedRunDetail.results.length === 0) && (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">{t('modal.noResultsForRun')}</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRunDetailModal(false)}>
                {t('modal.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => { setLightboxImage(null); setLightboxZoom(1); }}>
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
            <div className="text-white/60 text-sm">{Math.round(lightboxZoom * 100)}%</div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.max(0.25, z - 0.25)); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ZoomOut className="h-5 w-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.min(4, z + 0.25)); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ZoomIn className="h-5 w-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxZoom(1); }} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">1:1</button>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(lightboxImage); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <Download className="h-5 w-5" />
              </button>
              <button onClick={() => { setLightboxImage(null); setLightboxZoom(1); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="overflow-auto max-h-[calc(100vh-80px)] max-w-[calc(100vw-40px)]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Generated image" className="transition-transform duration-200" style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }} draggable={false} />
          </div>
        </div>
      )}
      {/* Delete Chat Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{i18n.language === 'ru' ? 'Удалить чат?' : 'Delete chat?'}</DialogTitle>
            <DialogDescription>
              {i18n.language === 'ru'
                ? 'Будут удалены все сообщения из этого чата. Это действие нельзя отменить.'
                : 'All messages from this chat will be deleted. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              {i18n.language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteChatSession(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              {i18n.language === 'ru' ? 'Удалить' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Run Confirmation Modal */}
      <Dialog open={!!deleteRunConfirmId} onOpenChange={(open) => { if (!open) setDeleteRunConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{i18n.language === 'ru' ? 'Удалить запуск?' : 'Delete run?'}</DialogTitle>
            <DialogDescription>
              {i18n.language === 'ru'
                ? 'Результаты этого запуска будут удалены. Это действие нельзя отменить.'
                : 'The results of this run will be deleted. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteRunConfirmId(null)}>
              {i18n.language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteRunConfirmId) {
                  try {
                    await apiService.deleteWorkflowRun(deleteRunConfirmId);
                    removeRunHistoryItem(deleteRunConfirmId);
                    if (selectedRun?.id === deleteRunConfirmId) setSelectedRun(null);
                    toast.success(t('toasts.runDeleted'));
                  } catch {
                    toast.error(t('toasts.failedDeleteRun'));
                  }
                  setDeleteRunConfirmId(null);
                }
              }}
            >
              {i18n.language === 'ru' ? 'Удалить' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DevAccessGate>
  );
}
