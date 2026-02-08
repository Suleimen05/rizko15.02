import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  ChevronLeft,
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
  // MoreVertical,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useWorkflow } from '@/contexts/WorkflowContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import { DevAccessGate } from '@/components/DevAccessGate';
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel';
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

const aiModels = [
  { id: 'gemini', name: 'Gemini 2.0 Flash', icon: GeminiIcon, available: true, description: 'Fast & efficient', creditCost: 1 },
  { id: 'claude', name: 'Claude 3.5 Sonnet', icon: ClaudeIcon, available: true, description: 'Best for writing', creditCost: 5 },
  { id: 'gpt4', name: 'GPT-4o', icon: GPTIcon, available: true, description: 'Most capable', creditCost: 4 },
];

const contentModes = [
  { id: 'script', name: 'Script Writer', icon: PenTool, description: 'Create viral scripts', color: 'from-purple-500 to-pink-500' },
  { id: 'ideas', name: 'Idea Generator', icon: Lightbulb, description: 'Generate content ideas', color: 'from-yellow-500 to-orange-500' },
  { id: 'analysis', name: 'Trend Analyst', icon: TrendingUp, description: 'Analyze content', color: 'from-blue-500 to-cyan-500' },
  { id: 'improve', name: 'Content Improver', icon: Zap, description: 'Enhance existing content', color: 'from-green-500 to-emerald-500' },
  { id: 'hook', name: 'Hook Master', icon: Sparkles, description: 'Create attention hooks', color: 'from-red-500 to-pink-500' },
];

const suggestedPrompts = [
  { icon: PenTool, text: 'Write a viral TikTok script about...', category: 'script' },
  { icon: Lightbulb, text: 'Give me 5 content ideas for...', category: 'ideas' },
  { icon: TrendingUp, text: 'Analyze this trending video concept', category: 'analysis' },
  { icon: Sparkles, text: 'Create 3 hooks for my video about...', category: 'hook' },
];

// ============================================================================
// NODE TYPES
// ============================================================================

const nodeTypes: Record<string, {
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  hasInput: boolean;
  hasOutput: boolean;
}> = {
  video: { title: 'Video Input', icon: <Video className="h-4 w-4 text-white" />, description: 'Drop saved video here', color: 'from-blue-500 to-cyan-500', hasInput: false, hasOutput: true },
  brand: { title: 'Brand Brief', icon: <Building2 className="h-4 w-4 text-white" />, description: 'Your brand context', color: 'from-blue-500 to-cyan-500', hasInput: false, hasOutput: true },
  analyze: { title: 'Analyze', icon: <Search className="h-4 w-4 text-white" />, description: 'Deep content analysis', color: 'from-purple-500 to-pink-500', hasInput: true, hasOutput: true },
  extract: { title: 'Extract', icon: <Target className="h-4 w-4 text-white" />, description: 'Extract key elements', color: 'from-purple-500 to-pink-500', hasInput: true, hasOutput: true },
  style: { title: 'Style Match', icon: <Palette className="h-4 w-4 text-white" />, description: 'Match visual style', color: 'from-purple-500 to-pink-500', hasInput: true, hasOutput: true },
  generate: { title: 'Generate', icon: <Wand2 className="h-4 w-4 text-white" />, description: 'AI script creation', color: 'from-green-500 to-emerald-500', hasInput: true, hasOutput: true },
  refine: { title: 'Refine', icon: <MessageSquare className="h-4 w-4 text-white" />, description: 'Polish & improve', color: 'from-green-500 to-emerald-500', hasInput: true, hasOutput: true },
  script: { title: 'Script Output', icon: <FileText className="h-4 w-4 text-white" />, description: 'Final script', color: 'from-orange-500 to-yellow-500', hasInput: true, hasOutput: false },
  storyboard: { title: 'Storyboard', icon: <LayoutGrid className="h-4 w-4 text-white" />, description: 'Visual breakdown', color: 'from-orange-500 to-yellow-500', hasInput: true, hasOutput: false },
};

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

