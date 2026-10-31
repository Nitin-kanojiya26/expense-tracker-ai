import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../api/api';
import { cn } from '../lib/utils';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Bot, Send, Loader2, Sparkles, Clock, Trash2 } from 'lucide-react';

const suggestedQuestions = [
  'How much did I spend on food?',
  'What was my biggest expense?',
  'How much on transportation?',
  'How many times did I eat out?',
  'What is my average daily spending?',
  'Which category has the highest spending?',
];

// Helper to format AI responses: parses bold markdown (**bold**) cleanly and safely
const formatAiMessage = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export default function AIQuery() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // ⏱️ Shared lockout clock
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const getGlobalCooldown = () => {
    const expiry = localStorage.getItem('ai_global_cooldown_expiry');
    if (!expiry) return 0;
    const remaining = Math.ceil((parseInt(expiry, 10) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  useEffect(() => {
    if (user?.id) {
      const cachedChat = sessionStorage.getItem(`ai_chat_history_${user.id}`);
      if (cachedChat) {
        try {
          setMessages(JSON.parse(cachedChat));
        } catch (e) {
          console.error("Failed to re-parse cached session layout maps", e);
        }
      }
    }
  }, [user?.id]);

  useEffect(() => {
    setCooldown(getGlobalCooldown());

    const timer = setInterval(() => {
      setCooldown(getGlobalCooldown());
    }, 1000);

    const syncCooldown = () => setCooldown(getGlobalCooldown());
    window.addEventListener('ai-cooldown-sync', syncCooldown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('ai-cooldown-sync', syncCooldown);
    };
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth');
  }, [messages, isLoading]);

  const triggerCooldown = () => {
    const expiryTime = Date.now() + 60000;
    localStorage.setItem('ai_global_cooldown_expiry', expiryTime.toString());
    setCooldown(60);
    window.dispatchEvent(new Event('ai-cooldown-sync'));
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    if (user?.id) {
      sessionStorage.removeItem(`ai_chat_history_${user.id}`);
    }
    toast.success('Chat cleared');
  };

  const sendMessage = async (question) => {
    if (cooldown > 0) return; 
    const text = (question || input).trim();
    if (!text) return;

    const userMessage = { id: Date.now(), type: 'user', text };
    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    
    if (user?.id) {
      sessionStorage.setItem(`ai_chat_history_${user.id}`, JSON.stringify(updatedMessagesWithUser));
    }
    
    setInput('');
    setIsLoading(true);

    try {
      const response = await askAI(user.id, text);
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: typeof response === 'string' ? response : response.answer || response.message || JSON.stringify(response),
      };
      
      const finalHistory = [...updatedMessagesWithUser, aiMessage];
      setMessages(finalHistory);

      if (user?.id) {
        sessionStorage.setItem(`ai_chat_history_${user.id}`, JSON.stringify(finalHistory));
      }
      triggerCooldown();
    } catch (error) {
      toast.error(error?.message || 'Could not get an answer from the AI assistant. Please try again.');
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: 'Sorry, I encountered an error while analyzing your data. Please try again in a moment.',
        isError: true,
      };
      
      const finalHistoryWithError = [...updatedMessagesWithUser, errorMessage];
      setMessages(finalHistoryWithError);
      
      if (user?.id) {
        sessionStorage.setItem(`ai_chat_history_${user.id}`, JSON.stringify(finalHistoryWithError));
      }
      triggerCooldown();
    } finally {
      setIsLoading(false);
      // Re-focus input on non-touch devices
      if (window.matchMedia('(pointer: fine)').matches) {
        inputRef.current?.focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleSuggestionClick = (question) => {
    sendMessage(question);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col min-h-0 min-w-0 max-w-full overflow-hidden animate-fade-in text-foreground">
      <Toaster position="top-right" richColors />

      {/* Main Chat Card: Takes full responsive container height and prevents horizontal expansion */}
      <Card className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full rounded-2xl border-border/70 shadow-xs overflow-hidden bg-card">
        
        {/* Compact, Clean Chat Header */}
        <CardHeader className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-border/50 bg-muted/10 shrink-0 w-full max-w-full min-w-0">
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-primary" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-card" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm sm:text-base font-bold truncate">SpentAI Assistant</CardTitle>
                </div>
                <CardDescription className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Ask questions about your transactions & trends
                </CardDescription>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {cooldown > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>{cooldown}s</span>
                </div>
              )}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Scrollable Messages Container with native smooth momentum scrolling and strict width bounding */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-5 space-y-3.5 sm:space-y-4 w-full max-w-full min-w-0"
        >
          {messages.length === 0 ? (
            /* Empty State: Designed to fit cleanly without overflowing small mobile viewports */
            <div className="h-full flex flex-col items-center justify-center text-center p-3 sm:p-6 my-auto w-full max-w-full min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 text-primary shrink-0">
                <Sparkles className="h-6 w-6 sm:h-8 sm:s-8" />
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-1.5 px-2">Ask Anything About Your Spending</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-sm px-2 leading-relaxed">
                I can summarize your category budgets, identify top expenses, and reveal financial habits.
              </p>

              {/* Suggestions Grid */}
              <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    disabled={isLoading || cooldown > 0}
                    onClick={() => handleSuggestionClick(question)}
                    className="h-auto py-2.5 px-3 rounded-xl border-border/70 text-xs font-medium text-left justify-start gap-2 hover:bg-muted/50 active:scale-[0.98] transition-transform w-full min-w-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{question}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2 sm:gap-2.5 items-end w-full max-w-full min-w-0',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* AI Avatar */}
                  {message.type === 'ai' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mb-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  {/* Message Bubble: strictly bounded width and word-break to never overflow on mobile */}
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm shadow-xs leading-relaxed min-w-0',
                      message.type === 'user'
                        ? 'max-w-[85%] sm:max-w-[75%] bg-primary text-primary-foreground rounded-br-xs font-medium'
                        : message.isError
                        ? 'max-w-[88%] sm:max-w-[80%] bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-xs'
                        : 'max-w-[88%] sm:max-w-[80%] bg-muted/60 text-foreground border border-border/40 rounded-bl-xs'
                    )}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <div className="w-full max-w-full min-w-0 break-words whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {formatAiMessage(message.text)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex gap-2 sm:gap-2.5 items-end justify-start w-full max-w-full min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-bl-xs px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} className="h-1" />
            </>
          )}
        </div>

        {/* Horizontal Swipeable Suggestions Bar (when chat is active) - strictly contained */}
        {messages.length > 0 && !isLoading && (
          <div className="w-full max-w-full min-w-0 overflow-hidden px-3 sm:px-4 py-2 border-t border-border/40 bg-muted/5 shrink-0">
            <div className="w-full max-w-full min-w-0 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={cooldown > 0}
                  onClick={() => handleSuggestionClick(question)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background border border-border/70 hover:bg-muted text-foreground/85 whitespace-nowrap shrink-0 disabled:opacity-50 active:scale-95 transition-transform"
                >
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  <span>{question}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Input Area: Touch-friendly, Safe for iOS Safari (text-base avoids auto-zoom), strictly bounded */}
        <div className="p-2.5 sm:p-3.5 border-t border-border/50 bg-card shrink-0 w-full max-w-full min-w-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full max-w-full min-w-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                cooldown > 0
                  ? `Cooling down (${cooldown}s)...`
                  : 'Ask about your expenses...'
              }
              disabled={isLoading || cooldown > 0}
              className="flex-1 min-w-0 h-11 sm:h-10 rounded-xl bg-background border-border/70 pl-3.5 text-base sm:text-sm focus-visible:ring-primary/20"
            />
            <Button
              type="submit"
              disabled={isLoading || cooldown > 0 || !input.trim()}
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl shrink-0 p-0 flex items-center justify-center font-bold active:scale-95 transition-transform shadow-xs"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : cooldown > 0 ? (
                <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>

      </Card>
    </div>
  );
}
