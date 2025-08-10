
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Calendar, Truck, AlertCircle } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useTrackingDetails } from '@/hooks/useTrackingDetails';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DeliveryOrderCard from './DeliveryOrderCard';

interface ShopifyDeliveryListProps {
  status: 'shipped' | 'out_for_delivery' | 'delivered' | 'exception';
  title: string;
}

const ShopifyDeliveryList: React.FC<ShopifyDeliveryListProps> = ({ status, title }) => {
  const { orders, loading, error } = useShopifyOrders();

  // Filter orders based on fulfillment status and webhook tracking data
  const filteredOrders = orders.filter(order => {
    if (status === 'shipped') {
      return order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partial';
    } else if (status === 'delivered') {
      return order.fulfillment_status === 'fulfilled';
    } else if (status === 'out_for_delivery') {
      // We'll check webhook data for out_for_delivery status
      return order.fulfillment_status === 'fulfilled';
    } else if (status === 'exception') {
      return order.fulfillment_status === 'unfulfilled' && 
             (order.financial_status === 'paid' || order.financial_status === 'partially_paid');
    }
    return false;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading orders</h3>
          <p className="text-gray-600 text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">
            {filteredOrders.length} orders
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-sm">No orders match the current filter criteria.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <ShopifyOrderCard key={order.id} order={order} status={status} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ShopifyOrderCard: React.FC<{ 
  order: any; 
  status: 'shipped' | 'out_for_delivery' | 'delivered' | 'exception';
}> = ({ order, status }) => {
  const { data: trackingDetails } = useTrackingDetails(order.id);

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'exception': return 'bg-red-100 text-red-800 border-red-200';
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

  const getDisplayStatus = () => {
    if (trackingDetails?.status) {
      return trackingDetails.sub_status || trackingDetails.status;
    }
    
    switch (status) {
      case 'shipped': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'exception': return 'Needs Attention';
      default: return order.fulfillment_status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{order.order_number}</span>
          </div>
          <Badge className={getStatusColor(status)}>
            {getDisplayStatus()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Customer:</span>
          <span className="font-medium">
            {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium">{order.currency} {order.total_amount}</span>
        </div>

        {trackingDetails?.tracking_number && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <Truck className="h-3 w-3 mr-1" />
              Tracking:
            </span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {trackingDetails.tracking_number}
            </span>
          </div>
        )}

        {trackingDetails?.courier_name && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Carrier:</span>
            <span className="font-medium">{trackingDetails.courier_name}</span>
          </div>
        )}

        {order.shipping_address && (
          <div className="flex items-start space-x-2 text-sm">
            <MapPin className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="text-gray-600">
              <div>{order.shipping_address.city}, {order.shipping_address.province}</div>
              <div>{order.shipping_address.zip}</div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Created: {formatDate(order.created_at)}</span>
            </div>
            {trackingDetails?.delivered_at && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Delivered: {formatDate(trackingDetails.delivered_at)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopifyDeliveryList;
