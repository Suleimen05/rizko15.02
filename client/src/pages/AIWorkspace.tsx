import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  FileText,
  Lightbulb,
  TrendingUp,
  Wand2,
  Star,
  Copy,
  Download,
  Settings,
  Mic,
  Paperclip,
  ChevronDown,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatConversation, QuickAction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Mock data
const mockConversations: ChatConversation[] = [
  {
    id: '1',
    title: 'TikTok Script Ideas',
    messages: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    model: 'claude',
  },
  {
    id: '2',
    title: 'Instagram Reels Strategy',
    messages: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    model: 'gemini',
  },
];

const quickActions: QuickAction[] = [
  {
    id: '1',
    title: 'Script Generator',
    description: 'Create viral video script',
    icon: 'FileText',
    prompt: 'Create a viral TikTok script about ',
    category: 'script',
  },
  {
    id: '2',
    title: 'Content Ideas',
    description: 'Get 10 video ideas',
    icon: 'Lightbulb',
    prompt: 'Generate 10 viral content ideas for ',
    category: 'ideas',
  },
  {
    id: '3',
    title: 'Trend Analysis',
    description: 'Analyze trending topic',
    icon: 'TrendingUp',
    prompt: 'Analyze the current trends in ',
    category: 'analysis',
  },
  {
    id: '4',
    title: 'Improve Script',
    description: 'Make your script better',
    icon: 'Wand2',
    prompt: 'Improve this script and make it more viral: ',
    category: 'improvement',
  },
];

const popularPrompts = [
  'Create TikTok script about productivity hacks',
  'Analyze @garyvee\'s content strategy',
  'Generate 10 video ideas for fitness niche',
  'Write Instagram Reels hook for beauty product',
  'Improve my script\'s engagement',
];

export function AIWorkspace() {
  const { user } = useAuth();
  const [conversations] = useState<ChatConversation[]>(mockConversations);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel] = useState<'claude' | 'gemini'>('claude');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setInputValue('');
    setIsStreaming(true);

    // Simulate AI response with streaming
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Отличный вопрос! Вот что я могу предложить по теме "${inputValue}":\n\n1. **Hook (первые 3 секунды)**\n"Стоп! Вот что изменит ваш подход к созданию контента..."\n\n2. **Body (основная часть)**\n- Начните с проблемы, которую знает каждый\n- Покажите распространённую ошибку\n- Раскройте простой трюк, который работает\n- Продемонстрируйте результаты\n\n3. **Call to Action**\n"Попробуйте это в течение 7 дней и поделитесь результатами!"\n\n**Pro Tips:**\n- Используйте трендовый звук\n- Добавьте субтитры\n- Постите в пиковые часы\n\nХотите чтобы я развил какой-то из этих пунктов?`,
        timestamp: new Date().toISOString(),
        isStreaming: false,
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsStreaming(false);
    }, 1500);
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
  };

  const handlePopularPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      FileText,
      Lightbulb,
      TrendingUp,
      Wand2,
    };
    return icons[iconName] || FileText;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-border">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Today */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Today</h3>
            <div className="space-y-1">
              {conversations.filter(c => {
                const diff = Date.now() - new Date(c.updatedAt).getTime();
                return diff < 24 * 60 * 60 * 1000;
              }).map(conv => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    setMessages(conv.messages);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    "hover:bg-accent",
                    activeConversation?.id === conv.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Yesterday */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Yesterday</h3>
            <div className="space-y-1">
              {conversations.filter(c => {
                const diff = Date.now() - new Date(c.updatedAt).getTime();
                return diff >= 24 * 60 * 60 * 1000 && diff < 48 * 60 * 60 * 1000;
              }).map(conv => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    setMessages(conv.messages);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    "hover:bg-accent",
                    activeConversation?.id === conv.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Saved */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 flex items-center gap-1">
              <Star className="h-3 w-3" />
              Saved
            </h3>
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">Viral Hook Templates</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* User Info & Credits */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              Credits
            </span>
            <span className="font-semibold">{user?.credits || 150}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2">
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">AI Workspace</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="max-w-3xl mx-auto space-y-8 pt-12">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold">What would you like to create?</h2>
                <p className="text-muted-foreground text-lg">
                  Choose a quick action or start typing your own prompt
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map(action => {
                  const Icon = getIconComponent(action.icon);
                  return (
                    <Card
                      key={action.id}
                      className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:border-blue-500"
                      onClick={() => handleQuickAction(action)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{action.title}</h3>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Popular Prompts */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Popular Prompts</h3>
                <div className="space-y-2">
                  {popularPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePopularPrompt(prompt)}
                      className="w-full text-left px-4 py-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors text-sm"
                    >
                      • {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Chat Messages
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
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
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button variant="ghost" size="sm" className="h-8">
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8">
                          <Download className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && (
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
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                className="w-full px-4 py-3 pr-24 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={isStreaming}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isStreaming}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isStreaming}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isStreaming}
                  className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{selectedModel === 'claude' ? 'Claude Sonnet 4.5' : 'Gemini Pro'}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                <span>•</span>
                <span>-5 credits per message</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Attach Trend
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
