import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Copy,
  Download,
  Paperclip,
  ChevronDown,
  Mic,
  Hash,
  Check,
  Trash2,
  Play,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GripVertical,
  Video,
  Building2,
  Search,
  Target,
  Palette,
  Wand2,
  MessageSquare,
  FileText,
  LayoutGrid,
  Eye,
  Heart,
  Share2,
  TrendingUp,
  Loader2,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import { DevAccessGate } from '@/components/DevAccessGate';

// ============================================================================
// AI MODELS & CONTENT MODES (from AIWorkspace)
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

const GrokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <path d="M15.5 8.5L12 12l-3.5-3.5L7 10l5 5 5-5-1.5-1.5z"/>
  </svg>
);

const KimiIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#000">
    <rect x="4" y="4" width="16" height="16" rx="4" fill="#1D1D1F"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">K</text>
  </svg>
);

const aiModels = [
  { id: 'gemini', name: 'Gemini 2.5', icon: GeminiIcon, available: true },
  { id: 'claude', name: 'Sonnet 4.5', icon: ClaudeIcon, available: false, comingSoon: true },
  { id: 'gpt4', name: 'GPT-5.1', icon: GPTIcon, available: false, comingSoon: true },
  { id: 'grok', name: 'Grok 4', icon: GrokIcon, available: false, comingSoon: true },
  { id: 'kimi', name: 'Kimi', icon: KimiIcon, available: false, comingSoon: true },
];

const contentModes = [
  { id: 'script', name: 'Script', icon: '📝' },
  { id: 'ideas', name: 'Ideas', icon: '💡' },
  { id: 'analysis', name: 'Analysis', icon: '📊' },
  { id: 'improve', name: 'Improve', icon: '✏️' },
  { id: 'hook', name: 'Hook', icon: '🎯' },
];

// ============================================================================
// NODE TYPES
// ============================================================================

interface NodeType {
  type: 'input' | 'process' | 'ai' | 'output';
  icon: React.ReactNode;
  title: string;
  description: string;
  hasInput: boolean;
  hasOutput: boolean;
}

const nodeTypes: Record<string, NodeType> = {
  video: {
    type: 'input',
    icon: <Video className="h-4 w-4 text-white" />,
    title: 'Video Source',
    description: 'Saved video from platform',
    hasInput: false,
    hasOutput: true,
  },
  brand: {
    type: 'input',
    icon: <Building2 className="h-4 w-4 text-white" />,
    title: 'Brand Context',
    description: 'Brand info & guidelines',
    hasInput: false,
    hasOutput: true,
  },
  analyze: {
    type: 'process',
    icon: <Search className="h-4 w-4 text-white" />,
    title: 'Analyze Trend',
    description: 'Extract style, hooks, format',
    hasInput: true,
    hasOutput: true,
  },
  extract: {
    type: 'process',
    icon: <Target className="h-4 w-4 text-white" />,
    title: 'Extract Hooks',
    description: 'Find viral hooks & CTAs',
    hasInput: true,
    hasOutput: true,
  },
  style: {
    type: 'process',
    icon: <Palette className="h-4 w-4 text-white" />,
    title: 'Style Match',
    description: 'Match brand to trend style',
    hasInput: true,
    hasOutput: true,
  },
  generate: {
    type: 'ai',
    icon: <Wand2 className="h-4 w-4 text-white" />,
    title: 'Generate Script',
    description: 'Create video script with AI',
    hasInput: true,
    hasOutput: true,
  },
  refine: {
    type: 'ai',
    icon: <MessageSquare className="h-4 w-4 text-white" />,
    title: 'Chat Refine',
    description: 'Refine script with AI chat',
    hasInput: true,
    hasOutput: true,
  },
  script: {
    type: 'output',
    icon: <FileText className="h-4 w-4 text-white" />,
    title: 'Script Output',
    description: 'Final formatted script',
    hasInput: true,
    hasOutput: false,
  },
  storyboard: {
    type: 'output',
    icon: <LayoutGrid className="h-4 w-4 text-white" />,
    title: 'Storyboard',
    description: 'Scene-by-scene breakdown',
    hasInput: true,
    hasOutput: false,
  },
};

// ============================================================================
// WORKFLOW NODE & CONNECTION TYPES
// ============================================================================

