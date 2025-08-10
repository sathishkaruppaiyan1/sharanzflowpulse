
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { useTrackingByOrderNumber } from '@/hooks/useTrackingByOrderNumber';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Delivery = () => {
  const orderNumber = 'BS2568';
  const { data: trackingData, isLoading, error } = useTrackingByOrderNumber(orderNumber);

  console.log('Delivery page - tracking data:', trackingData);
  console.log('Delivery page - error:', error);
  console.log('Delivery page - isLoading:', isLoading);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Delivery Tracking</h1>
        <p className="text-gray-600 mt-2">Tracking details for order {orderNumber}</p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner text="Fetching tracking details..." />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading tracking</h3>
            <p className="text-gray-600 text-center mb-4">{error.message}</p>
            {error.message.includes('not configured') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  Please configure your Parcel Panel API in the Settings page to enable tracking functionality.
                </p>
              </div>
            )}
            {error.message.includes('Failed to fetch') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  No tracking information found for order {orderNumber}. The order may not exist in Parcel Panel or tracking hasn't been set up yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {trackingData && trackingData.trackings && trackingData.trackings.length > 0 && (
        <div className="space-y-6">
          {trackingData.trackings.map((tracking, index) => (
            <div key={index} className="space-y-4">
              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      {tracking.tracking_number}
                    </div>
                    <Badge className={getStatusColor(tracking.status)}>
                      {tracking.sub_status || tracking.status}
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
                          {tracking.courier_name || tracking.courier_code}
                        </p>
                      </div>
                    </div>
                    
                    {tracking.origin_country && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Origin</p>
                          <p className="text-sm text-gray-600">{tracking.origin_country}</p>
                        </div>
                      </div>
                    )}
                    
                    {tracking.estimated_delivery_date && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Estimated Delivery</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(tracking.estimated_delivery_date)}
                          </p>
                        </div>
                      </div>
                    )}

                    {tracking.delivered_at && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Delivered At</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(tracking.delivered_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Events */}
              {tracking.tracking_events && tracking.tracking_events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tracking.tracking_events
                        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                        .map((event, eventIndex) => (
                        <div key={eventIndex} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            eventIndex === 0 ? 'bg-blue-600' : 'bg-gray-300'
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      {trackingData && (!trackingData.trackings || trackingData.trackings.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No tracking data found</h3>
              <p className="text-sm">No tracking information available for order {orderNumber}</p>
              <p className="text-xs mt-2 text-gray-400">
                This may be because the order hasn't shipped yet or tracking hasn't been set up in Parcel Panel.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Delivery;
