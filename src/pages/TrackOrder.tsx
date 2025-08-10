
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Clock, Truck, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useTrackingByOrderNumber } from '@/hooks/useTrackingByOrderNumber';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  
  const { data: trackingData, isLoading, error, refetch } = useTrackingByOrderNumber(searchOrderNumber);

  const handleSearch = () => {
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }
    setSearchOrderNumber(orderNumber.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
        <p className="text-gray-600 mt-2">Enter your order number to get tracking details</p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Order Tracking
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
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !orderNumber.trim()}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Track Order
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <h3 className="font-medium text-red-900">Error fetching tracking details</h3>
                <p className="text-sm text-red-700 mt-1">
                  {error.message.includes('Invalid API key') 
                    ? 'API configuration issue. Please contact support.' 
                    : error.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Results */}
      {trackingData && trackingData.trackings && trackingData.trackings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Tracking Details</h2>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              Live from API
            </Badge>
          </div>
          
          {trackingData.trackings.map((tracking, index) => (
            <div key={index} className="space-y-4">
              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      Order: {searchOrderNumber}
                    </div>
                    <Badge className={getStatusColor(tracking.status)}>
                      {tracking.sub_status || tracking.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Tracking Number</p>
                        <p className="text-sm text-gray-600">{tracking.tracking_number}</p>
                      </div>
                    </div>
                    
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

      {/* No Results */}
      {searchOrderNumber && !isLoading && (!trackingData || !trackingData.trackings || trackingData.trackings.length === 0) && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No tracking data found</h3>
              <p className="text-sm">No tracking information available for order {searchOrderNumber}</p>
              <p className="text-xs mt-2 text-gray-400">
                This may be because the order hasn't shipped yet or tracking hasn't been set up.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!searchOrderNumber && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Enter an order number to track</h3>
              <p className="text-sm">Type your order number in the search field above</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackOrder;
