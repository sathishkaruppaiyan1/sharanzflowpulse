
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
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);

  const handleLogin = (userData: { email: string; role: string; name: string }) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
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
          <div className="flex h-screen bg-gray-100">
            <Sidebar user={user} onLogout={handleLogout} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/printing" element={<div className="p-6 text-center text-gray-500">Printing Stage - Coming Soon</div>} />
                <Route path="/packing" element={<div className="p-6 text-center text-gray-500">Packing Stage - Coming Soon</div>} />
                <Route path="/tracking" element={<div className="p-6 text-center text-gray-500">Tracking Stage - Coming Soon</div>} />
                <Route path="/analytics" element={<div className="p-6 text-center text-gray-500">Analytics - Coming Soon</div>} />
                <Route path="/users" element={<div className="p-6 text-center text-gray-500">User Management - Coming Soon</div>} />
                <Route path="/settings" element={<div className="p-6 text-center text-gray-500">Settings - Coming Soon</div>} />
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
