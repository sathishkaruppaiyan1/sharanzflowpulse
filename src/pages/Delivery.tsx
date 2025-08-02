
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, List, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTrackingDetails } from '@/hooks/useTrackingDetails';
import TrackingDetailsCard from '@/components/tracking/TrackingDetailsCard';
import { useOrdersByStage } from '@/hooks/useOrders';
import DeliveryOrderCard from '@/components/delivery/DeliveryOrderCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Delivery = () => {
  const [searchedOrderId, setSearchedOrderId] = useState<string>('');
  const { toast } = useToast();

  // Use webhook tracking details for searched order
  const { data: webhookTrackingDetails, isLoading: webhookLoading } = useTrackingDetails(searchedOrderId);

  // Fetch orders for different stages using local database only
  const { data: shippedOrders, isLoading: shippedLoading } = useOrdersByStage(['shipped']);
  const { data: deliveredOrders, isLoading: deliveredLoading } = useOrdersByStage(['delivered']);
  const { data: trackingOrders, isLoading: trackingLoading } = useOrdersByStage(['tracking']);

  const handleOrderIdSearch = () => {
    if (!searchedOrderId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an order ID",
        variant: "destructive",
      });
      return;
    }
    // The webhook data will automatically be fetched via the useTrackingDetails hook
  };

  const renderOrdersList = (orders: any[], isLoading: boolean, title: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    if (!orders || orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Package className="h-12 w-12 mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No {title.toLowerCase()}</h3>
          <p className="text-sm">Orders will appear here when they reach this stage.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {title} ({orders.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <DeliveryOrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Delivery Management</h2>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Orders</span>
          </TabsTrigger>
          <TabsTrigger value="track-order" className="flex items-center space-x-2">
            <Hash className="h-4 w-4" />
            <span>Webhook Tracking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Tabs defaultValue="in-transit" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="in-transit">In Transit</TabsTrigger>
              <TabsTrigger value="out-for-delivery">Ready to Ship</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
            </TabsList>

            <TabsContent value="in-transit" className="space-y-4">
              {renderOrdersList(shippedOrders, shippedLoading, "In Transit Orders")}
            </TabsContent>

            <TabsContent value="out-for-delivery" className="space-y-4">
              {renderOrdersList(trackingOrders, trackingLoading, "Ready to Ship Orders")}
            </TabsContent>

            <TabsContent value="delivered" className="space-y-4">
              {renderOrdersList(deliveredOrders, deliveredLoading, "Delivered Orders")}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="track-order" className="space-y-4">
          {/* Order ID Search Section for Webhook Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="mr-2 h-5 w-5" />
                Track by Order ID (Webhook Data Only)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter order ID..."
                  value={searchedOrderId}
                  onChange={(e) => setSearchedOrderId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleOrderIdSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleOrderIdSearch} 
                  disabled={webhookLoading}
                >
                  {webhookLoading ? 'Loading...' : 'Search'}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  View tracking details from webhook data stored in your database only
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Show webhook tracking results */}
          {webhookTrackingDetails && (
            <TrackingDetailsCard 
              orderId={searchedOrderId} 
              orderNumber=""
            />
          )}

          {/* Empty State for Webhook Tracking */}
          {!webhookTrackingDetails && !webhookLoading && searchedOrderId && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Hash className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No webhook tracking data found</h3>
                <p className="text-gray-600 text-center max-w-md">
                  No tracking information found for this order ID. Tracking data is only available through webhook updates.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Default Empty State */}
          {!searchedOrderId && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Hash className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search for tracking information</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Enter an order ID above to view tracking details from webhook data.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
