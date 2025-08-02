
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Clock, MapPin, Truck, List, AlertCircle, CheckCircle, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParcelPanelService } from '@/services/parcelPanelService';
import { useTrackingDetails } from '@/hooks/useTrackingDetails';
import DeliveryTabs from '@/components/delivery/DeliveryTabs';
import TrackingDetailsCard from '@/components/tracking/TrackingDetailsCard';

const Delivery = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedOrderId, setSearchedOrderId] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<{ testing: boolean; connected: boolean; message: string }>({
    testing: false,
    connected: false,
    message: ''
  });
  const { toast } = useToast();
  const { service: parcelPanelService, isConfigured, loading: configLoading } = useParcelPanelService();

  // Use webhook tracking details for searched order
  const { data: webhookTrackingDetails, isLoading: webhookLoading } = useTrackingDetails(searchedOrderId);

  // Test API connection on component mount
  useEffect(() => {
    const testApiConnection = async () => {
      if (configLoading) {
        setApiStatus({
          testing: false,
          connected: false,
          message: 'Loading configuration...'
        });
        return;
      }

      if (!isConfigured || !parcelPanelService) {
        setApiStatus({
          testing: false,
          connected: false,
          message: 'API not configured - Please set up Parcel Panel API key in Settings'
        });
        return;
      }

      setApiStatus(prev => ({ ...prev, testing: true }));
      
      try {
        const result = await parcelPanelService.testConnection();
        setApiStatus({
          testing: false,
          connected: result.success,
          message: result.message
        });
        
        if (result.success) {
          console.log('✅ Parcel Panel API connection successful');
        } else {
          console.error('❌ Parcel Panel API connection failed:', result.message);
        }
      } catch (error) {
        console.error('API connection test error:', error);
        setApiStatus({
          testing: false,
          connected: false,
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    };

    testApiConnection();
  }, [isConfigured, parcelPanelService, configLoading]);

  const trackPackage = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Info",
      description: "Tracking functionality is available through webhook data. Please use the Order tracking tab to view tracking details.",
    });
  };

  const trackByOrderNumber = () => {
    if (!orderNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter an order number",
        variant: "destructive",
      });
      return;
    }

    // For webhook-based tracking, we need to find the order by order number
    // This would typically involve querying your orders database
    toast({
      title: "Info",
      description: "Please use the webhook tracking data. Enter the order ID if available.",
    });
  };

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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Delivery Management</h2>
      </div>

      {/* API Status Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {apiStatus.testing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : apiStatus.connected ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                Parcel Panel API Status: {apiStatus.testing ? 'Testing...' : apiStatus.message}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={apiStatus.connected ? 'default' : 'destructive'}>
                {apiStatus.connected ? 'Connected' : 'Disconnected'}
              </Badge>
              {!isConfigured && !configLoading && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/settings'}
                >
                  Configure API
                </Button>
              )}
            </div>
          </div>
          {!isConfigured && !configLoading && (
            <div className="mt-2 text-xs text-gray-600">
              Go to Settings → API Configuration to set up your Parcel Panel API key
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Orders</span>
          </TabsTrigger>
          <TabsTrigger value="track-package" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Track Package</span>
          </TabsTrigger>
          <TabsTrigger value="track-order" className="flex items-center space-x-2">
            <Hash className="h-4 w-4" />
            <span>Webhook Tracking</span>
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
              orderNumber={orderNumber}
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

        <TabsContent value="track-package" className="space-y-4">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="mr-2 h-5 w-5" />
                Track Your Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && trackPackage()}
                  className="flex-1"
                />
                <Button onClick={trackPackage} disabled={!isConfigured}>
                  Track
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Package tracking is now available through webhook data. Please check the Orders tab or use the Webhook Tracking tab.
                </p>
                {!isConfigured && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    API Not Configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tracking via Webhook Data</h3>
              <p className="text-gray-600 text-center max-w-md">
                Package tracking is now handled through webhook data. Please use the Orders tab to view delivery status or the Webhook Tracking tab for detailed tracking information.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
