import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Sparkles,
  FileText,
  Lightbulb,
  TrendingUp,
  Wand2,
  Copy,
  Download,
  Paperclip,
  ChevronDown,
  Mic,
  Hash,
  Link,
  Loader2,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  StopCircle,
  Coins,
  Target,
  MessageCircle,
  FolderOpen,
  ArrowLeft,
  Bookmark,
  Eye,
  Heart,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { QuickAction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// =============================================================================
// QUICK ACTIONS & MODES
// =============================================================================

const getQuickActions = (t: (key: string) => string): QuickAction[] => [
  {
    id: '1',
    title: t('quickActions.scriptGenerator.title'),
    description: t('quickActions.scriptGenerator.description'),
    icon: 'FileText',
    prompt: t('prompts.scriptGenerator'),
    category: 'script',
  },
  {
    id: '2',
    title: t('quickActions.contentIdeas.title'),
    description: t('quickActions.contentIdeas.description'),
    icon: 'Lightbulb',
    prompt: t('prompts.contentIdeas'),
    category: 'ideas',
  },
  {
    id: '3',
    title: t('quickActions.trendAnalysis.title'),
    description: t('quickActions.trendAnalysis.description'),
    icon: 'TrendingUp',
    prompt: t('prompts.trendAnalysis'),
    category: 'analysis',
  },
  {
    id: '4',
    title: t('quickActions.improveScript.title'),
    description: t('quickActions.improveScript.description'),
    icon: 'Wand2',
    prompt: t('prompts.improveScript'),
    category: 'improvement',
  },
  {
    id: '5',
    title: t('quickActions.hookCreator.title'),
    description: t('quickActions.hookCreator.description'),
    icon: 'Target',
    prompt: t('prompts.hookCreator'),
    category: 'hook',
  },
  {
    id: '6',
    title: t('quickActions.freeChat.title'),
    description: t('quickActions.freeChat.description'),
    icon: 'MessageCircle',
    prompt: t('prompts.freeChat'),
    category: 'chat',
  },
];

const getContentModes = (t: (key: string) => string) => [
  { id: 'chat', name: t('modes.chat'), icon: '\u{1F4AC}' },
  { id: 'script', name: t('modes.script'), icon: '\u{1F4DD}' },
  { id: 'ideas', name: t('modes.ideas'), icon: '\u{1F4A1}' },
  { id: 'analysis', name: t('modes.analysis'), icon: '\u{1F4CA}' },
  { id: 'improve', name: t('modes.improve'), icon: '\u{270F}\u{FE0F}' },
  { id: 'hook', name: t('modes.hook'), icon: '\u{1F3AF}' },
];

// =============================================================================
// SVG ICON COMPONENTS
// =============================================================================

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

const NanoBanaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <defs>
      <linearGradient id="nanoBanaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EA4335"/>
        <stop offset="33%" stopColor="#FBBC04"/>
        <stop offset="66%" stopColor="#34A853"/>
        <stop offset="100%" stopColor="#4285F4"/>
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#nanoBanaGrad)" opacity="0.9"/>
    <circle cx="9" cy="10" r="2.5" fill="white" opacity="0.9"/>
    <path d="M5 17l4-5 3 3.5 2-2.5 5 4H5z" fill="white" opacity="0.85"/>
  </svg>
);

// AI Models
const aiModels = [
  { id: 'gemini', name: 'Gemini 2.5', icon: GeminiIcon, available: true },
  { id: 'nano-bana', name: 'Nano Bana', icon: NanoBanaIcon, available: true, isImageGen: true },
  { id: 'claude', name: 'Claude 4', icon: ClaudeIcon, available: true },
  { id: 'gpt4', name: 'GPT-4o', icon: GPTIcon, available: true },
];

