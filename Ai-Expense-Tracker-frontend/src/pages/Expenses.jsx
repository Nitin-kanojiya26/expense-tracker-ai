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
  Tag,
  X,
  RotateCcw,
  Receipt,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const filteredTotal = useMemo(() => {
    return processedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [processedExpenses]);

  const hasActiveFilters = searchTerm.trim() !== '' || categoryFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

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
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 py-3 sm:py-6 text-foreground antialiased">
      <Toaster position="top-right" richColors />

      {/* Main Container Card */}
      <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden bg-card">
        <CardHeader className="p-3 sm:p-5 bg-muted/10 border-b border-border/40 space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 justify-between items-stretch md:items-center">
            
            {/* Search Input Box */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search description or notes..." 
                className="pl-9 pr-9 h-10 rounded-xl bg-background border-border/60 focus-visible:ring-primary/20 text-sm" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-3 top-2.5 p-1 text-muted-foreground/60 hover:text-foreground rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Filter Controllers Group - Side-by-side on mobile */}
            <div className="grid grid-cols-2 sm:flex sm:flex-nowrap gap-2">
              <Select 
                value={categoryFilter} 
                onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl bg-background border-border/60 flex items-center gap-2 text-xs sm:text-sm">
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
                <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl bg-background border-border/60 flex items-center gap-2 text-xs sm:text-sm">
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

          {/* Quick Metrics & Filter Status Bar - Crucial for mobile clarity */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Receipt className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>
                {processedExpenses.length} {processedExpenses.length === 1 ? 'transaction' : 'transactions'}
              </span>
              {hasActiveFilters && (
                <span className="text-primary font-semibold text-[11px]">(filtered)</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-muted-foreground">
                Total: <strong className="text-foreground font-bold tabular-nums">{formatCurrency(filteredTotal)}</strong>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 sm:p-6 space-y-3">
              {/* Mobile Skeleton Cards */}
              <div className="space-y-3 md:hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-border/50 space-y-2.5 bg-muted/5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/2 rounded" />
                      <Skeleton className="h-5 w-16 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-6 w-full rounded" />
                  </div>
                ))}
              </div>
              {/* Desktop Skeleton Rows */}
              <div className="hidden md:block space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4 text-muted-foreground space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No expenses found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting your search query or category filter to view matching records."
                    : "You haven't recorded any expenses yet. Start tracking your transactions now!"}
                </p>
              </div>
              {hasActiveFilters ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-xl h-9 text-xs font-semibold gap-1.5"
                  onClick={handleResetFilters}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                </Button>
              ) : (
                <Link to="/add-expense">
                  <Button size="sm" className="rounded-xl h-9 text-xs font-bold gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" /> Add Your First Expense
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Touch-friendly Card List (Hidden on desktop md+) */}
              <div className="block md:hidden divide-y divide-border/40">
                {paginatedExpenses.map((item) => {
                  const customColor = getCategoryColor(item.categoryName);
                  return (
                    <div 
                      key={item.id} 
                      className="p-3.5 sm:p-4 space-y-2.5 transition-colors hover:bg-muted/10 active:bg-muted/20"
                    >
                      {/* Top Row: Description & Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-foreground leading-snug break-words">
                            {item.description}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-base text-foreground tabular-nums">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Category Badge & Date */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <Badge 
                          variant="outline" 
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border"
                          style={{ 
                            borderColor: `${customColor}40`, 
                            color: customColor,
                            backgroundColor: `${customColor}12`
                          }}
                        >
                          {item.categoryName || 'Other'}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </div>

                      {/* Notes Section (if available) */}
                      {item.notes && (
                        <div className="bg-muted/30 rounded-xl p-2.5 text-xs text-muted-foreground/90 flex items-start gap-2 border border-border/30">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                          <p className="line-clamp-2 leading-relaxed">{item.notes}</p>
                        </div>
                      )}

                      {/* Bottom Row: Actions Bar */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 px-2.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5" 
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 px-2.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5" 
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive/80" />
                          <span className="text-destructive/90">Delete</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: High-density Table (Hidden on mobile < md) */}
              <div className="hidden md:block overflow-x-auto">
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
                              title="Edit Expense"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-80 group-hover:opacity-100 transition-opacity" 
                              onClick={() => setDeleteId(item.id)}
                              title="Delete Expense"
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
            </>
          )}

          {/* Pagination Controls - Mobile touch-optimized */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/40 bg-muted/5">
              <p className="text-xs text-muted-foreground font-medium order-2 sm:order-1">
                Page <span className="text-foreground font-bold">{currentPage}</span> of {totalPages}
                <span className="hidden sm:inline text-muted-foreground/60 ml-1">
                  ({processedExpenses.length} total)
                </span>
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-9 px-3 rounded-xl border-border/60 text-xs font-semibold gap-1 flex-1 sm:flex-initial"
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-9 px-3 rounded-xl border-border/60 text-xs font-semibold gap-1 flex-1 sm:flex-initial"
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form Modal Box - Optimized for Mobile Screen Heights & Widths */}
      <Dialog open={!!editExpense} onOpenChange={(open) => !open && setEditExpense(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Description
              </Label>
              <Input 
                name="description" 
                className="rounded-xl h-10 border-border/60 text-sm"
                value={editForm.description} 
                onChange={handleEditChange} 
                placeholder="What was this expense for?"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Amount
                </Label>
                <Input 
                  name="amount" 
                  type="number" 
                  step="0.01"
                  className="rounded-xl h-10 border-border/60 text-sm"
                  value={editForm.amount} 
                  onChange={handleEditChange} 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                </Label>
                <Input 
                  name="date" 
                  type="date" 
                  className="rounded-xl h-10 border-border/60 text-sm"
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
                <SelectTrigger className="rounded-xl h-10 border-border/60 text-sm">
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
                className="rounded-xl border-border/60 resize-none text-sm"
                value={editForm.notes} 
                onChange={handleEditChange} 
                rows={3} 
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 mt-2">
            <Button variant="outline" className="rounded-xl h-10 font-semibold w-full sm:w-auto" onClick={() => setEditExpense(null)} disabled={isEditing}>
              Cancel
            </Button>
            <Button className="rounded-xl h-10 font-semibold shadow-xs shadow-primary/10 w-full sm:w-auto" onClick={handleEditSubmit} disabled={isEditing}>
              {isEditing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Box - Mobile-optimized buttons */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto rounded-2xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold tracking-tight">Delete Expense Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove this transaction? This entry will be permanently removed from your financial ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 mt-4">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-10 font-semibold w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl h-10 font-semibold w-full sm:w-auto"
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
