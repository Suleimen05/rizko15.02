/**
 * Chat Sessions Context
 * Manages AI chat sessions across components.
 * All sessions are stored in the database and tied to user accounts.
 *
 * REWRITTEN to use apiService (axios + auto-refresh) instead of raw fetch().
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useProject } from './ProjectContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';

// =============================================================================
// TYPES
// =============================================================================

interface ChatSession {
  id: number;
  session_id: string;
  title: string;
  model: string;
  mode: string;
  message_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CreditsInfo {
  remaining: number;
  cost: number;
  monthly_limit: number;
  tier: string;
  model_costs?: Record<string, number>;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  credits: CreditsInfo | null;
  currentModel: string;
  currentMode: string;
  loadSessions: () => Promise<void>;
  createSession: (title?: string, model?: string) => Promise<string | null>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  pinSession: (sessionId: string, pinned: boolean) => Promise<void>;
  sendMessage: (message: string, mode?: string, model?: string, context?: string) => Promise<void>;
  stopGeneration: () => void;
  loadCredits: () => Promise<void>;
  setCurrentSessionId: (id: string | null) => void;
  setCurrentModel: (model: string) => void;
  setCurrentMode: (mode: string) => void;
  clearMessages: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function ChatProvider({ children }: { children: ReactNode }) {
  const { tokens, isAuthenticated } = useAuth();
  const { activeProject } = useProject();
  const token = tokens?.accessToken;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [currentModel, setCurrentModel] = useState('gemini');
  const [currentMode, setCurrentMode] = useState('chat');

  // Track previous auth state to detect login/logout
  const prevAuthRef = useRef<boolean>(false);
  // AbortController for cancelling AI generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // Load all sessions from database
  // ---------------------------------------------------------------------------
  const loadSessions = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await apiService.getChatSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error(i18n.t('toasts:chat.loadSessionsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // ---------------------------------------------------------------------------
  // Load credit info
  // ---------------------------------------------------------------------------
  const loadCredits = useCallback(async () => {
    if (!token) return;

    try {
      const data = await apiService.getChatCredits();
      setCredits({
        remaining: data.credits,
        cost: 0,
        monthly_limit: data.monthly_limit,
        tier: data.tier,
        model_costs: data.model_costs,
      });
    } catch (error) {
      console.error('Failed to load credits:', error);
      toast.error(i18n.t('toasts:chat.loadCreditsFailed'));
    }
  }, [token]);

  // ---------------------------------------------------------------------------
  // Create new session
  // ---------------------------------------------------------------------------
  const createSession = useCallback(
    async (title?: string, model?: string): Promise<string | null> => {
      if (!token) return null;

      try {
        const session = await apiService.createChatSession({
          title: title || 'New Chat',
          model: model || 'gemini',
          mode: 'script',
        });

        setSessions((prev) => [session, ...prev]);
        setCurrentSessionId(session.session_id);
        setMessages([]);
        return session.session_id;
      } catch (error) {
        console.error('Failed to create session:', error);
        toast.error(i18n.t('toasts:chat.createSessionFailed'));
        return null;
      }
    },
    [token]
  );

  // ---------------------------------------------------------------------------
  // Select session & load messages
  // ---------------------------------------------------------------------------
  const selectSession = useCallback(
    async (sessionId: string) => {
      if (!token) return;

      setCurrentSessionId(sessionId);
      setIsLoading(true);

      // Restore model/mode from session metadata
      const session = sessions.find((s) => s.session_id === sessionId);
      if (session) {
        if (session.model) setCurrentModel(session.model);
        if (session.mode) setCurrentMode(session.mode);
      }

      try {
        const data = await apiService.getChatMessages(sessionId);
        setMessages(
          data.map((msg: any) => ({
            id: msg.id.toString(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
          }))
        );
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error(i18n.t('toasts:chat.loadMessagesFailed'));
      } finally {
        setIsLoading(false);
      }
    },
    [token, sessions]
  );

  // ---------------------------------------------------------------------------
  // Delete session
  // ---------------------------------------------------------------------------
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!token) return;

      // Optimistic delete: remove from UI immediately
      const deletedSession = sessions.find((s) => s.session_id === sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }

      // Delete from backend in background
      try {
        await apiService.deleteChatSession(sessionId);
      } catch (error) {
        console.error('Failed to delete session:', error);
        // Restore session on failure
        if (deletedSession) {
          setSessions((prev) => [deletedSession, ...prev]);
        }
        toast.error(i18n.t('toasts:chat.deleteSessionFailed'));
      }
    },
    [token, currentSessionId, sessions]
  );

  // ---------------------------------------------------------------------------
  // Rename session
  // ---------------------------------------------------------------------------
  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      if (!token) return;

      // Optimistic update
      const prev = sessions.find((s) => s.session_id === sessionId);
      setSessions((list) =>
        list.map((s) => (s.session_id === sessionId ? { ...s, title } : s))
      );

      try {
        await apiService.updateChatSession(sessionId, { title });
      } catch (error) {
        console.error('Failed to rename session:', error);
        // Revert
        if (prev) {
          setSessions((list) =>
            list.map((s) =>
              s.session_id === sessionId ? { ...s, title: prev.title } : s
            )
          );
        }
        toast.error(i18n.t('toasts:chat.renameSessionFailed'));
      }
    },
    [token, sessions]
  );

  // ---------------------------------------------------------------------------
  // Pin / unpin session
  // ---------------------------------------------------------------------------
  const pinSession = useCallback(
    async (sessionId: string, pinned: boolean) => {
      if (!token) return;

      // Optimistic update
      setSessions((list) =>
        list.map((s) => (s.session_id === sessionId ? { ...s, is_pinned: pinned } : s))
      );

      try {
        await apiService.updateChatSession(sessionId, { is_pinned: pinned });
      } catch (error) {
        console.error('Failed to pin session:', error);
        // Revert
        setSessions((list) =>
          list.map((s) => (s.session_id === sessionId ? { ...s, is_pinned: !pinned } : s))
        );
      }
    },
    [token]
  );

  // ---------------------------------------------------------------------------
  // Send message — auto-creates session if needed
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (message: string, mode?: string, model?: string, context?: string) => {
      if (!token || isStreaming) return;

      let sessionId = currentSessionId;

      // Auto-create session if none exists
      if (!sessionId) {
        try {
          const session = await apiService.createChatSession({
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            model: model || 'gemini',
            mode: mode || 'script',
          });

          setSessions((prev) => [session, ...prev]);
          setCurrentSessionId(session.session_id);
          sessionId = session.session_id;
        } catch (error) {
          console.error('Failed to auto-create session:', error);
          toast.error(i18n.t('toasts:chat.createChatFailed'));
          return;
        }
      }

      // Add user message immediately for UI responsiveness
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      try {
        // Create AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const data = await apiService.sendChatMessage(sessionId!, {
          message,
          mode,
          model,
          language: i18n.language === 'ru' ? 'Russian' : 'English',
          ...(activeProject?.id && { project_id: activeProject.id }),
          ...(context && { context }),
        }, controller.signal);

        // Update user message with real ID from database
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id
              ? { ...m, id: data.user_message.id.toString() }
              : m
          )
        );

        // Add AI response
        const aiMessage: ChatMessage = {
          id: data.ai_response.id.toString(),
          role: 'assistant',
          content: data.ai_response.content,
          timestamp: data.ai_response.created_at,
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Update credits from response
        if (data.credits) {
          setCredits((prev) => ({
            ...prev,
            remaining: data.credits.remaining,
            cost: data.credits.cost,
            monthly_limit: data.credits.monthly_limit,
            tier: data.credits.tier,
            model_costs: prev?.model_costs,
          }));
        }

        // Update session in list
        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === sessionId
              ? {
                  ...s,
                  message_count: data.session.message_count,
                  title: data.session.title,
                  updated_at: data.session.updated_at,
                  last_message: data.ai_response.content.substring(0, 100),
                }
              : s
          )
        );
      } catch (error: any) {
        // Handle abort/cancel
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError') {
          // User cancelled — just stop, don't show error
          return;
        }

        // Handle 402 Insufficient Credits
        if (error?.response?.status === 402) {
          const errorMsg =
            error.response?.data?.detail?.message ||
            'Недостаточно кредитов. Перейдите на более высокий план.';
          // Remove the optimistic user message
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: errorMsg,
              timestamp: new Date().toISOString(),
            },
          ]);
          toast.error(i18n.t('toasts:chat.insufficientCredits'));
          return;
        }

        console.error('Failed to send message:', error);
        toast.error(i18n.t('toasts:chat.sendMessageFailed'));
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Произошла ошибка. Попробуйте ещё раз.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [token, currentSessionId, isStreaming, activeProject]
  );

  // ---------------------------------------------------------------------------
  // Stop generation
  // ---------------------------------------------------------------------------
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Clear messages
  // ---------------------------------------------------------------------------
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Auth state change effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    const nowAuthenticated = isAuthenticated && !!token;

    // User just logged out
    if (wasAuthenticated && !nowAuthenticated) {
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setCredits(null);
    }

    // User just logged in
    if (!wasAuthenticated && nowAuthenticated) {
      loadSessions();
      loadCredits();
    }

    prevAuthRef.current = nowAuthenticated;
  }, [isAuthenticated, token, loadSessions, loadCredits]);

  // Initial load if already authenticated
  useEffect(() => {
    if (token && sessions.length === 0) {
      loadSessions();
      loadCredits();
    }
  }, [token, sessions.length, loadSessions, loadCredits]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentSessionId,
        messages,
        isLoading,
        isStreaming,
        credits,
        currentModel,
        currentMode,
        loadSessions,
        createSession,
        selectSession,
        deleteSession,
        renameSession,
        pinSession,
        sendMessage,
        stopGeneration,
        loadCredits,
        setCurrentSessionId,
        setCurrentModel,
        setCurrentMode,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
