
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Calendar, Truck, AlertCircle } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ShopifyDeliveryListProps {
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  title: string;
}

const ShopifyDeliveryList: React.FC<ShopifyDeliveryListProps> = ({ status, title }) => {
  const { orders, loading: ordersLoading, error: ordersError } = useShopifyOrders();

  // Fetch stored tracking details from database
  const { data: trackingData, isLoading: trackingLoading } = useQuery({
    queryKey: ['stored-tracking-details', orders?.length || 0],
    queryFn: async () => {
      if (!orders || orders.length === 0) return [];

      console.log(`Fetching stored tracking details for ${orders.length} orders`);
      
      const orderIds = orders.map(order => order.id);
      
      const { data, error } = await supabase
        .from('order_tracking_details')
        .select('*')
        .in('order_id', orderIds);

      if (error) {
        console.error('Error fetching stored tracking details:', error);
        return [];
      }

      console.log(`Found ${data.length} stored tracking records`);
      return data || [];
    },
    enabled: Boolean(orders) && orders.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Filter orders based on stored tracking status
  const filteredOrders = React.useMemo(() => {
    if (!trackingData || !orders) return [];

    return orders.filter(order => {
      const trackingInfo = trackingData.find(t => t.order_id === order.id);
      const trackingStatus = trackingInfo?.status?.toLowerCase();
      
      console.log(`Order ${order.order_number}: Stored status = ${trackingStatus}, Filter = ${status}`);
      
      switch (status) {
        case 'in_transit':
          // In transit: shipped, pickup, transit, etc.
          return trackingStatus && [
            'transit', 'in_transit', 'shipped', 'pickup', 'dispatched',
            'on_the_way', 'sorting', 'processing', 'pending'
          ].includes(trackingStatus);
          
        case 'out_for_delivery':
          // Out for delivery
          return trackingStatus && [
            'out_for_delivery', 'out_for_delivery_date', 'delivering'
          ].includes(trackingStatus);
          
        case 'delivered':
          // Delivered successfully
          return trackingStatus && [
            'delivered', 'delivered_date'
          ].includes(trackingStatus);
          
        case 'exception':
          // Problems, undelivered, failed delivery attempts, or no tracking
          return trackingStatus && [
            'exception', 'undelivered', 'failed_attempt', 'returned',
            'lost', 'damaged', 'refused', 'address_issue', 'error', 'no_tracking'
          ].includes(trackingStatus) || 
          // Orders without any tracking data
          !trackingInfo;
          
        default:
          return false;
      }
    }).map(order => {
      // Enhance order with stored tracking data
      const trackingInfo = trackingData.find(t => t.order_id === order.id);
      return {
        ...order,
        storedTracking: trackingInfo || null
      };
    });
  }, [orders, trackingData, status]);

  const loading = ordersLoading || trackingLoading;
  const error = ordersError;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner text="Loading orders and tracking data..." />
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
            <p className="text-sm">No orders match the current status criteria.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <ShopifyOrderCardWithStoredTracking key={order.id} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ShopifyOrderCardWithStoredTracking: React.FC<{ order: any }> = ({ order }) => {
  const getStatusColor = (tracking: any) => {
    if (!tracking) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const status = tracking.status?.toLowerCase();
    switch (true) {
      case status?.includes('delivered'): 
        return 'bg-green-100 text-green-800 border-green-200';
      case status?.includes('out_for_delivery'): 
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case status?.includes('transit') || status?.includes('shipped'): 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case status?.includes('exception') || status?.includes('error') || status?.includes('no_tracking'): 
        return 'bg-red-100 text-red-800 border-red-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    if (order.storedTracking?.sub_status) {
      return order.storedTracking.sub_status;
    }
    if (order.storedTracking?.status) {
      return order.storedTracking.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return order.fulfillment_status || 'Unknown';
  };

  const tracking = order.storedTracking;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{order.order_number}</span>
          </div>
          <Badge className={getStatusColor(tracking)}>
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

        {tracking?.tracking_number && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <Truck className="h-3 w-3 mr-1" />
              Tracking:
            </span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {tracking.tracking_number}
            </span>
          </div>
        )}

        {tracking?.courier_name && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Carrier:</span>
            <span className="font-medium">{tracking.courier_name}</span>
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
            {tracking?.delivered_at && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Delivered: {formatDate(tracking.delivered_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Show latest tracking event if available */}
        {tracking?.tracking_events && tracking.tracking_events.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600">
              <div className="font-medium">Latest Update:</div>
              <div className="mt-1">
                {tracking.tracking_events[0].description}
                {tracking.tracking_events[0].location && (
                  <span className="text-gray-500"> - {tracking.tracking_events[0].location}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show last updated time */}
        {tracking?.last_updated && (
          <div className="pt-1 text-xs text-gray-400">
            Updated: {formatDate(tracking.last_updated)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShopifyDeliveryList;
