import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../api/api';
import { cn } from '../lib/utils';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Bot, User, Send, Loader2, Sparkles, Clock } from 'lucide-react';

const suggestedQuestions = [
  'How much did I spend on food?',
  'What was my biggest expense?',
  'How much on transportation?',
  'How many times did I eat out?',
  'What is my average daily spending?',
  'Which category has the highest spending?',
];

export default function AIQuery() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // ⏱️ Shared lockout clock
  const scrollRef = useRef(null);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const triggerCooldown = () => {
    const expiryTime = Date.now() + 60000;
    localStorage.setItem('ai_global_cooldown_expiry', expiryTime.toString());
    setCooldown(60);
    window.dispatchEvent(new Event('ai-cooldown-sync'));
  };

  const sendMessage = async (question) => {
    if (cooldown > 0) return; 
    const text = question || input.trim();
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
      toast.error('Failed to get AI response');
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
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
      inputRef.current?.focus();
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
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <Toaster position="top-right" richColors />

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Ask AI</CardTitle>
              <CardDescription>Ask questions about your expenses</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Start a conversation</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Ask me anything about your expenses. I can help you understand your spending patterns and find insights.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.slice(0, 4).map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      disabled={isLoading || cooldown > 0}
                      onClick={() => handleSuggestionClick(question)}
                      className="text-xs"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.type === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : message.isError
                          ? 'bg-destructive/10 text-destructive rounded-bl-md'
                          : 'bg-secondary rounded-bl-md'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </div>
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Suggested Questions (when there are messages) */}
          {messages.length > 0 && !isLoading && (
            <div className="px-4 py-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    disabled={cooldown > 0}
                    onClick={() => handleSuggestionClick(question)}
                    className="text-xs whitespace-nowrap flex-shrink-0"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={cooldown > 0 ? `System cooling down... Wait ${cooldown}s` : "Ask about your expenses..."}
                disabled={isLoading || cooldown > 0}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || cooldown > 0 || !input.trim()}>
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
        </CardContent>
      </Card>
    </div>
  );
}