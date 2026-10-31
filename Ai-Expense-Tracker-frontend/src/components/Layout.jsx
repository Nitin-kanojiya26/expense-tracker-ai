import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { cn } from '../lib/utils';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/add-expense': 'Add Expense',
  '/expenses': 'Expenses',
  '/ai-insights': 'AI Insights',
  '/budget-prediction': 'Budget Prediction',
  '/ai-query': 'Ask AI',
  '/settings': 'Settings',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';
  const isChatPage = location.pathname === '/ai-query';

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
        </header>

        {/* Main content - optimized for full-height responsive chat without double scrollbars */}
        <main
          className={cn(
            'flex-1',
            isChatPage
              ? 'p-2 sm:p-4 md:p-6 flex flex-col h-[calc(100dvh-4rem)] overflow-hidden'
              : 'p-4 md:p-6 overflow-auto'
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
