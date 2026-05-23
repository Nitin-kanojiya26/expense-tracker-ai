import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllExpenses, deleteExpense } from '../api/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { generateUniqueColor } from '../api/api'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  Plus,
  Lightbulb,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const data = await getAllExpenses(user.id);
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to parse active metrics ledger list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchExpenses();
    }
  }, [user?.id]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteId);
      setExpenses((prev) => prev.filter((item) => item.id !== deleteId));
      toast.success('Ledger item data point purged completely');
    } catch (error) {
      toast.error(error.message || 'Server rejected transaction drop operation');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const totalSpending = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenses]);

  const averageTransaction = useMemo(() => {
    if (expenses.length === 0) return 0;
    return totalSpending / expenses.length;
  }, [expenses, totalSpending]);

  const latestExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [expenses]);

  const chartVisualizationData = useMemo(() => {
    const distributionMap = {};
    expenses.forEach((item) => {
      const name = item.categoryName || 'Other'; 
      distributionMap[name] = (distributionMap[name] || 0) + item.amount;
    });

    return Object.entries(distributionMap).map(([name, value]) => ({
      name,
      value,
      color: generateUniqueColor(name), 
    }));
  }, [expenses]);

  return (
    <div className="space-y-6 animate-fade-in text-foreground antialiased">
      <Toaster position="top-right" richColors />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Real-time metrics calculated directly from database records</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link to="/add-expense" className="flex-1 sm:flex-initial">
            <Button className="w-full rounded-xl font-bold h-10 shadow-sm"><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
          </Link>
        </div>
      </div>

      {/* Numerical Metrics Summary Matrix Grid Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Total Spending Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-28 rounded-lg" /> : <div className="text-2xl font-extrabold tracking-tight tabular-nums">{formatCurrency(totalSpending)}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Average Transaction cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-28 rounded-lg" /> : <div className="text-2xl font-extrabold tracking-tight tabular-nums">{formatCurrency(averageTransaction)}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Total Logged Items Count</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-28 rounded-lg" /> : <div className="text-2xl font-extrabold tracking-tight tabular-nums">{expenses.length} Records</div>}
          </CardContent>
        </Card>
      </div>

      {/* Graphical Chart Visualization Segment Grid Block Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-1 lg:col-span-4 rounded-2xl border-border/60 shadow-sm">
          <CardHeader><CardTitle className="text-sm font-extrabold tracking-tight">Category Distribution Breakdowns</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : chartVisualizationData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Empty transaction ledger context indices.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartVisualizationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={3}>
                    {chartVisualizationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} className="focus:outline-none" />)}
                  </Pie>
                  <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    borderRadius: '12px', 
                    borderColor: 'var(--color-border)' 
                  }}
                itemStyle={{ 
                  color: 'var(--color-foreground)', 
                  fontSize: '12px', 
                  fontWeight: 'bold' 
                }} 
                labelStyle={{ 
                  color: 'var(--color-muted-foreground)' 
                }}
                formatter={(value) => [formatCurrency(value), "Spent"]} 
                />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-3 rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold tracking-tight">Recent Logs</CardTitle>
              <Link to="/expenses"><Button variant="ghost" size="sm" className="gap-1 text-xs font-bold rounded-lg h-8">All Ledger <ArrowUpRight className="h-3 w-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
            ) : latestExpenses.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">No financial events recorded yet.</div>
            ) : (
              <div className="space-y-3.5">
                {latestExpenses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-none last:pb-0">
                    <div className="space-y-1.5 max-w-[65%]">
                      <p className="text-xs font-bold truncate pr-2">{item.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium">{formatDate(item.date)}</span>
                        {/* 🔄 SYNCED: Category pill background matches dynamically using color indicators */}
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: generateUniqueColor(item.categoryName || 'Other') }}
                          />
                          <span className="text-[10px] font-bold text-muted-foreground/90">{item.categoryName || 'Other'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tabular-nums">{formatCurrency(item.amount)}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Prompt Trigger Panel */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader><CardTitle className="text-sm font-extrabold tracking-tight">AI Assistant Portal Shortcuts</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/ai-query">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 rounded-xl border-border/60 hover:bg-muted/40 cursor-pointer">
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold">Ask AI Assistant Chatbot</span>
              </Button>
            </Link>
            <Link to="/ai-insights">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 rounded-xl border-border/60 hover:bg-muted/40 cursor-pointer">
                <Lightbulb className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold">Generate Smart Insights Analytics</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Purge Alert Dialog Wrapper block */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold tracking-tight">Delete Expense</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Are you sure you want to delete this expense? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl font-bold text-xs h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold text-xs h-10">
              {isDeleting ? 'Purging...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}