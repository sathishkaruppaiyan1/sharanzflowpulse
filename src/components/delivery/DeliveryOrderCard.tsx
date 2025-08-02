import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Calendar, Truck } from 'lucide-react';
import { Order } from '@/types/database';
import { getCourierDisplayName } from '@/services/interaktService';

interface DeliveryOrderCardProps {
  order: Order;
}

const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({ order }) => {
  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tracking': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-600" />
            <span>{order.order_number}</span>
          </div>
          <Badge className={getStatusColor(order.stage)}>
            {order.stage === 'shipped' ? 'In Transit' : 
             order.stage === 'delivered' ? 'Delivered' : 
             order.stage === 'tracking' ? 'Ready to Ship' : order.stage}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Customer:</span>
          <span className="font-medium">
            {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'N/A'}
          </span>
        </div>

        {order.tracking_number && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <Truck className="h-3 w-3 mr-1" />
              Tracking:
            </span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {order.tracking_number}
            </span>
          </div>
        )}

        {order.carrier && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Carrier:</span>
            <span className="font-medium">{getCourierDisplayName(order.carrier)}</span>
          </div>
        )}

        {order.shipping_address && (
          <div className="flex items-start space-x-2 text-sm">
            <MapPin className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="text-gray-600">
              <div>{order.shipping_address.city}, {order.shipping_address.state}</div>
              <div>{order.shipping_address.postal_code}</div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Created: {formatDate(order.created_at)}</span>
            </div>
            {(order.delivered_at || order.shipped_at) && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {order.delivered_at ? `Delivered: ${formatDate(order.delivered_at)}` : 
                   order.shipped_at ? `Shipped: ${formatDate(order.shipped_at)}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryOrderCard;
