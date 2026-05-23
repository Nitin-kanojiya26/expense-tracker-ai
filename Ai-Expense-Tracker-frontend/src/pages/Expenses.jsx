import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllExpenses, updateExpense, deleteExpense, getCategories, getCategoryColor } from '../api/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
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
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  DollarSign,
  Tag
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);

  const [editExpense, setEditExpense] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', date: '', notes: '', categoryId: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      Promise.all([getAllExpenses(user.id), getCategories(user.id)])
        .then(([expensesData, categoriesData]) => {
          setExpenses(Array.isArray(expensesData) ? expensesData : []);
          setDbCategories(Array.isArray(categoriesData) ? categoriesData : []);
        })
        .catch(() => toast.error('Failed to sync expense records with server'))
        .finally(() => setIsLoading(false));
    }
  }, [user?.id]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteId);
      setExpenses(prev => prev.filter(item => item.id !== deleteId));
      toast.success('Expense deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Could not delete item');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEditClick = (expense) => {
    const foundCat = dbCategories.find(c => c.name.toLowerCase() === expense.categoryName?.toLowerCase());
    setEditExpense(expense);
    setEditForm({
      description: expense.description || '',
      amount: expense.amount || '',
      date: expense.date ? expense.date.split('T')[0] : '',
      notes: expense.notes || '',
      categoryId: foundCat ? String(foundCat.id) : ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    if (!editForm.description.trim() || !editForm.amount || !editForm.date) {
      toast.error('Please fill out all required fields');
      return;
    }
    setIsEditing(true);
    try {
      const updated = await updateExpense(editExpense.id, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        date: editForm.date,
        notes: editForm.notes,
        categoryId: editForm.categoryId ? parseInt(editForm.categoryId, 10) : null
      });

      setExpenses(prev => prev.map(item => item.id === editExpense.id ? updated : item));
      toast.success('Changes saved successfully!');
      setEditExpense(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save updates');
    } finally {
      setIsEditing(false);
    }
  };

  // ENGINE FOR SEARCH, SORT, AND FILTER LOGIC
  const processedExpenses = useMemo(() => {
    let result = [...expenses];

    // 1. Text Searching
    if (searchTerm.trim()) {
      const match = searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        (item.description && item.description.toLowerCase().includes(match)) || 
        (item.notes && item.notes.toLowerCase().includes(match))
      );
    }

    // 2. Category Filter Mapping
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter(item => {
        const catName = item.categoryName || 'Other';
        return catName.toLowerCase() === categoryFilter.toLowerCase();
      });
    }

    // 3. Time & Value Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date || 0) - new Date(b.date || 0);
      }
      if (sortBy === 'amount-desc') {
        return parseFloat(b.amount || 0) - parseFloat(a.amount || 0);
      }
      if (sortBy === 'amount-asc') {
        return parseFloat(a.amount || 0) - parseFloat(b.amount || 0);
      }
      return 0;
    });

    return result;
  }, [expenses, searchTerm, categoryFilter, sortBy]);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedExpenses.slice(start, start + ITEMS_PER_PAGE);
  }, [processedExpenses, currentPage]);

  const totalPages = Math.ceil(processedExpenses.length / ITEMS_PER_PAGE);

  // Helper mapping to read sort strings cleanly inside the text button layout
  const getSortLabel = (val) => {
    if (val === 'date-desc') return 'Newest First';
    if (val === 'date-asc') return 'Oldest First';
    if (val === 'amount-desc') return 'Highest Amount';
    if (val === 'amount-asc') return 'Lowest Amount';
    return 'Sort Order';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6 text-foreground antialiased">
      <Toaster position="top-right" richColors />

      {/* Main Container Card */}
      <Card className="border-border/80 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="pb-4 bg-muted/10 border-b border-border/40">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            
            {/* Search Input Box */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search description or notes..." 
                className="pl-9 h-10 rounded-xl bg-background border-border/60 focus-visible:ring-primary/20" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
            
            {/* Filter Controllers Group */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Select 
                value={categoryFilter} 
                onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
              >
                {/* MANUAL TEXT FIX: We read categoryFilter directly so it updates perfectly without duplication */}
                <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl bg-background border-border/60 flex items-center gap-2 text-sm">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                  <span className="capitalize truncate">
                    {categoryFilter === 'all' ? 'Category' : categoryFilter}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {dbCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={sortBy} 
                onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}
              >
                {/* MANUAL TEXT FIX: We read sortBy through helper label to ensure no duplicate overlapping layout */}
                <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl bg-background border-border/60 flex items-center gap-2 text-sm">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                  <span className="truncate">{getSortLabel(sortBy)}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="amount-desc">Highest Amount</SelectItem>
                  <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium">No expenses match your search parameters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider font-bold border-b border-border/40">
                  <tr>
                    <th className="p-4 pl-6">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedExpenses.map((item) => {
                    const customColor = getCategoryColor(item.categoryName);
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="p-4 pl-6 whitespace-nowrap font-medium text-muted-foreground/90 text-xs">
                          {formatDate(item.date)}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-foreground/90 text-sm">{item.description}</div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground/70 mt-0.5 max-w-xs truncate">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border"
                            style={{ 
                              borderColor: `${customColor}30`, 
                              color: customColor,
                              backgroundColor: `${customColor}08`
                            }}
                          >
                            {item.categoryName || 'Other'}
                          </Badge>
                        </td>
                        <td className="p-4 font-bold text-foreground tabular-nums">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-4 pr-6 text-right space-x-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground opacity-80 group-hover:opacity-100 transition-opacity" 
                            onClick={() => handleEditClick(item)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-80 group-hover:opacity-100 transition-opacity" 
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-border/40 bg-muted/5">
              <p className="text-xs text-muted-foreground font-medium">
                Page <span className="text-foreground font-bold">{currentPage}</span> of {totalPages}
              </p>
              <div className="flex gap-1.5">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2.5 rounded-lg border-border/60"
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2.5 rounded-lg border-border/60"
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form Modal Box */}
      <Dialog open={!!editExpense} onOpenChange={(open) => !open && setEditExpense(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Edit Expense Parameters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Description
              </Label>
              <Input 
                name="description" 
                className="rounded-xl h-10 border-border/60"
                value={editForm.description} 
                onChange={handleEditChange} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Amount
                </Label>
                <Input 
                  name="amount" 
                  type="number" 
                  className="rounded-xl h-10 border-border/60"
                  value={editForm.amount} 
                  onChange={handleEditChange} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                </Label>
                <Input 
                  name="date" 
                  type="date" 
                  className="rounded-xl h-10 border-border/60"
                  value={editForm.date} 
                  onChange={handleEditChange} 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" /> Category Allocation
              </Label>
              <Select value={editForm.categoryId} onValueChange={(v) => setEditForm(p => ({ ...p, categoryId: v }))}>
                <SelectTrigger className="rounded-xl h-10 border-border/60">
                  <span className="truncate">
                    {dbCategories.find(c => String(c.id) === editForm.categoryId)?.name || 'Select target category group'}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dbCategories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">Notes</Label>
              <Textarea 
                name="notes" 
                className="rounded-xl border-border/60 resize-none"
                value={editForm.notes} 
                onChange={handleEditChange} 
                rows={3} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl h-10 font-semibold" onClick={() => setEditExpense(null)} disabled={isEditing}>
              Cancel
            </Button>
            <Button className="rounded-xl h-10 font-semibold shadow-xs shadow-primary/10" onClick={handleEditSubmit} disabled={isEditing}>
              {isEditing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert box */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold tracking-tight">Delete Expense Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you completely sure you want to remove this transaction? This entry will be permanently dropped from your account data pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-10 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl h-10 font-semibold"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}