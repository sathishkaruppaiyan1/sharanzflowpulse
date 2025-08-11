
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/pages/Dashboard';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import Orders from '@/pages/Orders';
import Printing from '@/pages/Printing';
import Packing from '@/pages/Packing';
import Tracking from '@/pages/Tracking';
import Delivery from '@/pages/Delivery';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Users from '@/pages/Users';
import NotFound from '@/pages/NotFound';
import TrackOrder from '@/pages/TrackOrder';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar />
          <div className="flex-1 ml-64">
            <Header title="Fulfillment System" />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/printing" element={<Printing />} />
                <Route path="/packing" element={<Packing />} />
                <Route path="/tracking" element={<Tracking />} />
                <Route path="/delivery" element={<Delivery />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
