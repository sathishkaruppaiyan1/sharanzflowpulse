
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Clock, MapPin, Truck, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParcelPanelService, ParcelPanelTrackingInfo } from '@/services/parcelPanelService';
import DeliveryTabs from '@/components/delivery/DeliveryTabs';

const Delivery = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<ParcelPanelTrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { service: parcelPanelService, isConfigured } = useParcelPanelService();

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

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Orders</span>
          </TabsTrigger>
          <TabsTrigger value="track-package" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Track Package</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <DeliveryTabs />
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
                  Powered by Parcel Panel - Track packages from all major carriers
                </p>
                {!isConfigured && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    API Not Configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          {deliveryInfo && (
            <div className="space-y-4">
              {/* Status Overview */}
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

              {/* Tracking Events */}
              {deliveryInfo.tracking_events && deliveryInfo.tracking_events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking History</CardTitle>
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
          )}

          {/* Empty State */}
          {!deliveryInfo && !loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tracking information</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Enter a tracking number above to get detailed delivery information and real-time updates using Parcel Panel API v2.
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
