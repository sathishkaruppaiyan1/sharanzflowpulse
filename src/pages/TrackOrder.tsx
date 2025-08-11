
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrackingByOrderNumber } from '@/hooks/useTrackingByOrderNumber';
import { Package, Truck, MapPin, Calendar, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const TrackOrder: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');

  const { data: trackingData, isLoading, error } = useTrackingByOrderNumber(searchOrderNumber);

  const handleSearch = () => {
    if (orderNumber.trim()) {
      setSearchOrderNumber(orderNumber.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Track Your Order</h1>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Enter Order Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter order number (e.g., BS2568)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading || !orderNumber.trim()}>
              {isLoading ? 'Searching...' : 'Track Order'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <Package className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-medium mb-2">Error Fetching Tracking Data</h3>
              <p className="text-sm">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {trackingData && trackingData.trackings && trackingData.trackings.length > 0 && (
        <div className="space-y-4">
          {trackingData.trackings.map((tracking, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Truck className="mr-2 h-5 w-5" />
                    Tracking: {tracking.tracking_number}
                  </div>
                  <Badge variant={tracking.status === 'delivered' ? 'default' : 'secondary'}>
                    {tracking.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Carrier</p>
                      <p className="font-medium">{tracking.courier_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Route</p>
                      <p className="font-medium">{tracking.origin_country} → {tracking.destination_country}</p>
                    </div>
                  </div>
                  
                  {tracking.estimated_delivery_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Est. Delivery</p>
                        <p className="font-medium">{new Date(tracking.estimated_delivery_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub Status */}
                {tracking.sub_status && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">Status Details</p>
                    <p className="font-medium">{tracking.sub_status}</p>
                  </div>
                )}

                {/* Tracking Events */}
                {tracking.tracking_events && tracking.tracking_events.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      Tracking History
                    </h4>
                    <div className="space-y-3">
                      {tracking.tracking_events.map((event, eventIndex) => (
                        <div key={eventIndex} className="flex items-start space-x-3 p-3 border-l-2 border-blue-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{event.description}</p>
                              <span className="text-sm text-gray-500">
                                {new Date(event.time).toLocaleString()}
                              </span>
                            </div>
                            {event.location && (
                              <p className="text-sm text-gray-600">{event.location}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchOrderNumber && trackingData && (!trackingData.trackings || trackingData.trackings.length === 0) && !isLoading && !error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Tracking Information Found</h3>
              <p className="text-sm">No tracking data found for order number: {searchOrderNumber}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackOrder;
