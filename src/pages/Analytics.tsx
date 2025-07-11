
import React from 'react';
import { BarChart3 } from 'lucide-react';
import Header from '@/components/layout/Header';
import PerformanceMetrics from '@/components/analytics/PerformanceMetrics';
import ExportReports from '@/components/analytics/ExportReports';
import CompletedOrdersList from '@/components/analytics/CompletedOrdersList';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Analytics = () => {
  const { data: orders = [], isLoading, error } = useOrders();

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
              <p className="text-sm text-gray-600">{error.message}</p>
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
            <ExportReports orders={orders} />
            <PerformanceMetrics orders={orders} />
            <CompletedOrdersList orders={orders} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
