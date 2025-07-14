
import React, { useState } from 'react';
import { Package, Scan, CheckSquare } from 'lucide-react';
import Header from '@/components/layout/Header';
import PackingQueue from '@/components/packing/PackingQueue';
import PackingStats from '@/components/packing/PackingStats';
import PackingScanner from '@/components/packing/PackingScanner';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Packing = () => {
  const { data: packingOrders = [], isLoading, error } = useOrdersByStage('packing');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleItemPacked = (orderId: string, itemId: string) => {
    console.log('Item packed:', { orderId, itemId });
    // Force a refresh of the data
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading packing orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Orders</CardTitle>
              <CardDescription>
                Unable to load packing orders. Please try refreshing the page.
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
      <Header title="Packing Stage" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Section */}
          <PackingStats orders={packingOrders} />

          {/* Main Content with Tabs */}
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scanner" className="flex items-center space-x-2">
                <Scan className="h-4 w-4" />
                <span>Item Scanner</span>
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex items-center space-x-2">
                <CheckSquare className="h-4 w-4" />
                <span>Packing Queue</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="space-y-6">
              <PackingScanner 
                orders={packingOrders} 
                onItemPacked={handleItemPacked}
              />
              
              {/* Quick Stats for Scanner */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scanning Overview</CardTitle>
                  <CardDescription>
                    Scan items to mark them as packed. Orders will automatically move to tracking when all items are packed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {packingOrders.length}
                      </div>
                      <div className="text-sm text-blue-600">Orders in Packing</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {packingOrders.reduce((total, order) => {
                          return total + (order.order_items?.filter((item: any) => !item.packed).length || 0);
                        }, 0)}
                      </div>
                      <div className="text-sm text-orange-600">Items to Pack</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {packingOrders.reduce((total, order) => {
                          return total + (order.order_items?.filter((item: any) => item.packed).length || 0);
                        }, 0)}
                      </div>
                      <div className="text-sm text-green-600">Items Packed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Packing Queue</CardTitle>
                  <CardDescription>
                    Manage and track packing progress for all orders. Mark items as packed manually.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PackingQueue 
                    key={refreshKey}
                    orders={packingOrders} 
                    onItemPacked={handleItemPacked}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Packing;
