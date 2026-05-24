import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createExpense, suggestCategory, getCategories, generateUniqueColor } from '../api/api'; 
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Loader2, Sparkles, Plus, List, Check } from 'lucide-react';

const SYSTEM_CORE_DEFAULTS = ['Food', 'Shopping', 'Utilities', 'Travel', 'Entertainment', 'Healthcare', 'Education', 'Other'];

export default function AddExpense() {
  const { user } = useAuth();
  const [dbCategories, setDbCategories] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: 'unselected',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiErrorState, setAiErrorState] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const abortControllerRef = useRef(null);

  const fetchAndSyncCategories = async (userId) => {
    try {
      const data = await getCategories(userId);
      if (Array.isArray(data) && data.length > 0) {
        
        const uniqueCategoriesMap = new Map();
        data.forEach(cat => {
          if (cat && cat.name) {
            const lowercaseKey = cat.name.trim().toLowerCase();
            if (!uniqueCategoriesMap.has(lowercaseKey)) {
              uniqueCategoriesMap.set(lowercaseKey, {
                ...cat,
                id: String(cat.id),
                name: cat.name.trim() 
              });
            }
          }
        });

        setDbCategories(Array.from(uniqueCategoriesMap.values()));
        setIsPageLoading(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error pulling category rows:", err);
      setIsPageLoading(false);
      return false;
    }
  };

  useEffect(() => {
    const initializeUserCategories = async () => {
      if (!user?.id) return;
      setIsPageLoading(true);
      
      const hasCategories = await fetchAndSyncCategories(user.id);
      
      if (!hasCategories) {
        try {
          const token = localStorage.getItem('token');
          const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
          
          const seedRequests = SYSTEM_CORE_DEFAULTS.map(name => 
            fetch(`http://localhost:8080/api/categories/user/${user.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeader },
              body: JSON.stringify({ name: name.trim() })
            }).then(res => {
              if (!res.ok) throw new Error("Seed item rejected");
              return res.json();
            })
          );

          await Promise.all(seedRequests);
          await fetchAndSyncCategories(user.id);
        } catch (seedError) {
          console.error("Auto-seed process aborted:", seedError);
          toast.error("Failed to seed initial categories into database");
          setIsPageLoading(false);
        }
      }
    };

    initializeUserCategories();
  }, [user?.id]);

  useEffect(() => {
    const textTarget = formData.description.trim();

    if (textTarget.length < 3) {
      setSuggestedCategory(null);
      setAiErrorState(false);
      setIsSuggesting(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const debounceTimer = setTimeout(async () => {
      setIsSuggesting(true);
      setAiErrorState(false);
      
      try {
        const result = await suggestCategory(textTarget, controller.signal);
        let parsedName = result?.category || result;
        
        if (parsedName && typeof parsedName === 'string') {
          parsedName = parsedName
            .replace(/suggested category:\s*/i, '')
            .replace(/category:\s*/i, '')
            .trim();

          const lowerResult = parsedName.toLowerCase();

          if (
            lowerResult.includes('error') || 
            lowerResult.includes('unavailable') || 
            lowerResult.includes('failed') || 
            parsedName.length > 25
          ) {
            setSuggestedCategory(null);
            setAiErrorState(true);
            return;
          }

          setSuggestedCategory(parsedName);
        } else {
          setSuggestedCategory(null);
          setAiErrorState(true);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSuggestedCategory(null);
        setAiErrorState(true);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSuggesting(false);
        }
      }
    }, 850);

    return () => clearTimeout(debounceTimer);
  }, [formData.description]);

  const handleApplyAISuggestion = async () => {
    if (!suggestedCategory) return;

    // Small-letter guard verification to cross-check existence dynamically
    const cleanSuggested = suggestedCategory.trim().toLowerCase();
    const matched = dbCategories.find(c => c.name.toLowerCase().trim() === cleanSuggested);
    
    if (matched) {
      setFormData(prev => ({ ...prev, categoryId: String(matched.id) }));
      toast.success(`Matched to existing category: "${matched.name}"`);
      return;
    }

    setIsLoading(true);
    try {
      toast.loading(`Creating new category "${suggestedCategory}"...`, { id: "on-the-fly-cat" });
      
      const token = localStorage.getItem('token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await fetch(`http://localhost:8080/api/categories/user/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: suggestedCategory.trim() })
      });

      if (!response.ok) throw new Error("Server rejected category registration");
      const savedCategoryEntity = await response.json();

      const stringifiedEntity = {
        ...savedCategoryEntity,
        id: String(savedCategoryEntity.id),
        name: savedCategoryEntity.name.trim()
      };

      setDbCategories(prev => {
        const absoluteCleanName = stringifiedEntity.name.toLowerCase();
        if (prev.some(c => c.name.toLowerCase().trim() === absoluteCleanName)) {
          return prev; 
        }
        return [...prev, stringifiedEntity];
      });

      setFormData(prev => ({ ...prev, categoryId: stringifiedEntity.id }));
      
      toast.dismiss("on-the-fly-cat");
      toast.success(`Saved and applied new category: "${suggestedCategory}"`);
    } catch (err) {
      toast.dismiss("on-the-fly-cat");
      toast.error("Failed to establish new category entry records");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCategorySelect = (value) => {
    setFormData((prev) => ({ ...prev, categoryId: String(value) }));
    if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Please enter a valid positive amount';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.categoryId || formData.categoryId === 'unselected') {
      newErrors.categoryId = 'Please allocate a valid classification target';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await createExpense(user.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes,
        categoryId: parseInt(formData.categoryId, 10)
      });
      toast.success('Expense saved successfully!');
      setIsSuccess(true);
    } catch (error) {
      toast.error(error.message || 'Submission error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in text-foreground antialiased">
        <Toaster position="top-right" richColors />
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Expense Logged Successfully!</h2>
              <p className="text-xs text-muted-foreground mt-1.5">Your record has been successfully updated.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={() => { setFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0], categoryId: 'unselected', notes: '' }); setSuggestedCategory(null); setAiErrorState(false); setIsSuccess(false); }} className="flex-1 rounded-xl font-bold h-11 cursor-pointer">
                <Plus className="mr-2 h-4 w-4" /> Add Another Expense
              </Button>
              <Link to="/expenses" className="flex-1">
                <Button variant="outline" className="w-full rounded-xl font-bold h-11 cursor-pointer"><List className="mr-2 h-4 w-4" /> View Expenses Ledger</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in text-foreground antialiased">
      <Toaster position="top-right" richColors />
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-extrabold tracking-tight">Add New Expense</CardTitle>
          <CardDescription className="text-xs">Enter your purchase details below to log an entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold tracking-tight">Description</Label>
              <Input 
                id="description" 
                name="description" 
                placeholder="e.g., Groceries or Uber Ride" 
                value={formData.description} 
                onChange={handleChange} 
                className={`rounded-xl h-10 ${errors.description ? 'border-destructive' : 'border-border/60'}`} 
              />
              {errors.description && <p className="text-xs font-medium text-destructive">{errors.description}</p>}
            </div>

            {/* Smart Suggestion Container Block */}
            {isSuggesting && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-fade-in">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Thinking of a suggestion...</span>
              </div>
            )}

            {!isSuggesting && suggestedCategory && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-fade-in">
                <Sparkles className="h-3.5 w-3.5 text-primary fill-primary/10" />
                <span className="text-xs font-semibold tracking-tight">Smart Suggestion:</span>
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all gap-1 py-1 text-[11px] font-bold rounded-lg border border-border/40" onClick={handleApplyAISuggestion}>
                  {suggestedCategory} <Plus className="w-3 h-3 ml-0.5" /> (Create & Apply)
                </Badge>
              </div>
            )}

            {!isSuggesting && aiErrorState && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/10 animate-fade-in text-destructive">
                <Sparkles className="h-3.5 w-3.5 opacity-60" />
                <span className="text-xs font-medium tracking-tight">AI helper slowed down. Keep typing your description to refresh.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold tracking-tight">Amount (INR)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" value={formData.amount} onChange={handleChange} className={`rounded-xl h-10 tabular-nums ${errors.amount ? 'border-destructive' : 'border-border/60'}`} />
                {errors.amount && <p className="text-xs font-medium text-destructive">{errors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-bold tracking-tight">Date</Label>
                <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} className={`rounded-xl h-10 ${errors.date ? 'border-destructive' : 'border-border/60'}`} />
                {errors.date && <p className="text-xs font-medium text-destructive">{errors.date}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs font-bold tracking-tight">Category Classification</Label>
              {isPageLoading ? (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground p-3 border rounded-xl bg-muted/30 border-border/40">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading categories ledger...
                </div>
              ) : (
                <Select 
                  value={formData.categoryId} 
                  onValueChange={handleCategorySelect}
                  key={formData.categoryId}
                >
                  <SelectTrigger className={`rounded-xl h-10 ${errors.categoryId ? 'border-destructive' : 'border-border/60'}`}>
                    <SelectValue placeholder="Choose target category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {dbCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: generateUniqueColor(cat.name) }} 
                          />
                          <span className="text-xs font-medium text-foreground/90">{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.categoryId && <p className="text-xs font-medium text-destructive">{errors.categoryId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold tracking-tight">Notes (Optional)</Label>
              <Textarea id="notes" name="notes" placeholder="purchase context here..." value={formData.notes} onChange={handleChange} rows={3} className="rounded-xl border-border/60 resize-none text-xs" />
            </div>

            <Button type="submit" className="w-full rounded-xl font-bold h-11 transition-all active:scale-[0.99] cursor-pointer shadow-sm pt-0.5" disabled={isLoading || isPageLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving entry...</> : <><Plus className="mr-2 h-4 w-4" /> Save Expense</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}