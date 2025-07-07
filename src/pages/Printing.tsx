
import React from 'react';
import { Printer } from 'lucide-react';
import Header from '@/components/layout/Header';
import PrintQueue from '@/components/printing/PrintQueue';
import PrintingStats from '@/components/printing/PrintingStats';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Printing = () => {
  const { data: printingOrders = [], isLoading, error } = useOrdersByStage('printing');

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Printer className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading printing queue...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Orders</CardTitle>
              <CardDescription>
                Unable to load printing queue. Please try again.
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
      <Header title="Printing Stage" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <Printer className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Print Management</h2>
            </div>
            <p className="text-gray-600">
              Manage orders in the printing stage and move them to packaging when complete.
            </p>
          </div>

          <PrintingStats orders={printingOrders} />
          
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Print Queue</h3>
            <PrintQueue orders={printingOrders} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Printing;