// =============================================================================
// CHAT SIDEBAR COMPONENT
// =============================================================================

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const { t } = useTranslation('aiworkspace');
  const {
    sessions,
    currentSessionId,
    selectSession,
    deleteSession,
    renameSession,
    pinSession,
    clearMessages,
  } = useChat();
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const pinnedSessions = sessions.filter((s) => s.is_pinned);
  const recentSessions = sessions.filter((s) => !s.is_pinned);

  const handleNewChat = () => {
    clearMessages();
  };

  const handleRenameStart = (sessionId: string, currentTitle: string) => {
    setRenamingId(sessionId);
    setRenameValue(currentTitle);
    setContextMenu(null);
  };

  const handleRenameSubmit = (sessionId: string) => {
    if (renameValue.trim()) {
      renameSession(sessionId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('sidebar.today');
    if (diffDays === 1) return t('sidebar.yesterday');
    if (diffDays < 7) return t('sidebar.daysAgo', { count: diffDays });
    return date.toLocaleDateString();
  };

  if (!isOpen) {
    return (
      <div className="w-12 border-r border-border bg-card/50 flex flex-col items-center py-3 gap-2">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={t('sidebar.openSidebar')}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={t('sidebar.newChat')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-card/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/50">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium flex-1 mr-2"
        >
          <Plus className="h-4 w-4" />
          {t('sidebar.newChat')}
        </button>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {/* Pinned */}
        {pinnedSessions.length > 0 && (
          <div className="px-2 pt-3">
            <div className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Pin className="h-3 w-3 inline mr-1" />
              {t('sidebar.pinned')}
            </div>
            {pinnedSessions.map((session) => (
              <SessionItem
                key={session.session_id}
                session={session}
                isActive={currentSessionId === session.session_id}
                isRenaming={renamingId === session.session_id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onSelect={selectSession}
                contextMenuOpen={contextMenu === session.session_id}
                onContextMenu={(id) => setContextMenu(contextMenu === id ? null : id)}
                onRename={handleRenameStart}
                onPin={pinSession}
                onDelete={deleteSession}
                formatDate={formatDate}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Recent */}
        {recentSessions.length > 0 && (
          <div className="px-2 pt-3">
            {pinnedSessions.length > 0 && (
              <div className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t('sidebar.recent')}
              </div>
            )}
            {recentSessions.map((session) => (
              <SessionItem
                key={session.session_id}
                session={session}
                isActive={currentSessionId === session.session_id}
                isRenaming={renamingId === session.session_id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onSelect={selectSession}
                contextMenuOpen={contextMenu === session.session_id}
                onContextMenu={(id) => setContextMenu(contextMenu === id ? null : id)}
                onRename={handleRenameStart}
                onPin={pinSession}
                onDelete={deleteSession}
                formatDate={formatDate}
                t={t}
              />
            ))}
          </div>
        )}

        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {t('sidebar.noSessions')}
          </div>
        )}
      </div>
    </div>
  );
}

// Session item subcomponent
interface SessionItemProps {
  session: { session_id: string; title: string; is_pinned: boolean; updated_at: string; message_count: number; model: string };
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onSelect: (id: string) => void;
  contextMenuOpen: boolean;
  onContextMenu: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  formatDate: (d: string) => string;
  t: (key: string) => string;
}

function SessionItem({
  session,
  isActive,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onSelect,
  contextMenuOpen,
  onContextMenu,
  onRename,
  onPin,
  onDelete,
  formatDate,
  t,
}: SessionItemProps) {
  return (
    <div className="relative group">
      <button
        onClick={() => !isRenaming && onSelect(session.session_id)}
        className={cn(
          'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5',
          isActive
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={() => onRenameSubmit(session.session_id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit(session.session_id);
              if (e.key === 'Escape') onRenameSubmit(session.session_id);
            }}
            className="w-full bg-transparent border-b border-primary focus:outline-none text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 pr-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <span className="truncate font-medium text-[13px]">{session.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 pl-9">
              <span className="text-[10px] text-muted-foreground/60">
                {formatDate(session.updated_at)}
              </span>
            </div>
          </>
        )}
      </button>

      {/* Context menu button */}
      {!isRenaming && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(session.session_id);
          }}
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity',
            contextMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'hover:bg-accent'
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Context menu dropdown */}
      {contextMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-lg shadow-xl py-1 z-50">
          <button
            onClick={() => onRename(session.session_id, session.title)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('sidebar.rename')}
          </button>
          <button
            onClick={() => {
              onPin(session.session_id, !session.is_pinned);
              onContextMenu(session.session_id);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            {session.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {session.is_pinned ? t('sidebar.unpin') : t('sidebar.pin')}
          </button>
          <button
            onClick={() => {
              onDelete(session.session_id);
              onContextMenu(session.session_id);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('sidebar.delete')}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Video context type from navigation
interface VideoContextData {
  url: string;
  description: string;
  author: string;
  cover: string;
  stats: { playCount: number; diggCount: number; commentCount: number; shareCount: number };
  uts_score: number;
  play_addr?: string;
}

interface SavedVideoItem {
  id: number;
  trend: {
    description: string;
    author_username: string;
    cover_url: string;
    stats: { playCount: number; diggCount: number; commentCount: number; shareCount: number };
    uts_score: number;
    url: string;
  };
}

export function AIWorkspace() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { t } = useTranslation('aiworkspace');
  const navigate = useNavigate();
  const location = useLocation();
  const {
    messages,
    isStreaming,
    isLoading,
    credits,
    currentModel,
    currentMode,
    sendMessage,
    stopGeneration,
    setCurrentModel,
    setCurrentMode,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkParsing, setLinkParsing] = useState(false);
  const [parsedContext, setParsedContext] = useState<string | null>(null);
  const [showHashMenu, setShowHashMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoContext, setVideoContext] = useState<VideoContextData | null>(null);
  const [showSavedPicker, setShowSavedPicker] = useState(false);
  const [savedVideos, setSavedVideos] = useState<SavedVideoItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [aiVisionEnabled, setAiVisionEnabled] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{
    content: string;
    videoContext?: VideoContextData | null;
  } | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoContextProcessed = useRef(false);

  const contentModes = getContentModes(t);
  const quickActions = getQuickActions(t);

  // Accept video context from navigation (e.g. from VideoCard "AI Analysis")
  useEffect(() => {
    const state = location.state as { videoContext?: VideoContextData } | null;
    if (state?.videoContext && !videoContextProcessed.current) {
      videoContextProcessed.current = true;
      const vc = state.videoContext;
      setVideoContext(vc);

      // Build context string from video data
      const ctx = [
        `Video by @${vc.author}`,
        vc.description,
        `Views: ${vc.stats.playCount?.toLocaleString()} | Likes: ${vc.stats.diggCount?.toLocaleString()} | Comments: ${vc.stats.commentCount?.toLocaleString()} | Shares: ${vc.stats.shareCount?.toLocaleString()}`,
        vc.uts_score > 0 ? `UTS Score: ${vc.uts_score}` : '',
        vc.url ? `URL: ${vc.url}` : '',
      ].filter(Boolean).join('\n');
      setParsedContext(ctx);

      // Clear location state to avoid re-processing on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const selectedModel = aiModels.find((m) => m.id === currentModel) || aiModels[0];
  const selectedMode = contentModes.find((m) => m.id === currentMode) || contentModes[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingMessage]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setShowModelMenu(false);
      setShowModeMenu(false);
      setShowHashMenu(false);
      setShowSavedPicker(false);
    };
    if (showModelMenu || showModeMenu || showHashMenu || showSavedPicker) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showModelMenu, showModeMenu, showHashMenu]);

  // Image helpers
  const resolveImageSrc = useCallback((src?: string) => {
    if (!src) return '';
    if (src.startsWith('/uploads')) {
      const base = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : 'http://localhost:8000';
      return `${base}${src}`;
    }
    return src;
  }, []);

  const extractImageUrls = useCallback((content: string): string[] => {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const urls: string[] = [];
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      const url = match[2];
      // Only include real generated image URLs, not broken/placeholder links
      if (url.includes('/uploads/generated/') || url.startsWith('http')) {
        urls.push(url);
      }
    }
    return urls;
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
      const a = document.createElement('a');
      a.href = imgSrc;
      a.download = `rizko-ai-${Date.now()}.png`;
      a.target = '_blank';
      a.click();
    }
  }, []);

  const openLightbox = useCallback((src: string) => {
    setLightboxImage(src);
    setLightboxZoom(1);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    setLightboxZoom(1);
  }, []);

  // Build display message that includes video card marker (rendered as visual card)
  const buildDisplayMessage = (msg: string, vc: VideoContextData | null): string => {
    if (!vc) return msg;
    const cardData = JSON.stringify({
      author: vc.author,
      description: vc.description?.substring(0, 120) || '',
      cover: vc.cover || '',
      stats: vc.stats,
      uts_score: vc.uts_score || 0,
    });
    return `<!--videocard:${cardData}-->\n${msg}`;
  };

  // Parse video card data from message content
  const parseVideoCard = (content: string): { videoData: VideoContextData | null; text: string } => {
    const match = content.match(/^<!--videocard:(.*?)-->\n?/);
    if (!match) return { videoData: null, text: content };
    try {
      const data = JSON.parse(match[1]);
      return { videoData: data, text: content.slice(match[0].length) };
    } catch {
      return { videoData: null, text: content };
    }
  };

  // Send message via ChatContext
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming || visionLoading) return;
    const msg = inputValue;
    let ctx = parsedContext || undefined;
    const currentVideoCtx = videoContext;
    const visionEnabled = aiVisionEnabled && !!videoContext?.url;

    // Clear input immediately
    setInputValue('');
    const displayMsg = buildDisplayMessage(msg, currentVideoCtx);

    if (visionEnabled && currentVideoCtx) {
      // AI Vision path: show message immediately, run vision, then send
      setPendingMessage({ content: displayMsg, videoContext: currentVideoCtx });
      setVisionLoading(true);
      setParsedContext(null);
      setVideoContext(null);
      setAiVisionEnabled(false);

      try {
        const visionResult = await apiService.analyzeVideo({
          url: currentVideoCtx.url,
          author: currentVideoCtx.author,
          views: String(currentVideoCtx.stats.playCount || 0),
          uts: currentVideoCtx.uts_score || 0,
          desc: currentVideoCtx.description,
          custom_prompt: msg,
        });

        const analysis = visionResult.analysis || visionResult.result || JSON.stringify(visionResult);
        ctx = [
          ctx || '',
          '\n--- GEMINI VISION ANALYSIS ---',
          analysis,
        ].filter(Boolean).join('\n');

        toast.success(t('chat.visionComplete', { credits: visionResult.credits_used || 3 }));
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 402) {
          toast.error(t('chat.visionNoCredits'));
        } else {
          toast.error(t('chat.visionError'));
        }
        setPendingMessage(null);
        setVisionLoading(false);
        setInputValue(msg);
        return;
      } finally {
        setVisionLoading(false);
      }

      // Vision done — now send to AI (pending message will be replaced by real one)
      setPendingMessage(null);
      await sendMessage(displayMsg, currentMode, currentModel, ctx);
    } else {
      // Normal path: send with video info in the displayed message
      setParsedContext(null);
      setVideoContext(null);
      setAiVisionEnabled(false);
      await sendMessage(displayMsg, currentMode, currentModel, ctx);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
    const modeMap: Record<string, string> = {
      script: 'script',
      ideas: 'ideas',
      analysis: 'analysis',
      improvement: 'improve',
      hook: 'hook',
      chat: 'chat',
    };
    if (modeMap[action.category]) {
      setCurrentMode(modeMap[action.category]);
    }
  };

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // --- Parse Link handler ---
  const handleParseLink = async () => {
    if (!linkUrl.trim()) return;
    setLinkParsing(true);
    try {
      const data = await apiService.parseLink(linkUrl.trim());
      const ctx = [
        `[${data.platform}] @${data.author}`,
        data.description,
        `Views: ${data.stats.views?.toLocaleString()} | Likes: ${data.stats.likes?.toLocaleString()} | Comments: ${data.stats.comments?.toLocaleString()}`,
        data.hashtags?.length ? `Tags: ${data.hashtags.map(h => '#' + h).join(' ')}` : '',
        data.music ? `Music: ${data.music}` : '',
      ].filter(Boolean).join('\n');
      setParsedContext(ctx);
      setShowLinkInput(false);
      setLinkUrl('');
      toast.success(t('chat.linkParsed'));
    } catch {
      toast.error(t('chat.linkError'));
    } finally {
      setLinkParsing(false);
    }
  };

  // --- Hashtag suggestions ---
  const trendingTags = ['fyp', 'viral', 'trending', 'comedy', 'dance', 'food', 'fitness', 'beauty', 'tech', 'motivation'];

  const handleInsertHashtag = (tag: string) => {
    setInputValue((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + '#' + tag + ' ');
    setShowHashMenu(false);
  };

  // --- Voice input ---
  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t('chat.voiceNotSupported'));
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === 'ru' ? 'ru-RU' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript);
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, t]);

  // --- Saved videos picker ---
  const loadSavedVideos = useCallback(async () => {
    if (savedVideos.length > 0) return; // already loaded
    setSavedLoading(true);
    try {
      const data = await apiService.getFavorites({ per_page: 30 });
      setSavedVideos(data.items || []);
    } catch {
      // silent fail
    } finally {
      setSavedLoading(false);
    }
  }, [savedVideos.length]);

  const handleAttachSaved = (item: any) => {
    const trend = item.trend || item;
    const vc: VideoContextData = {
      url: trend.url || '',
      description: trend.description || '',
      author: trend.author_username || '',
      cover: trend.cover_url || '',
      stats: trend.stats || { playCount: 0, diggCount: 0, commentCount: 0, shareCount: 0 },
      uts_score: trend.uts_score || 0,
    };
    setVideoContext(vc);
    const ctx = [
      `Video by @${vc.author}`,
      vc.description,
      `Views: ${(vc.stats.playCount || 0).toLocaleString()} | Likes: ${(vc.stats.diggCount || 0).toLocaleString()} | Comments: ${(vc.stats.commentCount || 0).toLocaleString()} | Shares: ${(vc.stats.shareCount || 0).toLocaleString()}`,
      vc.uts_score > 0 ? `UTS Score: ${vc.uts_score}` : '',
      vc.url ? `URL: ${vc.url}` : '',
    ].filter(Boolean).join('\n');
    setParsedContext(ctx);
    setShowSavedPicker(false);
    toast.success(t('chat.videoAttached'));
  };

  const handleClearVideoContext = () => {
    setVideoContext(null);
    setParsedContext(null);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = { FileText, Lightbulb, TrendingUp, Wand2, Target, MessageCircle };
    return icons[iconName] || FileText;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Session Sidebar */}
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-lg font-semibold">{t('title')}</h1>
            {activeProject && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">
                  {activeProject.icon && <span className="mr-1">{activeProject.icon}</span>}
                  {activeProject.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {credits && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Coins className="h-4 w-4" />
                <span>{credits.remaining}</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !isLoading && !pendingMessage ? (
            // Welcome Screen
            <div className="max-w-3xl mx-auto space-y-8 pt-12">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold">{t('welcome')}</h2>
                <p className="text-muted-foreground text-lg">
                  {t('welcomeSubtitle')}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map(action => {
                  const Icon = getIconComponent(action.icon);
                  return (
                    <Card
                      key={action.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.03] hover:border-purple-500/50"
                      onClick={() => handleQuickAction(action)}
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm mb-0.5">{action.title}</h3>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

            </div>
          ) : isLoading && messages.length === 0 && !pendingMessage ? (
            // Loading state
            <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            // Chat Messages
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => {
                const { videoData, text: msgText } = message.role === 'user'
                  ? parseVideoCard(message.content)
                  : { videoData: null, text: message.content };
                return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-accent'
                    )}
                  >
                    {/* Video card inside user message */}
                    {videoData && message.role === 'user' && (
                      <div className="mb-2.5 rounded-xl overflow-hidden bg-white/10 border border-white/15">
                        <div className="flex gap-3 p-2.5">
                          {videoData.cover && (
                            <img
                              src={videoData.cover}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-white">@{videoData.author}</span>
                              {videoData.uts_score > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white/90 font-medium">
                                  UTS {videoData.uts_score.toFixed(0)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/70 line-clamp-2 mb-1.5">
                              {videoData.description}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-white/50">
                              <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{formatNumber(videoData.stats.playCount)}</span>
                              <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{formatNumber(videoData.stats.diggCount)}</span>
                              <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{formatNumber(videoData.stats.commentCount)}</span>
                              <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{formatNumber(videoData.stats.shareCount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none [&_img]:rounded-lg [&_img]:max-h-[512px] [&_img]:cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG') {
                          const src = (target as HTMLImageElement).src;
                          openLightbox(src);
                        }
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt, ...props }) => {
                            // Only render images with valid generated URLs
                            if (!src || (!src.includes('/uploads/generated/') && !src.startsWith('http'))) {
                              return null;
                            }
                            const resolvedSrc = resolveImageSrc(src);
                            return (
                              <img
                                src={resolvedSrc}
                                alt={alt || ''}
                                className="rounded-lg max-w-full cursor-pointer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                {...props}
                              />
                            );
                          },
                        }}
                      >
                        {message.role === 'user' ? msgText : message.content}
                      </ReactMarkdown>
                    </div>
                    {/* Action buttons for assistant messages */}
                    {message.role === 'assistant' && (() => {
                      const imageUrls = extractImageUrls(message.content);
                      return (
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => handleCopy(message.content)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {t('chat.copy')}
                          </Button>
                          {imageUrls.length > 0 && imageUrls.map((imgUrl, idx) => {
                            const imgSrc = resolveImageSrc(imgUrl);
                            return (
                              <div key={idx} className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => openLightbox(imgSrc)}
                                >
                                  <ZoomIn className="h-3.5 w-3.5 mr-1" />
                                  {t('chat.expand')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => handleDownloadImage(imgSrc)}
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" />
                                  {t('chat.download')}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                );
              })}
              {/* Pending message (shown immediately while AI Vision is processing) */}
              {pendingMessage && (() => {
                const { videoData: pendingVideoData, text: pendingText } = parseVideoCard(pendingMessage.content);
                return (
                  <>
                    {/* User message */}
                    <div className="flex gap-4 justify-end">
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-600 text-white">
                        {/* Video card in pending message */}
                        {pendingVideoData && (
                          <div className="mb-2.5 rounded-xl overflow-hidden bg-white/10 border border-white/15">
                            <div className="flex gap-3 p-2.5">
                              {pendingVideoData.cover && (
                                <img
                                  src={pendingVideoData.cover}
                                  alt=""
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-semibold text-white">@{pendingVideoData.author}</span>
                                  {pendingVideoData.uts_score > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white/90 font-medium">
                                      UTS {pendingVideoData.uts_score.toFixed(0)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-white/70 line-clamp-2 mb-1.5">
                                  {pendingVideoData.description}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-white/50">
                                  <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{formatNumber(pendingVideoData.stats.playCount)}</span>
                                  <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{formatNumber(pendingVideoData.stats.diggCount)}</span>
                                  <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{formatNumber(pendingVideoData.stats.commentCount)}</span>
                                  <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{formatNumber(pendingVideoData.stats.shareCount)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {pendingText}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    {/* Vision analyzing indicator */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-accent rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                          <span>{t('chat.visionAnalyzing')}</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
              {isStreaming && !pendingMessage && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-accent rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-muted/30 rounded-xl border border-border/50">
              {/* Video context card (rich) */}
              {videoContext && parsedContext && (
                <div className="px-4 pt-3 pb-1 space-y-2">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    {/* Thumbnail */}
                    {videoContext.cover && (
                      <img
                        src={videoContext.cover}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">@{videoContext.author}</span>
                        {videoContext.uts_score > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 font-medium">
                            UTS {videoContext.uts_score.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mb-1">
                        {videoContext.description}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatNumber(videoContext.stats.playCount)}</span>
                        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{formatNumber(videoContext.stats.diggCount)}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{formatNumber(videoContext.stats.commentCount)}</span>
                        <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" />{formatNumber(videoContext.stats.shareCount)}</span>
                      </div>
                    </div>
                    <button onClick={handleClearVideoContext} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* AI Vision toggle */}
                  {videoContext.url && (
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAiVisionEnabled(!aiVisionEnabled)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            aiVisionEnabled ? "bg-purple-500" : "bg-muted-foreground/30"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                              aiVisionEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
                            )}
                          />
                        </button>
                        <span className="text-xs font-medium text-foreground">
                          AI Vision
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t('chat.visionDesc')}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        aiVisionEnabled
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {aiVisionEnabled ? t('chat.visionCredits') : t('chat.textCredits')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Parsed link context badge (simple, for link-parsed context without full video data) */}
              {parsedContext && !videoContext && (
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                    <Link className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{parsedContext.split('\n')[0]}</span>
                    <button onClick={() => setParsedContext(null)} className="hover:text-blue-300">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Link input popover */}
              {showLinkInput && (
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleParseLink();
                        if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
                      }}
                      placeholder={t('chat.pasteLinkPlaceholder')}
                      className="flex-1 bg-accent/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-foreground placeholder:text-muted-foreground"
                      autoFocus
                      disabled={linkParsing}
                    />
                    <Button
                      size="sm"
                      onClick={handleParseLink}
                      disabled={!linkUrl.trim() || linkParsing}
                      className="h-8 px-3"
                    >
                      {linkParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Input row */}
              <div className="px-4 py-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={t('chat.placeholder')}
                  className="w-full bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground text-sm"
                  rows={1}
                  disabled={isStreaming}
                  style={{ height: 'auto', minHeight: '24px', maxHeight: '200px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                  }}
                />
              </div>

              {/* Bottom row - Controls */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/30">
                <div className="flex items-center gap-1">
                  {/* AI Model selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModelMenu(!showModelMenu);
                        setShowModeMenu(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <selectedModel.icon />
                      <span>{selectedModel.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {showModelMenu && (
                      <div
                        className="absolute bottom-full left-0 mb-2 w-44 bg-popover border border-border rounded-xl shadow-xl py-1 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">
                          {t('chat.models')}
                        </div>
                        {aiModels.map((model) => {
                          const IconComponent = model.icon;
                          return (
                            <button
                              key={model.id}
                              onClick={() => {
                                setCurrentModel(model.id);
                                setShowModelMenu(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                            >
                              <IconComponent />
                              <span className="flex-1 text-left">{model.name}</span>
                              {model.isImageGen && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded text-pink-400 font-medium">
                                  {t('chat.imageGen')}
                                </span>
                              )}
                              {currentModel === model.id && (
                                <Check className="h-4 w-4 text-purple-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Mode selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModeMenu(!showModeMenu);
                        setShowModelMenu(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span>{selectedMode.icon}</span>
                      <span>{selectedMode.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {showModeMenu && (
                      <div
                        className="absolute bottom-full left-0 mb-2 w-40 bg-popover border border-border rounded-xl shadow-xl py-1 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">
                          {t('chat.mode')}
                        </div>
                        {contentModes.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setCurrentMode(mode.id);
                              setShowModeMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                          >
                            <span>{mode.icon}</span>
                            <span className="flex-1 text-left">{mode.name}</span>
                            {currentMode === mode.id && (
                              <Check className="h-4 w-4 text-purple-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Attach link */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      showLinkInput && "bg-purple-500/10 text-purple-400"
                    )}
                    disabled={isStreaming}
                    onClick={() => { setShowLinkInput(!showLinkInput); setShowHashMenu(false); }}
                    title={t('chat.attachFile')}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Trend hashtag */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        showHashMenu && "bg-purple-500/10 text-purple-400"
                      )}
                      disabled={isStreaming}
                      onClick={(e) => { e.stopPropagation(); setShowHashMenu(!showHashMenu); setShowLinkInput(false); }}
                      title={t('chat.addTrend')}
                    >
                      <Hash className="h-4 w-4" />
                    </Button>

                    {showHashMenu && (
                      <div
                        className="absolute bottom-full right-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">
                          {t('chat.addTrend')}
                        </div>
                        {trendingTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleInsertHashtag(tag)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                          >
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span>{tag}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Saved videos picker */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        showSavedPicker && "bg-purple-500/10 text-purple-400"
                      )}
                      disabled={isStreaming}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !showSavedPicker;
                        setShowSavedPicker(next);
                        setShowHashMenu(false);
                        setShowLinkInput(false);
                        if (next) loadSavedVideos();
                      }}
                      title={t('chat.savedVideos')}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>

                    {showSavedPicker && (
                      <div
                        className="absolute bottom-full right-0 mb-2 w-72 max-h-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/50 flex items-center gap-2">
                          <Bookmark className="h-3.5 w-3.5" />
                          {t('chat.savedVideosTitle')}
                        </div>
                        <div className="overflow-y-auto max-h-64">
                          {savedLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : savedVideos.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                              {t('chat.noSavedVideos')}
                            </div>
                          ) : (
                            savedVideos.map((item: any) => {
                              const trend = item.trend || item;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleAttachSaved(item)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"
                                >
                                  {trend.cover_url && (
                                    <img
                                      src={trend.cover_url}
                                      alt=""
                                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      @{trend.author_username || 'unknown'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {trend.description || t('chat.noDescription')}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mt-0.5">
                                      <span className="flex items-center gap-0.5">
                                        <Eye className="h-2.5 w-2.5" />
                                        {formatNumber(trend.stats?.playCount || 0)}
                                      </span>
                                      <span className="flex items-center gap-0.5">
                                        <Heart className="h-2.5 w-2.5" />
                                        {formatNumber(trend.stats?.diggCount || 0)}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Voice input */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full transition-colors",
                      isRecording
                        ? "bg-red-500/20 text-red-500 animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    disabled={isStreaming}
                    onClick={toggleVoiceInput}
                    title={t('chat.voiceInput')}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>

                  {/* Stop / Send */}
                  {isStreaming ? (
                    <Button
                      onClick={stopGeneration}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      title={t('chat.stop')}
                    >
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : visionLoading ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-400"
                      disabled
                      title={t('chat.visionAnalyzing')}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full transition-colors",
                        inputValue.trim()
                          ? "bg-purple-500 text-white hover:bg-purple-600"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                      title={t('chat.sendMessage')}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
            <div className="text-white/60 text-sm">
              {Math.round(lightboxZoom * 100)}%
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.max(0.25, z - 0.25)); }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={t('chat.zoomOut')}
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.min(4, z + 0.25)); }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={t('chat.zoomIn')}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxZoom(1); }}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              >
                1:1
              </button>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadImage(lightboxImage); }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={t('chat.download')}
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={closeLightbox}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className="overflow-auto max-h-[calc(100vh-80px)] max-w-[calc(100vw-40px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Generated image"
              className="transition-transform duration-200"
              style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
