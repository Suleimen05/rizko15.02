import { useState, useRef, useEffect } from 'react';
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
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChatMessage, QuickAction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

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

// SVG Icon Components for AI Models
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

const AutoIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);

// AI Models - only Gemini is active, others coming soon
const aiModels = [
  { id: 'gemini', name: 'Gemini 2.5', icon: GeminiIcon, available: true },
  { id: 'claude', name: 'Sonnet 4.5', icon: ClaudeIcon, available: false, comingSoon: true },
  { id: 'gpt4', name: 'GPT-5.1', icon: GPTIcon, available: false, comingSoon: true },
  { id: 'grok', name: 'Grok 4', icon: GrokIcon, available: false, comingSoon: true },
  { id: 'kimi', name: 'Kimi', icon: KimiIcon, available: false, comingSoon: true },
];

// Content Modes
const contentModes = [
  { id: 'script', name: 'Script', icon: '📝' },
  { id: 'ideas', name: 'Ideas', icon: '💡' },
  { id: 'analysis', name: 'Analysis', icon: '📊' },
  { id: 'improve', name: 'Improve', icon: '✏️' },
  { id: 'hook', name: 'Hook', icon: '🎯' },
];

export function AIWorkspace() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState(aiModels.find(m => m.id === 'gemini') || aiModels[0]);
  const [selectedMode, setSelectedMode] = useState(contentModes[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
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
    const currentInput = inputValue;
    setInputValue('');
    setIsStreaming(true);

    try {
      // Call backend API for Gemini
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${API_URL}/ai-scripts/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.content || 'Sorry, I could not generate a response.',
        timestamp: new Date().toISOString(),
        isStreaming: false,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error connecting to the AI. Please try again.',
        timestamp: new Date().toISOString(),
        isStreaming: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
  };

  const handlePopularPrompt = (prompt: string) => {
    setInputValue(prompt);
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
      {/* Main Chat Area - без второго sidebar */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center px-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-lg font-semibold">AI Creator</h1>
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

        {/* Input Area - Cursor Style */}
        <div className="p-4 pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-muted/30 rounded-xl border border-border/50">
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
                  placeholder="Create script, # for trends, / for templates"
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
                      onClick={() => {
                        setShowModelMenu(!showModelMenu);
                        setShowModeMenu(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <selectedModel.icon />
                      <span>{selectedModel.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {/* Model Dropdown */}
                    {showModelMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-44 bg-popover border border-border rounded-xl shadow-xl py-1 z-50">
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">
                          Models
                        </div>
                        {aiModels.map((model) => {
                          const IconComponent = model.icon;
                          const isDisabled = !model.available;
                          return (
                            <button
                              key={model.id}
                              onClick={() => {
                                if (model.available) {
                                  setSelectedModel(model);
                                  setShowModelMenu(false);
                                }
                              }}
                              disabled={isDisabled}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                isDisabled
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-accent cursor-pointer"
                              )}
                            >
                              <span className={isDisabled ? "opacity-50" : ""}>
                                <IconComponent />
                              </span>
                              <span className={cn("flex-1 text-left", isDisabled && "text-muted-foreground")}>
                                {model.name}
                              </span>
                              {model.comingSoon && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                  Soon
                                </span>
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

                  {/* Mode selector */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowModeMenu(!showModeMenu);
                        setShowModelMenu(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span>{selectedMode.icon}</span>
                      <span>{selectedMode.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {/* Mode Dropdown */}
                    {showModeMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-40 bg-popover border border-border rounded-xl shadow-xl py-1 z-50">
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50">
                          Mode
                        </div>
                        {contentModes.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setSelectedMode(mode);
                              setShowModeMenu(false);
                            }}
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

                <div className="flex items-center gap-1">
                  {/* Trend hashtag */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    disabled={isStreaming}
                    title="Add trending topic"
                  >
                    <Hash className="h-4 w-4" />
                  </Button>

                  {/* File upload */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    disabled={isStreaming}
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Voice input */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    disabled={isStreaming}
                    title="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>

                  {/* Send button */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isStreaming}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full transition-colors",
                      inputValue.trim()
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
