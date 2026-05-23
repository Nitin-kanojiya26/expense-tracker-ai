import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAIInsights } from '../api/api';
import { toast, Toaster } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Lightbulb,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  ArrowUpRight,
  ClipboardList,
  Coins,
  CalendarDays,
  AlertTriangle
} from 'lucide-react';

export default function AIInsights() {
  const { user } = useAuth();
  const [insightsRaw, setInsightsRaw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [aiUnavailable, setAiUnavailable] = useState(false); 

  const [dbStats, setDbStats] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    dailyAverage: 0
  });
  useEffect(() => {
    if (user?.id) {
      const cachedResponse = sessionStorage.getItem(`ai_dto_payload_${user.id}`);
      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        setInsightsRaw(parsed.insights || '');
        setDbStats({
          totalSpent: parsed.totalSpent || 0,
          totalTransactions: parsed.totalTransactions || 0,
          dailyAverage: parsed.dailyAverage || 0
        });
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleFetchInsights = async () => {
    if (cooldown > 0) return; 
    if (!user?.id) {
      toast.error("Please log in again to see your insights.");
      return;
    }
    
    setIsLoading(true);
    setAiUnavailable(false); 
    
    try {
      const data = await getAIInsights(user.id);
      
      const aiText = data?.insights;
      
      if (aiText && typeof aiText === 'string' && !aiText.startsWith("ERROR:")) {
        setInsightsRaw(aiText);
        
        const freshStats = {
          totalSpent: Number(data.totalSpent || 0),
          totalTransactions: Number(data.totalTransactions || 0),
          dailyAverage: Number(data.dailyAverage || 0)
        };
        
        setDbStats(freshStats);
        sessionStorage.setItem(`ai_dto_payload_${user.id}`, JSON.stringify(data));
        toast.success('Your budget updates are ready!');
        setCooldown(60);
      } else {
        setAiUnavailable(true);
        toast.error("The money assistant is busy with calculations right now.");
        setCooldown(60);
      }
    } catch (error) {
      console.error("Insights API pipeline offline:", error);
      setAiUnavailable(true);
      toast.error('Could not connect to the processing server. Checking back shortly.');
      setCooldown(60); 
    } finally {
      setIsLoading(false);
    }
  };

  const getCleanTipsList = () => {
    if (!insightsRaw) return [];
    return insightsRaw
      .split('\n')
      .map(line => line.trim())
      .map(line => line.replace(/^[-•*\d.)\s#_]+/, '').replace(/[*_]+/g, '').trim())
      .filter(line => line.length > 10);
  };

  const cleanTips = getCleanTipsList();

  const getInsightVariant = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('save') || lowerText.includes('cut back') || lowerText.includes('trim') || lowerText.includes('rs')) {
      return {
        icon: <TrendingDown className="h-4 w-4 text-emerald-500" />,
        badge: <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold rounded-md">Saving Idea</Badge>,
        className: "border-emerald-500/10 bg-gradient-to-r from-emerald-500/[0.02] to-transparent"
      };
    }
    if (lowerText.includes('spent') || lowerText.includes('highest') || lowerText.includes('buying') || lowerText.includes('shopping') || lowerText.includes('went')) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
        badge: <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold rounded-md">Spending Habit</Badge>,
        className: "border-amber-500/10 bg-gradient-to-r from-amber-500/[0.02] to-transparent"
      };
    }
    return {
      icon: <Lightbulb className="h-4 w-4 text-primary" />,
      badge: <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded-md">Smart Note</Badge>,
      className: "border-border/40 bg-muted/5"
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 py-8 text-foreground antialiased">
      <Toaster position="top-right" richColors />

      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6 gap-6">
        <div className="space-y-1">
          <Badge variant="outline" className="px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase bg-primary/5 text-primary border-primary/20">
            Money Assistant
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Your Financial Insights
          </h1>
          <p className="text-xs text-muted-foreground max-w-lg">
            Simple, personalized advice calculated directly from your spending over the last 30 days.
          </p>
        </div>
        
        <Button
          size="lg"
          onClick={handleFetchInsights}
          disabled={isLoading || cooldown > 0}
          className="font-bold transition-all duration-300 shadow-sm shadow-primary/10 hover:shadow-lg active:scale-[0.98] h-11 px-5 rounded-xl cursor-pointer"
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reviewing your purchases...</>
          ) : cooldown > 0 ? (
            <><Clock className="mr-2 h-4 w-4 text-amber-500" /> Wait {cooldown}s</>
          ) : insightsRaw ? (
            <><RefreshCw className="mr-2 h-4 w-4" /> Refresh Tips</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4 text-amber-400 fill-amber-400" /> Check Habits</>
          )}
         </Button>
      </div>
      {isLoading && (
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-xl rounded-2xl">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative flex items-center justify-center h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Looking over your month...</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Turning your expenses into friendly tips to keep you on track.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
          
          {/* USER-FRIENDLY STATISTICS PANEL */}
          <Card className="lg:col-span-1 border border-border/80 bg-card shadow-xs rounded-2xl space-y-4 p-5 lg:sticky lg:top-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Last 30 Days Summary</h3>
              <p className="text-[11px] text-muted-foreground">A clean summary of your active spending history.</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  Total Spent
                </div>
                <span className="text-sm font-black text-foreground tabular-nums">
                  ₹{dbStats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" />
                  Items Logged
                </div>
                <span className="text-sm font-black text-foreground tabular-nums">
                  {dbStats.totalTransactions} purchases
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  Daily Average
                </div>
                <span className="text-sm font-black text-foreground tabular-nums">
                  ₹{dbStats.dailyAverage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            {/* If backend API returns null / breaks, render this explicit alert */}
            {aiUnavailable && (
              <Card className="border border-destructive/20 bg-destructive/5 rounded-2xl p-5 flex gap-3 items-start animate-fade-in text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">System Engine Offline</h4>
                  <p className="text-xs leading-relaxed text-destructive/90">
                    Our AI processor is running slow or unavailable right now. Your local calculation history remains active, but context metrics are locked.
                  </p>
                </div>
              </Card>
            )}

            {cleanTips.length > 0 ? (
              cleanTips.map((tipText, idx) => {
                const variant = getInsightVariant(tipText);
                return (
                  <Card
                    key={idx}
                    className={`border border-border/60 shadow-2xs hover:border-border/100 transition-all duration-200 rounded-xl overflow-hidden group ${variant.className}`}
                  >
                    <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                      <div className="p-2 rounded-lg bg-card border border-border/80 shadow-3xs group-hover:scale-105 transition-transform shrink-0">
                        {variant.icon}
                      </div>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          {variant.badge}
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90 font-medium tracking-tight break-words">
                          {tipText}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              
              <Card className="border border-dashed border-border/80 bg-muted/5 rounded-2xl">
                <CardContent className="p-16 text-center space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center mx-auto text-muted-foreground/60">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground tracking-tight text-sm">No Advice Generated Yet</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Click the button above to calculate tips and read your recent spending habits instantly.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      )}
    </div>
  );
}