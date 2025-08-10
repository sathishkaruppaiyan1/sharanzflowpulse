
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Truck, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import ShopifyDeliveryList from '@/components/delivery/ShopifyDeliveryList';
import DeliveryAnalyticsShopify from '@/components/delivery/DeliveryAnalyticsShopify';
import { useTrackingSync } from '@/hooks/useTrackingSync';

const Delivery = () => {
  const { syncStatus, syncAllTrackingDetails, isConfigured } = useTrackingSync();

  const handleManualSync = () => {
    syncAllTrackingDetails();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-gray-600 mt-2">Track and manage order deliveries with real-time updates</p>
        </div>
        
        {isConfigured && (
          <div className="flex items-center space-x-4">
            {syncStatus.isSync && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>
                  Syncing... {syncStatus.processed}/{syncStatus.total}
                  {syncStatus.currentOrder && (
                    <span className="block text-xs text-gray-500">
                      {syncStatus.currentOrder}
                    </span>
                  )}
                </span>
              </div>
            )}
            
            <Button 
              onClick={handleManualSync} 
              disabled={syncStatus.isSync}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Tracking
            </Button>
          </div>
        )}
      </div>

      {!isConfigured && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Parcel Panel API Not Configured</h3>
              <p className="text-yellow-700">
                Please configure Parcel Panel API in settings to enable automatic tracking sync.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <DeliveryAnalyticsShopify />

      <Tabs defaultValue="in_transit" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="in_transit" className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span>In Transit</span>
          </TabsTrigger>
          <TabsTrigger value="out_for_delivery" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Out for Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Delivered</span>
          </TabsTrigger>
          <TabsTrigger value="exception" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Issues</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in_transit">
          <ShopifyDeliveryList 
            status="in_transit" 
            title="Orders In Transit"
          />
        </TabsContent>

        <TabsContent value="out_for_delivery">
          <ShopifyDeliveryList 
            status="out_for_delivery" 
            title="Orders Out for Delivery"
          />
        </TabsContent>

        <TabsContent value="delivered">
          <ShopifyDeliveryList 
            status="delivered" 
            title="Delivered Orders"
          />
        </TabsContent>

        <TabsContent value="exception">
          <ShopifyDeliveryList 
            status="exception" 
            title="Orders with Issues"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
