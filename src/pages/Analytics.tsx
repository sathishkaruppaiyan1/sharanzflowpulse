
import React, { useState, useMemo } from 'react';
import { BarChart3, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import PerformanceMetrics from '@/components/analytics/PerformanceMetrics';
import CompletedOrdersList from '@/components/analytics/CompletedOrdersList';
import DateRangePicker from '@/components/analytics/DateRangePicker';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Order } from '@/types/database';

const Analytics = () => {
  const { orders = [], loading: isLoading, error } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.phone?.includes(searchQuery) ||
        order.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const from = dateRange.from;
        const to = dateRange.to;
        
        if (from && to) {
          return orderDate >= from && orderDate <= to;
        } else if (from) {
          return orderDate >= from;
        } else if (to) {
          return orderDate <= to;
        }
        return true;
      });
    }

    return filtered;
  }, [orders, searchQuery, dateRange]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Analytics" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Analytics" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Analytics</CardTitle>
              <CardDescription>
                Unable to load analytics data. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <BarChart3 className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Business Analytics</h2>
            </div>
            <p className="text-gray-600">
              Track performance metrics, fulfillment efficiency, and export reports.
            </p>
          </div>

          <div className="space-y-6">
            <PerformanceMetrics orders={filteredOrders} />
            
            {/* Filters Section - Now above Completed Orders */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search orders, customers, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            
            <CompletedOrdersList orders={filteredOrders} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