interface SavedVideo {
  id: number;
  platform: string;
  author: string;
  desc: string;
  views: string;
  uts: number;
  thumb: string;
  url?: string;
}


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
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),
  code: ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-zinc-900 text-zinc-300 rounded-md p-2 my-2 text-xs overflow-x-auto">
          <code style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded text-xs font-mono" style={{ wordBreak: 'break-all' }}>{children}</code>
    );
  },
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-2 border-purple-500 pl-3 my-2 text-zinc-400 italic" style={{ wordBreak: 'break-word' }}>
      {children}
    </blockquote>
  ),
  a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline" style={{ wordBreak: 'break-all' }}>{children}</a>
  ),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkflowBuilder() {
  const { user: _user, tokens } = useAuth();
  const token = tokens?.accessToken;

  // Use shared chat context
  const {
    currentSessionId,
    messages,
    isStreaming,
    credits,
    createSession,
    sendMessage: sendChatMessage,
  } = useChat();

  // Use workflow context for persistence
  const {
    workflows,
    currentWorkflow,
    isDirty,
    loadWorkflows,
    createWorkflow: createNewWorkflow,
    loadWorkflow,
    saveWorkflow,
    deleteWorkflow: deleteWf,
    closeWorkflow,
    markDirty,
    setCurrentWorkflow,
  } = useWorkflow();

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
  const [activePanel, setActivePanel] = useState<'nodes' | 'saved' | 'history'>('nodes');
  const [savedTab, setSavedTab] = useState<'videos' | 'workflows'>('workflows');
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('All');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

  // Workflow name editing
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
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

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);

  // History
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState<any | null>(null);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);
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

  // Dragging state
  const [draggingNode, setDraggingNode] = useState<{
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // ============================================================================
  // LOAD SAVED VIDEOS
  // ============================================================================

  useEffect(() => {
    loadSavedVideos();
    loadRunHistory();
    loadWorkflows();
    // Load templates
    apiService.getWorkflowTemplates()
      .then(data => setTemplates(data))
      .catch(() => setTemplates([]));
  }, []);

  // Auto-create new workflow on session start if none loaded
  useEffect(() => {
    if (!currentWorkflow && token && workflows !== undefined) {
      createNewWorkflow('Untitled Workflow');
    }
  }, [token]);

  const loadRunHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await apiService.getWorkflowHistory(30);
      setRunHistory(history);
    } catch (error) {
      console.error('Failed to load run history:', error);
      setRunHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadRunDetail = async (runId: number) => {
    try {
      setLoadingRunDetail(true);
      const detail = await apiService.getWorkflowRun(runId);
      setSelectedRunDetail(detail);
    } catch (error) {
      console.error('Failed to load run detail:', error);
      toast.error('Failed to load run details');
    } finally {
      setLoadingRunDetail(false);
    }
  };

  const handleSelectRun = async (run: any) => {
    if (selectedRun?.id === run.id) {
      setSelectedRun(null);
      setSelectedRunDetail(null);
    } else {
      setSelectedRun(run);
      await loadRunDetail(run.id);
    }
  };

  const loadSavedVideos = async () => {
    try {
      setLoadingSaved(true);
      const response = await apiService.getFavorites({ page: 1, per_page: 50 });

      const videos: SavedVideo[] = response.items.map((item: any) => ({
        id: item.id,
        platform: detectPlatform(item.trend?.url || ''),
        author: item.trend?.author_username || 'unknown',
        desc: item.trend?.description || 'No description',
        views: formatViews(item.trend?.stats?.playCount || 0),
        uts: item.trend?.uts_score || 0,
        thumb: item.trend?.cover_url || '',
        url: item.trend?.url,
      }));

      setSavedVideos(videos);
    } catch (error) {
      console.error('Failed to load saved videos:', error);
      setSavedVideos([]);
    } finally {
      setLoadingSaved(false);
    }
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok')) return 'TikTok';
    if (url.includes('instagram')) return 'Instagram';
    if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('snapchat')) return 'Snapchat';
    if (url.includes('twitter') || url.includes('x.com')) return 'X';
    if (url.includes('pinterest')) return 'Pinterest';
    if (url.includes('linkedin')) return 'LinkedIn';
    return 'TikTok';
  };

  const formatViews = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

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
      toast.error('Please login to save workflows');
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
    toast.success('Workflow saved');
  }, [token, nodes, connections, zoom, panOffset, workflowName, saveWorkflow]);

  // Handle new workflow — auto-save current before creating fresh
  const handleNewWorkflow = useCallback(async () => {
    // Auto-save current workflow if it has nodes
    if (nodes.length > 0 && token) {
      try {
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
      } catch (err) {
        console.error('Auto-save before new workflow failed:', err);
      }
    }

    // Reset local state
    setNodes([]);
    setConnections([]);
    setNodeIdCounter(0);
    setWorkflowName('Untitled Workflow');
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setConfigNode(null);
    setSelectedNode(null);
    closeWorkflow();

    // Create a fresh workflow in DB
    if (token) {
      await createNewWorkflow('Untitled Workflow');
    }
  }, [closeWorkflow, nodes, connections, zoom, panOffset, workflowName, token, saveWorkflow, createNewWorkflow]);

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
      toast.error('Please login to use templates');
      return;
    }
    try {
      const wf = await apiService.createFromTemplate(templateId);
      setCurrentWorkflow(wf);
      await loadWorkflows();
      toast.success('Workflow created from template');
    } catch (error) {
      console.error('Failed to create from template:', error);
      toast.error('Failed to create from template');
    }
  }, [token, setCurrentWorkflow, loadWorkflows]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnection, selectedNode, configNode, handleSaveWorkflow, markDirty]);

  // ============================================================================
  // CHAT FUNCTIONS
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isStreaming) return;

    if (!token) {
      toast.error('Please login to use AI chat');
      return;
    }

    setInputValue('');

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Use context's sendMessage which handles session creation
    await sendChatMessage(text, selectedMode.id, selectedModel.id);
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const regenerateResponse = async () => {
    if (messages.length < 2 || isStreaming || !currentSessionId) return;

    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Regenerate using context
    await sendChatMessage(lastUserMessage.content, selectedMode.id, selectedModel.id);
  };

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
        toast.success(`Video attached to node #${existingVideoNode.id}`);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ============================================================================
  // PAN & ZOOM (optimized with requestAnimationFrame)
  // ============================================================================

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't start panning if clicking inside a workflow node (allows text selection/copy)
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

  // Canvas zoom handler - blocks zoom only when inside a scrollable node element
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
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.min(2, Math.max(0.3, +(prev + delta).toFixed(2))));
  }, []);

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  // Estimate credit cost for current workflow
  const NODE_COSTS: Record<string, Record<string, number>> = {
    analyze:    { gemini: 1, claude: 5, gpt4: 4 },
    extract:    { gemini: 1, claude: 5, gpt4: 4 },
    style:      { gemini: 1, claude: 5, gpt4: 4 },
    generate:   { gemini: 2, claude: 6, gpt4: 5 },
    refine:     { gemini: 1, claude: 5, gpt4: 4 },
    script:     { gemini: 1, claude: 5, gpt4: 4 },
    storyboard: { gemini: 2, claude: 6, gpt4: 5 },
  };

  const estimatedCost = nodes.reduce((total, node) => {
    const costs = NODE_COSTS[node.type];
    if (!costs) return total;
    const model = node.config?.model || 'gemini';
    return total + (costs[model] || costs.gemini || 0);
  }, 0);

  const runWorkflow = async () => {
    if (!token) {
      toast.error('Please login to run workflows');
      return;
    }

    if (nodes.length === 0) {
      toast.error('Add nodes to the canvas first');
      return;
    }

    if (connections.length === 0) {
      toast.error('Connect nodes together to create a workflow');
      return;
    }

    // Check if user has enough credits
    if (credits && credits.remaining < estimatedCost) {
      toast.error(`Not enough credits. Need ~${estimatedCost}, have ${credits.remaining}`);
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
          } : undefined,
        })),
        connections: connections.map(c => ({ from: c.from, to: c.to })),
        workflow_id: currentWorkflow?.id,
        workflow_name: workflowName,
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

        const creditsMsg = result.credits_used ? ` (${result.credits_used} credits used)` : '';
        toast.success(`Workflow completed!${creditsMsg}`);

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
        toast.error(result.error || 'Workflow execution failed');
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast.error('Failed to execute workflow. Please try again.');
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

  const renderConnections = () => {
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
            stroke={isSelected ? '#ef4444' : isActive ? '#a855f7' : 'hsl(var(--border))'}
            strokeWidth={isSelected ? 3 : isActive ? 3 : 2}
            strokeDasharray={isSelected ? '8 4' : undefined}
            className={isActive ? "animate-pulse" : undefined}
          />
          {isActive && (
            <circle r="4" fill="#a855f7" className="animate-pulse">
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
  };

  // Live connection preview line during port drag (GPU-accelerated)
  const renderConnectingLine = () => {
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
          stroke="#a855f7"
          strokeWidth={6}
          opacity={0.2}
          strokeLinecap="round"
        />
        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke="#a855f7"
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
          fill="#a855f7"
          opacity={0.6}
        />
      </g>
    );
  };

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
          !isNodeRunning && !isProcessed && isSelected && "border-purple-500 shadow-purple-500/20",
          !isNodeRunning && !isProcessed && !isSelected && "border-border hover:border-purple-400"
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
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setConfigNode(node);
        }}
      >
        <div className={cn("px-3 py-2 rounded-t-[10px] bg-gradient-to-r", nodeDef.color)}>
          <div className="flex items-center gap-2">
            {isNodeRunning ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : nodeDef.icon}
            <span className="text-xs font-medium text-white truncate">{nodeDef.title}</span>
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
              <div className="w-full h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden relative">
                {node.videoData.thumb ? (
                  <img src={node.videoData.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-gray-600" />
                  </div>
                )}
                <Badge className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-[10px] px-1.5 py-0.5">
                  {node.videoData.uts}
                </Badge>
                <Badge className="absolute top-1 right-1 bg-black/60 text-white border-0 text-[10px] px-1.5 py-0.5">
                  {platformIcons[node.videoData.platform]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{node.videoData.desc}</p>
            </div>
          ) : node.outputContent ? (
            <div className="bg-secondary rounded-lg p-2 text-[10px] text-muted-foreground max-h-[80px] overflow-y-auto whitespace-pre-wrap cursor-pointer hover:bg-secondary/80"
              onClick={(e) => { e.stopPropagation(); setConfigNode(node); }}
            >
              {node.outputContent.substring(0, 200)}{node.outputContent.length > 200 ? '...' : ''}
            </div>
          ) : node.config?.customPrompt || node.config?.model ? (
            <div className="text-[10px] text-muted-foreground space-y-1">
              {node.config?.customPrompt && (
                <div className="flex justify-between">
                  <span>Prompt</span>
                  <span className="font-medium text-purple-400">Custom</span>
                </div>
              )}
              {node.config?.model && (
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="font-medium text-foreground">{node.config.model}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">Ready</span>
            </div>
          )}
        </div>

        {/* Connection ports - larger, GPU-accelerated hover */}
        <div className="flex justify-between px-3 pb-2">
          {nodeDef.hasInput ? (
            <div
              className="port-handle w-4 h-4 bg-border border-2 border-card rounded-full -ml-5 cursor-crosshair hover:bg-green-500 hover:border-green-300"
              style={{ transition: 'background-color 100ms, border-color 100ms, transform 100ms', transform: 'scale(1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Input"
            />
          ) : <div />}
          {nodeDef.hasOutput ? (
            <div
              className={cn(
                "port-handle w-4 h-4 bg-border border-2 border-card rounded-full -mr-5 cursor-crosshair hover:bg-purple-500 hover:border-purple-300",
                connectingFrom?.nodeId === node.id && "bg-purple-500 border-purple-300"
              )}
              style={{ transition: 'background-color 100ms, border-color 100ms, transform 100ms', transform: connectingFrom?.nodeId === node.id ? 'scale(1.5)' : 'scale(1)' }}
              onMouseEnter={(e) => { if (!connectingFrom) e.currentTarget.style.transform = 'scale(1.5)'; }}
              onMouseLeave={(e) => { if (!connectingFrom) e.currentTarget.style.transform = 'scale(1)'; }}
              title="Drag to connect"
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

  const filteredVideos = platformFilter === 'All'
    ? savedVideos
    : savedVideos.filter(v => v.platform === platformFilter);

  // ModeIcon unused — mode selection is done via pills in header

  return (
    <DevAccessGate>
      <div className="flex h-full bg-background">
        {/* Left Sidebar - Collapsible */}
        <div className={cn(
          "bg-card border-r border-border flex flex-col flex-shrink-0 transition-all duration-300",
          leftSidebarCollapsed ? "w-12" : "w-64"
        )}>
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="p-3 border-b border-border hover:bg-accent transition-colors flex items-center justify-center"
          >
            {leftSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {!leftSidebarCollapsed && (
            <>
              <div className="flex border-b border-border">
                {[
                  { id: 'nodes', label: 'Nodes', icon: null },
                  { id: 'saved', label: 'Saved', icon: null },
                  { id: 'history', label: 'History', icon: History },
                ].map((panel) => (
                  <button
                    key={panel.id}
                    className={cn(
                      "flex-1 py-2.5 px-2 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                      activePanel === panel.id ? "bg-secondary text-foreground border-b-2 border-purple-500" : "text-muted-foreground hover:bg-accent"
                    )}
                    onClick={() => setActivePanel(panel.id as 'nodes' | 'saved' | 'history')}
                  >
                    {panel.icon && <panel.icon className="h-3 w-3" />}
                    {panel.label}
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2.5">
                  {activePanel === 'nodes' && (
                    <div className="space-y-3">
                      {/* Templates - Premium look */}
                      {templates.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] uppercase text-purple-400 tracking-wider font-semibold">Quick Start</span>
                          </div>
                          <div className="space-y-1">
                            {templates.map((tpl, idx) => {
                              const tplIcons = [Zap, PenTool, Sparkles];
                              const tplGradients = [
                                'from-blue-500/15 to-cyan-500/15 hover:from-blue-500/25 hover:to-cyan-500/25 border-blue-500/20 hover:border-blue-500/40',
                                'from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 border-purple-500/20 hover:border-purple-500/40',
                                'from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border-amber-500/20 hover:border-amber-500/40',
                              ];
                              const tplIconGradients = [
                                'from-blue-500 to-cyan-500',
                                'from-purple-500 to-pink-500',
                                'from-amber-500 to-orange-500',
                              ];
                              const TplIcon = tplIcons[idx % 3];
                              return (
                                <button
                                  key={tpl.id}
                                  onClick={() => handleUseTemplate(tpl.id)}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-200 text-left group bg-gradient-to-r",
                                    tplGradients[idx % 3]
                                  )}
                                >
                                  <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow", tplIconGradients[idx % 3])}>
                                    <TplIcon className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-semibold leading-tight group-hover:text-foreground transition-colors">{tpl.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] text-muted-foreground">{tpl.node_count} nodes</span>
                                      <span className="text-[9px] text-muted-foreground/50">·</span>
                                      <span className="text-[9px] font-medium text-purple-400">~{tpl.estimated_credits} cr</span>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      {templates.length > 0 && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center px-2"><div className="w-full border-t border-border/50" /></div>
                          <div className="relative flex justify-center">
                            <span className="bg-card px-2 text-[9px] uppercase tracking-wider text-muted-foreground/60">Drag to canvas</span>
                          </div>
                        </div>
                      )}

                      {/* Node groups */}
                      {[
                        { title: 'Input', types: ['video', 'brand'], accent: 'text-cyan-400', dot: 'bg-cyan-400' },
                        { title: 'Process', types: ['analyze', 'extract', 'style'], accent: 'text-purple-400', dot: 'bg-purple-400' },
                        { title: 'AI', types: ['generate', 'refine'], accent: 'text-emerald-400', dot: 'bg-emerald-400' },
                        { title: 'Output', types: ['script', 'storyboard'], accent: 'text-amber-400', dot: 'bg-amber-400' },
                      ].map(group => (
                        <div key={group.title}>
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full", group.dot)} />
                            <span className={cn("text-[10px] uppercase tracking-wider font-semibold", group.accent)}>{group.title}</span>
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
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-sm flex-shrink-0",
                                  "group-hover:shadow-md group-hover:scale-105 transition-all duration-150",
                                  nodeTypes[type].color
                                )}>
                                  {nodeTypes[type].icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-medium leading-tight">{nodeTypes[type].title}</div>
                                  <div className="text-[9px] text-muted-foreground/70 leading-tight">{nodeTypes[type].description}</div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex flex-col gap-[2px]">
                                    <div className="w-3 h-[2px] bg-muted-foreground/30 rounded-full" />
                                    <div className="w-3 h-[2px] bg-muted-foreground/30 rounded-full" />
                                    <div className="w-3 h-[2px] bg-muted-foreground/30 rounded-full" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activePanel === 'saved' && (
                    <div className="space-y-3">
                      {/* Sub-tabs: Workflows / Videos */}
                      <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
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
                            {tab}
                          </button>
                        ))}
                      </div>

                      {savedTab === 'workflows' ? (
                        /* Saved Workflows List */
                        <div className="space-y-1.5">
                          {workflows.length === 0 ? (
                            <div className="text-center py-8">
                              <Wand2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No saved workflows</p>
                              <p className="text-xs text-muted-foreground mt-1">Save your first workflow</p>
                            </div>
                          ) : (
                            workflows.map(wf => (
                              <div
                                key={wf.id}
                                onClick={() => handleLoadWorkflow(wf.id)}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                  currentWorkflow?.id === wf.id
                                    ? "border-purple-500 bg-purple-500/10"
                                    : "border-border bg-secondary/50 hover:border-purple-400"
                                )}
                              >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                                  <Wand2 className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{wf.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {wf.node_count} nodes · {wf.status}
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
                                    ? "bg-purple-500 text-white border-purple-500"
                                    : "bg-secondary text-muted-foreground border-border hover:border-purple-500"
                                )}
                                onClick={() => setPlatformFilter(platform)}
                              >
                                {platform}
                              </button>
                            ))}
                          </div>

                          {loadingSaved ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                            </div>
                          ) : filteredVideos.length === 0 ? (
                            <div className="text-center py-8">
                              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No saved videos</p>
                              <p className="text-xs text-muted-foreground mt-1">Save videos from Trends</p>
                            </div>
                          ) : (
                            filteredVideos.map(video => (
                              <div
                                key={video.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('videoData', JSON.stringify(video))}
                                className="group flex gap-2 p-2 bg-secondary/50 border border-border rounded-lg cursor-grab hover:border-purple-500 transition-all relative"
                              >
                                <div className="w-12 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded overflow-hidden flex-shrink-0 relative">
                                  {video.thumb ? (
                                    <img src={video.thumb} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="h-4 w-4 text-gray-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-[9px] px-1.5 py-0">
                                      {video.uts}
                                    </Badge>
                                    <span className="text-[10px] font-medium truncate">@{video.author}</span>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground line-clamp-2">{video.desc}</p>
                                </div>
                                {/* Delete button */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    try {
                                      await apiService.removeFavorite(video.id);
                                      setSavedVideos(prev => prev.filter(v => v.id !== video.id));
                                      toast.success('Video removed');
                                    } catch {
                                      toast.error('Failed to remove video');
                                    }
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded-md bg-red-500/0 text-transparent group-hover:bg-red-500/10 group-hover:text-red-400 hover:!bg-red-500/20 transition-all"
                                  title="Remove video"
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

                  {activePanel === 'history' && (
                    <div className="space-y-3">
                      {/* Header with refresh */}
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wide font-medium">Run History</div>
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
                          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                        </div>
                      ) : runHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-muted-foreground">No workflow runs yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Run a workflow to see history</p>
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
                            let timeAgo = 'just now';
                            if (diffMins > 0 && diffMins < 60) timeAgo = `${diffMins}m ago`;
                            else if (diffHours > 0 && diffHours < 24) timeAgo = `${diffHours}h ago`;
                            else if (diffDays > 0) timeAgo = `${diffDays}d ago`;

                            return (
                              <div
                                key={run.id}
                                onClick={() => handleSelectRun(run)}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                  selectedRun?.id === run.id
                                    ? "border-purple-500 bg-purple-500/10"
                                    : "border-border bg-secondary/50 hover:border-purple-400"
                                )}
                              >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", statusStyle.bg, statusStyle.text)}>
                                  {statusStyle.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium truncate">{run.workflow_name}</span>
                                    {run.run_number > 1 && (
                                      <span className="text-[9px] text-muted-foreground">#{run.run_number}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" />
                                      {timeAgo}
                                    </span>
                                    <span>·</span>
                                    <span>{run.node_count} nodes</span>
                                    {run.credits_used > 0 && (
                                      <>
                                        <span>·</span>
                                        <span className="text-purple-400">{run.credits_used} cr</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await apiService.deleteWorkflowRun(run.id);
                                      setRunHistory(prev => prev.filter(r => r.id !== run.id));
                                      if (selectedRun?.id === run.id) setSelectedRun(null);
                                      toast.success('Run deleted');
                                    } catch (err) {
                                      toast.error('Failed to delete run');
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected Run Details */}
                      {selectedRun && (
                        <div className="mt-3 p-3 bg-secondary/50 border border-border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Run Details</span>
                            <button
                              onClick={() => { setSelectedRun(null); setSelectedRunDetail(null); }}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>

                          {loadingRunDetail ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            </div>
                          ) : selectedRunDetail ? (
                            <div className="space-y-2">
                              <div className="space-y-1.5 text-[10px]">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status</span>
                                  <span className={cn(
                                    "font-medium capitalize",
                                    selectedRunDetail.status === 'completed' && "text-green-500",
                                    selectedRunDetail.status === 'failed' && "text-red-500",
                                    selectedRunDetail.status === 'running' && "text-yellow-500"
                                  )}>
                                    {selectedRunDetail.status}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Nodes</span>
                                  <span>{selectedRunDetail.node_count}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Credits</span>
                                  <span className="text-purple-400">{selectedRunDetail.credits_used}</span>
                                </div>
                                {selectedRunDetail.execution_time_ms && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span>{(selectedRunDetail.execution_time_ms / 1000).toFixed(1)}s</span>
                                  </div>
                                )}
                              </div>

                              {selectedRunDetail.error_message && (
                                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px]">
                                  {selectedRunDetail.error_message}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-1.5 pt-1">
                                {(selectedRunDetail.final_script || selectedRunDetail.storyboard) && (
                                  <Button
                                    size="sm"
                                    onClick={() => setShowRunDetailModal(true)}
                                    className="w-full h-7 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Full Results
                                  </Button>
                                )}
                                {selectedRunDetail.results?.length > 0 && (
                                  <div className="text-[9px] text-muted-foreground text-center">
                                    {selectedRunDetail.results.filter((r: any) => r.success).length}/{selectedRunDetail.results.length} nodes successful
                                  </div>
                                )}
                              </div>

                              {/* Quick Preview */}
                              {selectedRunDetail.final_script && (
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-1">Script Preview:</div>
                                  <div
                                    className="p-2 bg-card border border-border rounded max-h-24 overflow-y-auto whitespace-pre-wrap text-[9px] cursor-pointer hover:border-purple-500 transition-colors"
                                    onClick={() => setShowRunDetailModal(true)}
                                  >
                                    {selectedRunDetail.final_script.substring(0, 300)}{selectedRunDetail.final_script.length > 300 ? '...' : ''}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-foreground text-center py-2">
                              Failed to load details
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
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
              "bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)]",
              "[background-size:24px_24px]",
              isPanning ? "cursor-grabbing" : "cursor-grab"
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

            {nodes.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Wand2 className="h-8 w-8 text-purple-500/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Build Your Workflow</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Drag nodes from the left panel to create a script generation pipeline
                </p>
              </div>
            )}
          </div>

          {/* Top Toolbar */}
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
            {/* Left: Workflow Name */}
            <div className="pointer-events-auto flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow-lg">
              {editingName ? (
                <input
                  autoFocus
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
                  className="bg-transparent text-sm font-medium outline-none border-b border-purple-500 w-48"
                />
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-sm font-medium hover:text-purple-400 transition-colors truncate max-w-[200px]"
                >
                  {workflowName}
                </button>
              )}
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-orange-500" title="Unsaved changes" />
              )}
              {currentWorkflow && (
                <span className="text-[10px] text-muted-foreground">#{currentWorkflow.id}</span>
              )}
            </div>

            {/* Right: Save + Run */}
            <div className="pointer-events-auto flex items-center gap-2">
              <Button
                onClick={handleSaveWorkflow}
                disabled={nodes.length === 0}
                variant="outline"
                size="sm"
                className="shadow-lg bg-card/90 backdrop-blur-sm"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save
              </Button>
              <Button
                onClick={handleNewWorkflow}
                variant="outline"
                size="sm"
                className="shadow-lg bg-card/90 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New
              </Button>
              <Button
                onClick={runWorkflow}
                disabled={isRunning || nodes.length === 0}
                size="sm"
                className={cn(
                  "shadow-lg",
                  isRunning
                    ? "bg-gradient-to-r from-orange-500 to-yellow-500"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                )}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    Run{estimatedCost > 0 ? ` (${estimatedCost} cr)` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => { setNodes([]); setConnections([]); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

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
            />
          )}
        </div>

        {/* Right Sidebar - AI Chat (Professional Design) */}
        <div className="w-[400px] bg-card border-l border-border flex flex-col flex-shrink-0">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-purple-500/5 to-pink-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Script Assistant</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {selectedModel.name}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => createSession()} className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Credits Indicator */}
            {credits && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      credits.remaining / credits.monthly_limit > 0.5
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : credits.remaining / credits.monthly_limit > 0.2
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                        : "bg-gradient-to-r from-red-500 to-pink-500"
                    )}
                    style={{ width: `${Math.min(100, (credits.remaining / credits.monthly_limit) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                  {credits.remaining}/{credits.monthly_limit}
                </span>
              </div>
            )}

            {/* Mode Selector Pills */}
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {contentModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                      selectedMode.id === mode.id
                        ? `bg-gradient-to-r ${mode.color} text-white shadow-md`
                        : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="p-4 space-y-2 overflow-hidden">
              {messages.length === 0 ? (
                <div className="py-8">
                  {/* Welcome Message */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">What can I help you create?</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      I can write viral scripts, generate ideas, analyze trends, and more.
                    </p>
                  </div>

                  {/* Suggested Prompts */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium mb-3">Try asking:</p>
                    {suggestedPrompts.map((prompt, idx) => {
                      const Icon = prompt.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setInputValue(prompt.text);
                            inputRef.current?.focus();
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border hover:border-purple-500 hover:bg-secondary transition-all text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                            <Icon className="h-4 w-4 text-purple-500" />
                          </div>
                          <span className="text-sm">{prompt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="w-full">
                    {message.role === 'user' ? (
                      /* User Message - Right aligned */
                      <div className="flex justify-end mb-4">
                        <div className="max-w-[85%] flex items-end gap-2">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl rounded-br-md px-4 py-2.5">
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Assistant Message - Left aligned */
                      <div className="flex justify-start mb-4">
                        <div className="max-w-[95%] flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl rounded-tl-md px-4 py-3">
                              <div className="text-sm text-zinc-100 [&>*]:break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={MarkdownComponents as any}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            </div>
                            {/* Message Actions */}
                            <div className="flex items-center gap-1 mt-1.5 ml-1">
                              <button
                                onClick={() => copyMessage(message.content, message.id)}
                                className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
                                title="Copy"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              {message === messages[messages.length - 1] && (
                                <button
                                  onClick={regenerateResponse}
                                  disabled={isStreaming}
                                  className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                                  title="Regenerate"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input - Modern Design */}
          <div className="p-4 border-t border-border">
            <div className="relative">
              <div className="bg-secondary border border-border rounded-2xl overflow-hidden focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask me to ${selectedMode.description.toLowerCase()}...`}
                  className="w-full p-4 pb-14 bg-transparent resize-none focus:outline-none text-sm placeholder:text-muted-foreground min-h-[60px] max-h-[150px]"
                  rows={1}
                  disabled={isStreaming}
                />

                {/* Bottom Bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-secondary/50 backdrop-blur-sm">
                  {/* Model Selector */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowModelMenu(!showModelMenu); }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <selectedModel.icon />
                      <span className="hidden sm:inline">{selectedModel.name}</span>
                      <span className={cn(
                        "text-[9px] font-medium px-1 py-0.5 rounded",
                        selectedModel.creditCost <= 1 ? "bg-green-500/20 text-green-400" :
                        selectedModel.creditCost <= 4 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        {credits?.model_costs?.[selectedModel.id] ?? selectedModel.creditCost} cr
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {showModelMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-xl shadow-xl py-2 z-50">
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Select Model</div>
                        {aiModels.map((model) => {
                          const IconComponent = model.icon;
                          const cost = credits?.model_costs?.[model.id] ?? model.creditCost;
                          return (
                            <button
                              key={model.id}
                              onClick={() => { if (model.available) { setSelectedModel(model); setShowModelMenu(false); }}}
                              disabled={!model.available}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                                !model.available ? "opacity-50 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
                              )}
                            >
                              <IconComponent />
                              <div className="flex-1 text-left">
                                <div className="font-medium">{model.name}</div>
                                <div className="text-xs text-muted-foreground">{model.description}</div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                  cost <= 1 ? "bg-green-500/20 text-green-400" :
                                  cost <= 4 ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-red-500/20 text-red-400"
                                )}>
                                  {cost} cr
                                </span>
                                {selectedModel.id === model.id && model.available && (
                                  <Check className="h-4 w-4 text-purple-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Send Button */}
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isStreaming}
                    size="sm"
                    className={cn(
                      "rounded-xl px-4 transition-all",
                      inputValue.trim()
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Keyboard Shortcut Hint */}
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Shift + Enter</kbd> for new line
              </p>
            </div>
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
                  Back to Canvas
                </Button>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    lastRunResults.error
                      ? "bg-red-500/20"
                      : "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
                  )}>
                    {lastRunResults.error ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Award className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">
                      {lastRunResults.error ? 'Workflow Failed' : 'Workflow Results'}
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
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <Coins className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">
                      {lastRunResults.credits_used} credits
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-medium text-green-400">
                    {lastRunResults.results.filter(r => r.success).length}/{lastRunResults.results.length} nodes
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-6xl mx-auto px-6 flex gap-1">
              {[
                { id: 'all' as const, label: 'Overview', icon: Eye },
                ...(lastRunResults.final_script ? [{ id: 'script' as const, label: 'Script', icon: FileText }] : []),
                ...(lastRunResults.storyboard ? [{ id: 'storyboard' as const, label: 'Storyboard', icon: LayoutGrid }] : []),
                { id: 'nodes' as const, label: 'All Nodes', icon: Wand2 },
              ].map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setResultsActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                      resultsActiveTab === tab.id
                        ? "border-purple-500 text-purple-400"
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
                    <p className="font-medium text-red-400">Execution Error</p>
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
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold">{lastRunResults.results.filter(r => r.success).length}</p>
                      <p className="text-xs text-muted-foreground">Successful Nodes</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Coins className="h-5 w-5 text-purple-500" />
                      </div>
                      <p className="text-2xl font-bold">{lastRunResults.credits_used || 0}</p>
                      <p className="text-xs text-muted-foreground">Credits Used</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Timer className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold">
                        {lastRunResults.execution_time_ms ? `${(lastRunResults.execution_time_ms / 1000).toFixed(1)}s` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Execution Time</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-orange-500" />
                      </div>
                      <p className="text-2xl font-bold">{lastRunResults.results.length}</p>
                      <p className="text-xs text-muted-foreground">Total Nodes</p>
                    </div>
                  </div>

                  {/* Script Preview (if exists) */}
                  {lastRunResults.final_script && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-500" />
                          <h3 className="font-semibold">Generated Script</h3>
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
                            {resultsCopied === 'script' ? 'Copied!' : 'Copy'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResultsActiveTab('script')}
                            className="h-8 text-purple-400 hover:text-purple-300"
                          >
                            View Full
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-5 prose prose-invert prose-sm max-w-none max-h-64 overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                          {lastRunResults.final_script.length > 1000 ? lastRunResults.final_script.substring(0, 1000) + '\n\n*...click "View Full" to see complete script*' : lastRunResults.final_script}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Storyboard Preview */}
                  {lastRunResults.storyboard && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-r from-pink-500/5 to-orange-500/5">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4 text-pink-500" />
                          <h3 className="font-semibold">Storyboard</h3>
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
                            {resultsCopied === 'storyboard' ? 'Copied!' : 'Copy'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResultsActiveTab('storyboard')}
                            className="h-8 text-pink-400 hover:text-pink-300"
                          >
                            View Full
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-5 prose prose-invert prose-sm max-w-none max-h-64 overflow-y-auto">
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
                        <Wand2 className="h-4 w-4 text-cyan-500" />
                        Processing Pipeline
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResultsActiveTab('nodes')}
                        className="text-muted-foreground"
                      >
                        View Details
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
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {result.content ? result.content.substring(0, 80) + '...' : result.error || 'No output'}
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
                      <FileText className="h-5 w-5 text-purple-500" />
                      Generated Script
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
                        {resultsCopied === 'script-full' ? 'Copied!' : 'Copy Script'}
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
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6 md:p-8 prose prose-invert prose-sm md:prose-base max-w-none">
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
                      <LayoutGrid className="h-5 w-5 text-pink-500" />
                      Storyboard
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
                        {resultsCopied === 'storyboard-full' ? 'Copied!' : 'Copy Storyboard'}
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
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6 md:p-8 prose prose-invert prose-sm md:prose-base max-w-none">
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
                    <Wand2 className="h-5 w-5 text-cyan-500" />
                    Node Results
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
                              ? "bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-border"
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
                                <span className="text-xs text-muted-foreground">Node #{result.node_id}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
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
                            <div className="p-5 prose prose-invert prose-sm max-w-none">
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
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-purple-500/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
                  <p className="text-muted-foreground text-sm">
                    The workflow didn't produce any output. Check your node connections and try again.
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
                Back to Canvas
              </Button>
              <div className="flex items-center gap-2">
                {(lastRunResults.final_script || lastRunResults.storyboard) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const allContent = [
                        lastRunResults.final_script ? `# Script\n\n${lastRunResults.final_script}` : '',
                        lastRunResults.storyboard ? `# Storyboard\n\n${lastRunResults.storyboard}` : '',
                        ...lastRunResults.results
                          .filter(r => r.success && r.content)
                          .map(r => `# ${nodeTypes[r.node_type]?.title || r.node_type} (Node #${r.node_id})\n\n${r.content}`)
                      ].filter(Boolean).join('\n\n---\n\n');
                      await navigator.clipboard.writeText(allContent);
                      setResultsCopied('all');
                      setTimeout(() => setResultsCopied(null), 2000);
                    }}
                  >
                    {resultsCopied === 'all' ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {resultsCopied === 'all' ? 'Copied All!' : 'Copy All'}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  onClick={() => setShowResultsView(false)}
                >
                  Continue Editing
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
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500/5 to-pink-500/5">
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
                    <span>Run #{selectedRunDetail.run_number}</span>
                    <span>·</span>
                    <span>{selectedRunDetail.node_count} nodes</span>
                    <span>·</span>
                    <span className="text-purple-400">{selectedRunDetail.credits_used} credits</span>
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
                      Error
                    </div>
                    <p className="text-sm text-red-400">{selectedRunDetail.error_message}</p>
                  </div>
                )}

                {/* Final Script */}
                {selectedRunDetail.final_script && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        Final Script
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedRunDetail.final_script);
                          toast.success('Script copied to clipboard');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-secondary/50 border border-border rounded-xl p-4 prose prose-invert prose-sm max-w-none">
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
                        <LayoutGrid className="h-4 w-4 text-pink-500" />
                        Storyboard
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedRunDetail.storyboard);
                          toast.success('Storyboard copied to clipboard');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-secondary/50 border border-border rounded-xl p-4 prose prose-invert prose-sm max-w-none">
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
                      <Wand2 className="h-4 w-4 text-cyan-500" />
                      Node Results ({selectedRunDetail.results.filter((r: any) => r.success).length}/{selectedRunDetail.results.length} successful)
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
                            <span className="text-xs text-muted-foreground">Node #{result.node_id}</span>
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
                    <p className="text-muted-foreground">No results available for this run</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRunDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </DevAccessGate>
  );
}
