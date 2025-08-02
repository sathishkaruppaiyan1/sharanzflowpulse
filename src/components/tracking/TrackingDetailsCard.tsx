import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { useTrackingDetails } from '@/hooks/useTrackingDetails';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface TrackingDetailsCardProps {
  orderId: string;
  orderNumber: string;
}

const TrackingDetailsCard: React.FC<TrackingDetailsCardProps> = ({ orderId, orderNumber }) => {
  const { data: trackingDetails, isLoading, error } = useTrackingDetails(orderId);

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error loading tracking details
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trackingDetails) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Package className="h-5 w-5 mr-2" />
            No tracking details available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              {trackingDetails.tracking_number}
            </div>
            <Badge className={getStatusColor(trackingDetails.status)}>
              {trackingDetails.sub_status || trackingDetails.status}
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
                  {trackingDetails.courier_name || trackingDetails.courier_code}
                </p>
              </div>
            </div>
            
            {trackingDetails.origin_country && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Origin</p>
                  <p className="text-sm text-gray-600">{trackingDetails.origin_country}</p>
                </div>
              </div>
            )}
            
            {trackingDetails.estimated_delivery_date && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Estimated Delivery</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(trackingDetails.estimated_delivery_date)}
                  </p>
                </div>
              </div>
            )}

            {trackingDetails.delivered_at && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Delivered At</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(trackingDetails.delivered_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tracking Events */}
      {trackingDetails.tracking_events && trackingDetails.tracking_events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingDetails.tracking_events
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

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {formatDate(trackingDetails.last_updated)}
      </div>
    </div>
  );
};

export default TrackingDetailsCard; 