
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Orders from '@/pages/Orders';
import Printing from '@/pages/Printing';
import Packing from '@/pages/Packing';
import Tracking from '@/pages/Tracking';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Users from '@/pages/Users';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Router>
            <div className="flex h-screen bg-background">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header title="Blitz Ship" />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/printing" element={<Printing />} />
                    <Route path="/packing" element={<Packing />} />
                    <Route path="/tracking" element={<Tracking />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
            <Toaster />
            <Sonner />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
