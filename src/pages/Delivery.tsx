
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Clock, MapPin, Truck, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import DeliveryTabs from '@/components/delivery/DeliveryTabs';

interface TrackingEvent {
  time: string;
  description: string;
  location?: string;
  status?: string;
}

interface DeliveryInfo {
  trackingNumber: string;
  carrierCode: string;
  carrierName: string;
  status: string;
  statusDetail: string;
  originCountry?: string;
  destinationCountry?: string;
  events: TrackingEvent[];
  estimatedDelivery?: string;
  actualDelivery?: string;
}

const Delivery = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { apiConfigs } = useApiConfigs();

  const trackPackage = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    if (!apiConfigs.parcel_panel?.enabled || !apiConfigs.parcel_panel?.api_key) {
      toast({
        title: "Error",
        description: "Parcel Panel API is not configured. Please check settings.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiConfigs.parcel_panel.base_url}/v1/tracking/track`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfigs.parcel_panel.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_number: trackingNumber.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const trackingData = data.data;
        const formattedInfo: DeliveryInfo = {
          trackingNumber: trackingData.tracking_number,
          carrierCode: trackingData.courier_code,
          carrierName: trackingData.courier_name || trackingData.courier_code,
          status: trackingData.status,
          statusDetail: trackingData.sub_status || trackingData.status,
          originCountry: trackingData.origin_country,
          destinationCountry: trackingData.destination_country,
          estimatedDelivery: trackingData.estimated_delivery_date,
          actualDelivery: trackingData.delivered_at,
          events: trackingData.tracking_events?.map((event: any) => ({
            time: event.time,
            description: event.description,
            location: event.location,
            status: event.status,
          })) || [],
        };
        setDeliveryInfo(formattedInfo);
      } else {
        throw new Error(data.message || 'Tracking information not found');
      }
    } catch (error) {
      console.error('Error tracking package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to track package",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'exception': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
                <Button onClick={trackPackage} disabled={loading}>
                  {loading ? 'Tracking...' : 'Track'}
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Powered by Parcel Panel - Track packages from all major carriers
              </p>
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
                      {deliveryInfo.trackingNumber}
                    </div>
                    <Badge className={getStatusColor(deliveryInfo.status)}>
                      {deliveryInfo.statusDetail}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Carrier</p>
                        <p className="text-sm text-gray-600">{deliveryInfo.carrierName}</p>
                      </div>
                    </div>
                    
                    {deliveryInfo.originCountry && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Origin</p>
                          <p className="text-sm text-gray-600">{deliveryInfo.originCountry}</p>
                        </div>
                      </div>
                    )}
                    
                    {deliveryInfo.estimatedDelivery && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Estimated Delivery</p>
                          <p className="text-sm text-gray-600">
                            {new Date(deliveryInfo.estimatedDelivery).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Events */}
              {deliveryInfo.events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deliveryInfo.events.map((event, index) => (
                        <div key={index} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{event.description}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(event.time).toLocaleString()}
                              </p>
                            </div>
                            {event.location && (
                              <p className="text-xs text-gray-600 mt-1">{event.location}</p>
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
                  Enter a tracking number above to get detailed delivery information and real-time updates using Parcel Panel.
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
