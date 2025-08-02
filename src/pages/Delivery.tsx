import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Clock, MapPin, Truck, List, AlertCircle, CheckCircle, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParcelPanelService, ParcelPanelTrackingInfo } from '@/services/parcelPanelService';
import { useTrackingByOrderNumber } from '@/hooks/useTrackingByOrderNumber';
import { useTrackingDetails } from '@/hooks/useTrackingDetails';
import DeliveryTabs from '@/components/delivery/DeliveryTabs';
import TrackingDetailsCard from '@/components/tracking/TrackingDetailsCard';

const Delivery = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedOrderId, setSearchedOrderId] = useState<string>('');
  const [deliveryInfo, setDeliveryInfo] = useState<ParcelPanelTrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ testing: boolean; connected: boolean; message: string }>({
    testing: false,
    connected: false,
    message: ''
  });
  const { toast } = useToast();
  const { service: parcelPanelService, isConfigured, loading: configLoading } = useParcelPanelService();

  // Use the new hook for tracking by order number
  const { data: orderTrackingData, isLoading: orderTrackingLoading, error: orderTrackingError } = useTrackingByOrderNumber(orderNumber);
  
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

  // Handle order tracking results
  useEffect(() => {
    if (orderTrackingData) {
      setDeliveryInfo(orderTrackingData);
      // Try to find the order ID for webhook data
      if (orderTrackingData.order_number) {
        // Here you would typically have a way to get order ID from order number
        // For now, we'll rely on the API data and webhook data separately
      }
      toast({
        title: "Success",
        description: "Order tracking information retrieved successfully",
      });
    }
  }, [orderTrackingData, toast]);

  useEffect(() => {
    if (orderTrackingError) {
      toast({
        title: "Error",
        description: `Failed to fetch order tracking: ${orderTrackingError.message}`,
        variant: "destructive",
      });
    }
  }, [orderTrackingError, toast]);

  const trackPackage = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    if (!isConfigured || !parcelPanelService) {
      toast({
        title: "Error",
        description: "Parcel Panel API is not configured. Please check settings.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await parcelPanelService.trackPackage(trackingNumber.trim());
      
      if (response.code === 200 && response.data) {
        setDeliveryInfo(response.data);
        toast({
          title: "Success",
          description: "Package tracking information retrieved successfully",
        });
      } else {
        throw new Error(response.message || 'Tracking information not found');
      }
    } catch (error) {
      console.error('Error tracking package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to track package",
        variant: "destructive",
      });
      setDeliveryInfo(null);
    } finally {
      setLoading(false);
    }
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

    if (!isConfigured || !parcelPanelService) {
      toast({
        title: "Error",
        description: "Parcel Panel API is not configured. Please check settings.",
        variant: "destructive",
      });
      return;
    }

    // The useTrackingByOrderNumber hook will automatically trigger when orderNumber changes
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_transit': 
      case 'transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out_for_delivery': 
      case 'out for delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'exception': 
      case 'returned': 
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': 
      case 'info_received': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
            <span>Track by Order</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <DeliveryTabs />
        </TabsContent>

        <TabsContent value="track-order" className="space-y-4">
          {/* Order Number Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="mr-2 h-5 w-5" />
                Track by Order Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter order number..."
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && trackByOrderNumber()}
                  className="flex-1"
                />
                <Button 
                  onClick={trackByOrderNumber} 
                  disabled={orderTrackingLoading || !isConfigured}
                >
                  {orderTrackingLoading ? 'Tracking...' : 'Track'}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Track packages using order number via Parcel Panel API + Webhook data
                </p>
                {!isConfigured && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    API Not Configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Show tracking results - prioritize webhook data if available */}
          {(webhookTrackingDetails || deliveryInfo) && (
            <div className="space-y-4">
              {webhookTrackingDetails ? (
                <TrackingDetailsCard 
                  orderId={searchedOrderId} 
                  orderNumber={orderNumber}
                />
              ) : deliveryInfo ? (
                <div className="space-y-4">
                  {/* Status Overview from API */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Package className="mr-2 h-5 w-5" />
                          {deliveryInfo.tracking_number}
                        </div>
                        <Badge className={getStatusColor(deliveryInfo.status)}>
                          {deliveryInfo.sub_status || deliveryInfo.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">Carrier</p>
                            <p className="text-sm text-gray-600">
                              {deliveryInfo.courier_name || deliveryInfo.courier_code}
                            </p>
                          </div>
                        </div>
                        
                        {deliveryInfo.origin_country && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">Origin</p>
                              <p className="text-sm text-gray-600">{deliveryInfo.origin_country}</p>
                            </div>
                          </div>
                        )}
                        
                        {deliveryInfo.estimated_delivery_date && (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">Estimated Delivery</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(deliveryInfo.estimated_delivery_date)}
                              </p>
                            </div>
                          </div>
                        )}

                        {deliveryInfo.delivered_at && (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">Delivered At</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(deliveryInfo.delivered_at)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tracking Events from API */}
                  {deliveryInfo.tracking_events && deliveryInfo.tracking_events.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Tracking History (API)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {deliveryInfo.tracking_events
                            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                            .map((event, index) => (
                            <div key={index} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                              }`}></div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{event.description}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(event.time)}
                                  </p>
                                </div>
                                {event.location && (
                                  <p className="text-xs text-gray-600 mt-1">{event.location}</p>
                                )}
                                {event.status && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {event.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Empty State */}
          {!deliveryInfo && !orderTrackingLoading && !webhookTrackingDetails && !webhookLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Hash className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tracking information</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Enter an order number above to get detailed delivery information from both API and webhook data.
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
                <Button onClick={trackPackage} disabled={loading || !isConfigured}>
                  {loading ? 'Tracking...' : 'Track'}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Powered by Parcel Panel API v2 - Track packages from all major carriers
                </p>
                {!isConfigured && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    API Not Configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