interface WorkflowNode {
  id: number;
  type: string;
  x: number;
  y: number;
  videoData?: SavedVideo;
  outputContent?: string;
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
  'TikTok': '♪',
  'Instagram': '📷',
  'YouTube': '▶️',
  'Snapchat': '👻',
  'X': '𝕏',
  'Pinterest': '📌',
  'LinkedIn': '💼',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkflowBuilder() {
  const { user } = useAuth();

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

  // Sidebar
  const [activePanel, setActivePanel] = useState<'nodes' | 'saved'>('nodes');
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('All');

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Build your workflow by connecting nodes, then click **Run Workflow** to generate scripts. I\'ll help you refine the results! 🎬',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState(aiModels.find(m => m.id === 'gemini') || aiModels[0]);
  const [selectedMode, setSelectedMode] = useState(contentModes[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);

  // Workflow
  const [isRunning, setIsRunning] = useState(false);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, []);

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
      // Use mock data if API fails
      setSavedVideos([
        { id: 1, platform: 'TikTok', author: 'dancequeen', desc: 'Summer dance challenge', views: '2.3M', uts: 92, thumb: '' },
        { id: 2, platform: 'Instagram', author: 'foodie_chef', desc: 'Quick pasta recipe', views: '1.8M', uts: 88, thumb: '' },
        { id: 3, platform: 'YouTube', author: 'techreviewer', desc: 'iPhone unboxing', views: '5.2M', uts: 95, thumb: '' },
      ]);
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
  // CHAT FUNCTIONS (from AIWorkspace)
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsStreaming(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${API_URL}/ai-scripts/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          model: selectedModel.id,
          mode: selectedMode.id,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.content || 'Sorry, I could not generate a response.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error connecting to the AI. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  // ============================================================================
  // CANVAS PAN & ZOOM
  // ============================================================================

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Pinch to zoom
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
    } else {
      // Two-finger scroll = pan
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (draggingNode) {
      const rect = canvasAreaRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panOffset.x - draggingNode.offsetX) / zoom;
        const y = (e.clientY - rect.top - panOffset.y - draggingNode.offsetY) / zoom;

        setNodes(prev => prev.map(node =>
          node.id === draggingNode.id ? { ...node, x, y } : node
        ));
      }
    }
  }, [isPanning, panStart, draggingNode, panOffset, zoom]);

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
  };

  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  const createNode = (type: string, x: number, y: number, videoData?: SavedVideo) => {
    const newId = nodeIdCounter + 1;
    setNodeIdCounter(newId);

    const newNode: WorkflowNode = {
      id: newId,
      type,
      x,
      y,
      videoData,
    };

    setNodes(prev => [...prev, newNode]);
    return newId;
  };

  const deleteNode = (id: number) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const rect = canvasAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - panOffset.x - 100) / zoom;
    const y = (e.clientY - rect.top - panOffset.y - 50) / zoom;

    const nodeType = e.dataTransfer.getData('nodeType');
    const videoData = e.dataTransfer.getData('videoData');

    if (nodeType) {
      createNode(nodeType, x, y);
    } else if (videoData) {
      createNode('video', x, y, JSON.parse(videoData));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ============================================================================
  // CONNECTION LINES
  // ============================================================================

  const renderConnections = () => {
    return connections.map((conn, idx) => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);

      if (!fromNode || !toNode) return null;

      const fromX = fromNode.x + 200; // Right side of node
      const fromY = fromNode.y + 100;
      const toX = toNode.x;
      const toY = toNode.y + 100;

      const midX = (fromX + toX) / 2;
      const isActive = activeConnections.has(`${conn.from}-${conn.to}`);

      return (
        <path
          key={idx}
          d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
          fill="none"
          stroke={isActive ? 'hsl(var(--green-500, 142 71% 45%))' : 'hsl(var(--purple-500, 271 91% 65%))'}
          strokeWidth={2}
          opacity={isActive ? 1 : 0.6}
          className={cn(isActive && 'drop-shadow-[0_0_4px_hsl(142_71%_45%)]')}
        />
      );
    });
  };

  // ============================================================================
  // RUN WORKFLOW
  // ============================================================================

  const runWorkflow = async () => {
    if (nodes.length === 0) {
      toast.error('Add nodes to your workflow first');
      return;
    }

    setIsRunning(true);

    // Animate connections one by one
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      setActiveConnections(prev => new Set([...prev, `${conn.from}-${conn.to}`]));
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Simulate workflow execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update script output node
    setNodes(prev => prev.map(node => {
      if (node.type === 'script') {
        return {
          ...node,
          outputContent: `🎬 Generated Script\n\nHook (0-3s):\n"POV: When the trend hits different..."\n\nBuild (3-12s):\n[Dance transition with product reveal]\n\nCTA (12-15s):\n"Link in bio for the full look ✨"`
        };
      }
      return node;
    }));

    // Add chat message
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Workflow completed! I generated a script based on the trend analysis. The hook uses the popular "POV" format with high engagement rate. Want me to adjust the tone or add more CTAs?',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aiMessage]);

    setActiveConnections(new Set());
    setIsRunning(false);
    toast.success('Workflow completed!');
  };

  // ============================================================================
  // RENDER NODE
  // ============================================================================

  const renderNode = (node: WorkflowNode) => {
    const nodeDef = nodeTypes[node.type];
    if (!nodeDef) return null;

    const typeColors = {
      input: 'from-blue-500 to-cyan-500',
      process: 'from-purple-500 to-pink-500',
      ai: 'from-green-500 to-emerald-500',
      output: 'from-orange-500 to-yellow-500',
    };

    return (
      <div
        key={node.id}
        className={cn(
          "absolute w-[200px] bg-card border-2 rounded-xl cursor-move transition-all duration-200",
          selectedNode === node.id
            ? "border-purple-500 shadow-[0_0_0_3px_rgba(139,92,246,0.3)]"
            : "border-border hover:border-purple-500 hover:shadow-lg"
        )}
        style={{
          left: node.x,
          top: node.y,
          transform: `scale(${1/zoom})`,
          transformOrigin: 'top left',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setSelectedNode(node.id);
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          setDraggingNode({
            id: node.id,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
          });
        }}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 p-3 border-b border-border rounded-t-xl bg-gradient-to-r",
          typeColors[nodeDef.type]
        )}>
          <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
            {nodeDef.icon}
          </div>
          <span className="flex-1 text-xs font-semibold text-white truncate">
            {node.videoData ? `@${node.videoData.author}` : nodeDef.title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
            className="w-5 h-5 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3">
          {node.type === 'video' && node.videoData ? (
            <div className="space-y-2">
              <div className="relative aspect-[9/16] max-h-[120px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden">
                {node.videoData.thumb ? (
                  <img src={node.videoData.thumb} alt="" className="w-full h-full object-cover" />
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
          ) : node.type === 'script' && node.outputContent ? (
            <div className="bg-secondary rounded-lg p-2 text-[10px] text-muted-foreground max-h-[100px] overflow-y-auto whitespace-pre-wrap">
              {node.outputContent}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-medium text-foreground">Ready</span>
              </div>
            </div>
          )}
        </div>

        {/* Ports */}
        <div className="flex justify-between px-3 pb-2">
          {nodeDef.hasInput && (
            <div className="w-3 h-3 bg-border border-2 border-card rounded-full -ml-4 cursor-crosshair hover:bg-purple-500 hover:scale-125 transition-all" />
          )}
          {!nodeDef.hasInput && <div />}
          {nodeDef.hasOutput && (
            <div className="w-3 h-3 bg-border border-2 border-card rounded-full -mr-4 cursor-crosshair hover:bg-purple-500 hover:scale-125 transition-all" />
          )}
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

  return (
    <DevAccessGate pageName="Workflow Builder">
      <div className="flex h-full bg-background">
        {/* Left Sidebar - Nodes/Saved */}
        <div className="w-60 bg-card border-r border-border flex flex-col flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              className={cn(
                "flex-1 py-3 px-4 text-xs font-medium transition-colors",
                activePanel === 'nodes' ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setActivePanel('nodes')}
            >
              🧩 Nodes
            </button>
            <button
              className={cn(
                "flex-1 py-3 px-4 text-xs font-medium transition-colors",
                activePanel === 'saved' ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setActivePanel('saved')}
            >
              📹 Saved
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {activePanel === 'nodes' ? (
                <div className="space-y-4">
                  {/* Input Nodes */}
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-2 tracking-wide">📥 Input</div>
                    {['video', 'brand'].map(type => (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                        className="flex items-center gap-2.5 p-2.5 bg-secondary border border-border rounded-lg mb-1.5 cursor-grab hover:border-purple-500 hover:translate-x-1 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          {nodeTypes[type].icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{nodeTypes[type].title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{nodeTypes[type].description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Process Nodes */}
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-2 tracking-wide">🔄 Process</div>
                    {['analyze', 'extract', 'style'].map(type => (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                        className="flex items-center gap-2.5 p-2.5 bg-secondary border border-border rounded-lg mb-1.5 cursor-grab hover:border-purple-500 hover:translate-x-1 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          {nodeTypes[type].icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{nodeTypes[type].title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{nodeTypes[type].description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Nodes */}
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-2 tracking-wide">🤖 AI</div>
                    {['generate', 'refine'].map(type => (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                        className="flex items-center gap-2.5 p-2.5 bg-secondary border border-border rounded-lg mb-1.5 cursor-grab hover:border-purple-500 hover:translate-x-1 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                          {nodeTypes[type].icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{nodeTypes[type].title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{nodeTypes[type].description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Output Nodes */}
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-2 tracking-wide">📤 Output</div>
                    {['script', 'storyboard'].map(type => (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                        className="flex items-center gap-2.5 p-2.5 bg-secondary border border-border rounded-lg mb-1.5 cursor-grab hover:border-purple-500 hover:translate-x-1 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                          {nodeTypes[type].icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{nodeTypes[type].title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{nodeTypes[type].description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Platform Filter */}
                  <div className="flex flex-wrap gap-1">
                    {['All', 'TikTok', 'Instagram', 'YouTube'].map(platform => (
                      <button
                        key={platform}
                        className={cn(
                          "px-2 py-1 text-[10px] rounded-full border transition-colors",
                          platformFilter === platform
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border hover:border-primary"
                        )}
                        onClick={() => setPlatformFilter(platform)}
                      >
                        {platform === 'All' ? 'All' : platformIcons[platform] || platform}
                      </button>
                    ))}
                  </div>

                  {/* Videos List */}
                  {loadingSaved ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    </div>
                  ) : filteredVideos.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No saved videos</p>
                    </div>
                  ) : (
                    filteredVideos.map(video => (
                      <div
                        key={video.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('videoData', JSON.stringify(video))}
                        className="flex gap-2.5 p-2 bg-secondary border border-border rounded-lg cursor-grab hover:border-purple-500 hover:translate-x-1 transition-all"
                      >
                        <div className="w-12 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded overflow-hidden flex-shrink-0 relative">
                          {video.thumb ? (
                            <img src={video.thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                          <div className="absolute bottom-0.5 left-0.5 w-4 h-4 bg-black/70 rounded flex items-center justify-center text-[8px]">
                            {platformIcons[video.platform]}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-[9px] px-1 py-0">
                              {video.uts}
                            </Badge>
                            <span className="text-[10px] font-medium truncate">@{video.author}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate">{video.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Canvas Area */}
        <div
          ref={canvasAreaRef}
          className="flex-1 relative overflow-hidden bg-background"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Canvas with nodes */}
          <div
            ref={canvasRef}
            className={cn(
              "absolute w-[3000px] h-[3000px]",
              "bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)]",
              "[background-size:24px_24px]",
              isPanning ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
              {renderConnections()}
            </svg>

            {/* Nodes */}
            {nodes.map(renderNode)}

            {/* Empty State */}
            {nodes.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-6xl mb-4 opacity-30">🔗</div>
                <h3 className="text-lg font-semibold mb-2">Build Your Workflow</h3>
                <p className="text-muted-foreground text-sm">Drag nodes from left panel to create a script generation pipeline</p>
              </div>
            )}
          </div>

          {/* Run Workflow Button */}
          <Button
            onClick={runWorkflow}
            disabled={isRunning || nodes.length === 0}
            className={cn(
              "absolute top-5 right-5 z-50",
              isRunning
                ? "bg-gradient-to-r from-orange-500 to-yellow-500"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Workflow
              </>
            )}
          </Button>

          {/* Zoom Controls */}
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
        </div>

        {/* Right Sidebar - AI Chat */}
        <div className="w-80 bg-card border-l border-border flex flex-col flex-shrink-0">
          {/* Chat Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              AI Script Assistant
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex", message.role === 'user' ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2">
                    <div className="flex gap-1">
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

          {/* Chat Input */}
          <div className="p-3 border-t border-border">
            <div className="bg-secondary border border-border rounded-2xl overflow-hidden">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Create script, # for trends, / for templates"
                className="w-full p-3 bg-transparent resize-none focus:outline-none text-sm placeholder:text-muted-foreground"
                rows={1}
                disabled={isStreaming}
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-border/30">
                <div className="flex items-center gap-1">
                  {/* Model Selector */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowModelMenu(!showModelMenu); setShowModeMenu(false); }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <selectedModel.icon />
                      <span>{selectedModel.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {showModelMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-44 bg-popover border border-border rounded-xl shadow-xl py-1 z-50">
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">Models</div>
                        {aiModels.map((model) => {
                          const IconComponent = model.icon;
                          return (
                            <button
                              key={model.id}
                              onClick={() => { if (model.available) { setSelectedModel(model); setShowModelMenu(false); }}}
                              disabled={!model.available}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                !model.available ? "opacity-50 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
                              )}
                            >
                              <IconComponent />
                              <span className="flex-1 text-left">{model.name}</span>
                              {model.comingSoon && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Soon</span>
                              )}
                              {selectedModel.id === model.id && model.available && (
                                <Check className="h-4 w-4 text-purple-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Mode Selector */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowModeMenu(!showModeMenu); setShowModelMenu(false); }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span>{selectedMode.icon}</span>
                      <span>{selectedMode.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {showModeMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-40 bg-popover border border-border rounded-xl shadow-xl py-1 z-50">
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">Mode</div>
                        {contentModes.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => { setSelectedMode(mode); setShowModeMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                          >
                            <span>{mode.icon}</span>
                            <span className="flex-1 text-left">{mode.name}</span>
                            {selectedMode.id === mode.id && (
                              <Check className="h-4 w-4 text-purple-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                    <Hash className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isStreaming}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full transition-colors",
                      inputValue.trim() ? "bg-purple-500 text-white hover:bg-purple-600" : "text-muted-foreground"
                    )}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DevAccessGate>
  );
}
