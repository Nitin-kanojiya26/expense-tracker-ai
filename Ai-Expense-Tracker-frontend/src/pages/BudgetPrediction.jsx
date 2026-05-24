import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBudgetPrediction, getCategoryColor } from '../api/api';
import { formatCurrency } from '../lib/utils';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Loader2,
  RefreshCw,
  Calculator,
  PieChart,
  DollarSign,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock
} from 'lucide-react';

export default function BudgetPrediction() {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); 

  useEffect(() => {
    if (user?.id) {
      const cachedPrediction = sessionStorage.getItem(`ai_prediction_payload_${user.id}`);
      if (cachedPrediction) {
        try {
          setPrediction(JSON.parse(cachedPrediction));
        } catch (e) {
          setPrediction(cachedPrediction);
        }
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const fetchPrediction = async () => {
    if (cooldown > 0) return;
    if (!user?.id) {
      toast.error("Please log in again to calculate predictions.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await getBudgetPrediction(user.id);
      
      if (typeof data === 'string' && data.startsWith("ERROR:")) {
        toast.error(data.replace("ERROR:", "").trim());
        setPrediction(null);
        setCooldown(60); 
      } else {
        setPrediction(data);
        if (typeof data === 'object') {
          sessionStorage.setItem(`ai_prediction_payload_${user.id}`, JSON.stringify(data));
        } else {
          sessionStorage.setItem(`ai_prediction_payload_${user.id}`, data);
        }
        
        toast.success('Predictive architecture updated successfully');
        setCooldown(60); 
      }
    } catch (error) {
      toast.error('Failed to communicate with forecasting engine');
      setCooldown(60); 
    } finally {
      setIsLoading(false);
    }
  };

  const parsePrediction = () => {
    if (!prediction) return { categories: [], total: 0 };

    const rawText = typeof prediction === 'string' ? prediction : (prediction.predictionText || prediction.message || '');
    if (rawText.startsWith("ERROR:")) {
      return { categories: [], total: 0 };
    }

    let categories = [];
    let total = 0;

    let dataSection = rawText;

    const dividerIndex = rawText.search(/(?:---|ai budget insights|trend analysis:)/i);
    if (dividerIndex !== -1) {
      dataSection = rawText.substring(0, dividerIndex);
    }

    const lines = dataSection.split('\n');
    lines.forEach((line) => {
      const match = line.match(/(?:[•\*\-\s\d\.]*)\b([A-Za-z\s&\/]+)\b(?:[\*\s\:\-]*)(?:Rs\.?|INR|[\u20B9\$])?\s*([\d,]+(?:\.\d+)?)/i);
      if (match) {
        const name = match[1].trim();
        const amount = parseFloat(match[2].replace(/,/g, ''));
        
        // Strict baseline text parsing shields
        const structuralBlacklist = [
          'total', 'predicted total', 'total predicted', 'grand total', 'budget',
          'rs', 'inr', 'error', 'please wait', 'wait', 'month', 'prediction',
          'budget prediction for', 'budget prediction'
        ];
        
        if (!isNaN(amount) && !structuralBlacklist.includes(name.toLowerCase()) && name.length > 2) {
          if (!name.toLowerCase().startsWith('budget prediction')) {
            categories.push({
              name,
              predicted: amount,
              color: getCategoryColor(name),
            });
          }
        }
      }
    });

    total = categories.reduce((sum, c) => sum + c.predicted, 0);

    return { categories, total };
  };

  const { categories, total } = parsePrediction();
  const dynamicChartHeight = Math.max(280, categories.length * 52);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 lg:px-8 py-10 text-foreground antialiased selection:bg-primary/20">
      <Toaster position="top-right" richColors />

      {/* Premium Dashboard Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/60 pb-8 gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full font-semibold text-xs tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              AI Processing Engine Active
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            SmartBudget Studio
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
          Get Budget for your next month
          </p>
        </div>
        
        <Button
          size="lg"
          onClick={fetchPrediction}
          disabled={isLoading || cooldown > 0}
          className="relative overflow-hidden font-bold group transition-all duration-300 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] h-12 px-6 rounded-xl cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running..
            </>
          ) : cooldown > 0 ? (
            <>
              <Clock className="mr-2 h-4 w-4 text-amber-500 animate-pulse" />
              Wait {cooldown}s
            </>
          ) : prediction ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 transition-transform group-hover:rotate-180 duration-700" />
              Recalculate
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4 text-amber-400 fill-amber-400" />
              Generate Prediction
            </>
          )}
        </Button>
      </div>

      {/* Glassmorphic Loading Container Animation */}
      {isLoading && (
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl animate-fade-in">
          <CardContent className="p-20 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative flex items-center justify-center h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/5 border-t-primary animate-spin" />
              <Layers className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Compiling Transactions</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Evaluating your Expenses for next month</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Analytics Workspace Display */}
      {!isLoading && prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
          
          {/* Main Counter Glass Card */}
          <Card className="lg:col-span-3 border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] via-card to-card shadow-lg shadow-emerald-500/[0.01] rounded-2xl overflow-hidden relative group hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <CardContent className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase tracking-wide opacity-90">Target</span>
                <h2 className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums drop-shadow-xs">
                  {formatCurrency(total)}
                </h2>
        
              </div>
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/15 rounded-xl px-4 py-3 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto shadow-2xs">
                <TrendingUp className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold tracking-tight">Analytics Model Live</span>
              </div>
            </CardContent>
          </Card>

          {/* Left Block Side: High Definition Scaled Charts Canvas */}
          <div className="lg:col-span-2 space-y-8">
            {categories.length > 0 ? (
              <Card className="bg-card border-border/80 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4 bg-muted/30 px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/10 text-primary">
                      <PieChart className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Visual Analytics</CardTitle>
                
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 bg-card">
                  <div style={{ height: `${dynamicChartHeight}px`, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categories}
                        layout="vertical"
                        margin={{ left: 10, right: 35, top: 15, bottom: 5 }}
                        className="text-muted-foreground fill-current"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.3)" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => `₹${value}`}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          stroke="hsl(var(--foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'currentColor', fontWeight: 600 }}
                        />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value), "Target Limit"]}
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)'
                          }}
                          itemStyle={{ color: 'hsl(var(--popover-foreground))', fontSize: '13px', fontWeight: 500 }}
                          labelStyle={{ color: 'hsl(var(--muted-foreground))', fontWeight: 'bold', fontSize: '12px' }}
                        />
                        <Bar dataKey="predicted" barSize={14} radius={[0, 6, 6, 0]}>
                          {categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--primary))'} opacity={0.9} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-500/20 bg-amber-500/[0.02] rounded-2xl">
                <CardContent className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                  <ShieldAlert className="h-10 w-10 text-amber-500" />
                  <div>
                    <p className="font-bold text-amber-500">AI Suggestion Didn't Match</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      We found a category, but it looks a bit unusual.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Block Side: Multi-Category Ledger Table */}
          <div className="space-y-8 lg:col-span-1">
            {categories.length > 0 && (
              <Card className="bg-card border-border/80 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4 bg-muted/30 px-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/10 text-primary">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Predicted Expenses</CardTitle>
                      <CardDescription className="text-xs">Detailed Expense Breakdown</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 bg-card divide-y divide-border/40 max-h-[380px] overflow-y-auto custom-scrollbar">
                  {categories.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-all group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs scale-100 group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-semibold text-sm text-foreground/90 truncate tracking-tight">{category.name}</span>
                      </div>
                      <span className="font-bold text-sm text-foreground shrink-0 tabular-nums bg-muted/40 px-2.5 py-1 rounded-lg border border-border/20">
                        {formatCurrency(category.predicted)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      )}

      {/* Standby Default Inactive State Card */}
      {!isLoading && !prediction && (
        <Card className="border-2 border-dashed border-border/80 bg-muted/5 rounded-2xl transition-all duration-300 hover:bg-muted/10">
          <CardContent className="p-20 max-w-md mx-auto text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto shadow-sm text-muted-foreground/50">
              <Calculator className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-foreground tracking-tight text-lg">Awaiting Analytics Trigger</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                No forecast data found. Click the Generate Prediction Button above to analyze and predict next month's transactions
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}