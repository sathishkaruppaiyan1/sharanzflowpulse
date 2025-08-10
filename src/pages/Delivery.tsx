
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, List, Hash, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTrackingDetails } from '@/hooks/useTrackingDetails';
import DeliveryTabs from '@/components/delivery/DeliveryTabs';
import TrackingDetailsCard from '@/components/tracking/TrackingDetailsCard';
import DeliveryAnalytics from '@/components/delivery/DeliveryAnalytics';

const Delivery = () => {
  const [searchedOrderId, setSearchedOrderId] = useState<string>('');
  const { toast } = useToast();

  // Use webhook tracking details for searched order
  const { data: webhookTrackingDetails, isLoading: webhookLoading } = useTrackingDetails(searchedOrderId);

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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Delivery Management</h2>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Orders</span>
          </TabsTrigger>
          <TabsTrigger value="track-order" className="flex items-center space-x-2">
            <Hash className="h-4 w-4" />
            <span>Webhook Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <DeliveryTabs />
        </TabsContent>

        <TabsContent value="track-order" className="space-y-4">
          {/* Order ID Search Section for Webhook Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="mr-2 h-5 w-5" />
                Track by Order ID (Webhook Data)
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
                  View tracking details from webhook data stored in your database
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
                  No tracking information found for this order ID. Make sure the webhook is properly configured and tracking data has been received.
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

        <TabsContent value="analytics" className="space-y-4">
          <DeliveryAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
