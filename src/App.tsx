
import React, { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from './components/auth/LoginForm';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Printing from './pages/Printing';
import Packing from './pages/Packing';
import Tracking from './pages/Tracking';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = (userData: { email: string; role: string; name: string }) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LoginForm onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex h-screen bg-gray-100 w-full overflow-hidden">
            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden lg:block">
              <Sidebar user={user} onLogout={handleLogout} />
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <Routes>
                <Route path="/" element={<Dashboard onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/orders" element={<Orders onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/printing" element={<Printing onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/packing" element={<Packing onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/tracking" element={<Tracking onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/analytics" element={<Analytics onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/users" element={<Users onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="/settings" element={<Settings onMenuClick={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} user={user} onLogout={handleLogout} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
