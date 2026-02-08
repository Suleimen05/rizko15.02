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
import { apiService } from '@/services/api';
import { toast } from 'sonner';

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
  loadSessions: () => Promise<void>;
  createSession: (title?: string, model?: string) => Promise<string | null>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  sendMessage: (message: string, mode?: string, model?: string) => Promise<void>;
  loadCredits: () => Promise<void>;
  setCurrentSessionId: (id: string | null) => void;
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
  const token = tokens?.accessToken;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);

  // Track previous auth state to detect login/logout
  const prevAuthRef = useRef<boolean>(false);

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
      toast.error('Не удалось загрузить чат-сессии');
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
      toast.error('Не удалось загрузить информацию о кредитах');
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
        toast.error('Не удалось создать сессию');
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
        toast.error('Не удалось загрузить сообщения');
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // ---------------------------------------------------------------------------
  // Delete session
  // ---------------------------------------------------------------------------
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!token) return;

      try {
        await apiService.deleteChatSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        toast.success('Сессия удалена');
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
        toast.error('Не удалось удалить сессию');
      }
    },
    [token, currentSessionId]
  );

  // ---------------------------------------------------------------------------
  // Send message — auto-creates session if needed
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (message: string, mode?: string, model?: string) => {
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
          toast.error('Не удалось создать сессию чата');
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
        const data = await apiService.sendChatMessage(sessionId!, {
          message,
          mode,
          model,
        });

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
          toast.error('Недостаточно кредитов');
          return;
        }

        console.error('Failed to send message:', error);
        toast.error('Ошибка при отправке сообщения');
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
    [token, currentSessionId, isStreaming]
  );

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
        loadSessions,
        createSession,
        selectSession,
        deleteSession,
        sendMessage,
        loadCredits,
        setCurrentSessionId,
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
