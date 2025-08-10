import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Calendar, Truck, AlertCircle, RefreshCw } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useTrackingSync } from '@/hooks/useTrackingSync';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ShopifyDeliveryListProps {
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  title: string;
}

const ShopifyDeliveryList: React.FC<ShopifyDeliveryListProps> = ({ status, title }) => {
  const { orders, loading: ordersLoading, error: ordersError } = useShopifyOrders();
  const { syncStatus } = useTrackingSync();

  // Get only the last 5 orders for testing
  const last5Orders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    // Sort by created_at descending and take first 5
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log(`📋 Testing with last 5 orders out of ${orders.length} total orders`);
    return sortedOrders.slice(0, 5);
  }, [orders]);

  // Fetch stored tracking details from database for last 5 orders only
  const { data: trackingData, isLoading: trackingLoading, refetch: refetchTracking } = useQuery({
    queryKey: ['stored-tracking-details-test', last5Orders?.length || 0],
    queryFn: async () => {
      if (!last5Orders || last5Orders.length === 0) return [];

      console.log(`🔍 Fetching tracking details for last 5 orders:`, last5Orders.map(o => o.order_number));
      
      const orderIds = last5Orders.map(order => order.id);
      
      const { data, error } = await supabase
        .from('order_tracking_details')
        .select('*')
        .in('order_id', orderIds);

      if (error) {
        console.error('Error fetching stored tracking details:', error);
        return [];
      }

      console.log(`✅ Found ${data.length} tracking records for last 5 orders`);
      return data || [];
    },
    enabled: Boolean(last5Orders) && last5Orders.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Auto-refresh tracking data when sync completes
  React.useEffect(() => {
    if (!syncStatus.isSync && syncStatus.processed > 0) {
      // Sync completed, refresh tracking data
      console.log('🔄 Sync completed, refreshing tracking data for last 5 orders...');
      refetchTracking();
    }
  }, [syncStatus.isSync, syncStatus.processed, refetchTracking]);

  // Filter orders based on stored tracking status
  const filteredOrders = React.useMemo(() => {
    if (!trackingData || !last5Orders) return [];

    return last5Orders.filter(order => {
      const trackingInfo = trackingData.find(t => t.order_id === order.id);
      const trackingStatus = trackingInfo?.status?.toLowerCase();
      
      console.log(`🔍 Order ${order.order_number}: Stored status = ${trackingStatus}, Filter = ${status}`);
      
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
  }, [last5Orders, trackingData, status]);

  const loading = ordersLoading || trackingLoading;
  const error = ordersError;

  // Show sync progress if currently syncing
  if (syncStatus.isSync) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCw className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Syncing Tracking Details (Testing Last 5 Orders)
              </h3>
              <p className="text-gray-600 mb-4">
                Processing {syncStatus.processed} of {syncStatus.total} orders
              </p>
              {syncStatus.currentOrder && (
                <div className="text-sm text-gray-500">
                  Currently processing: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{syncStatus.currentOrder}</span>
                </div>
              )}
              <div className="w-full max-w-xs mx-auto mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(syncStatus.processed / syncStatus.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((syncStatus.processed / syncStatus.total) * 100)}% complete
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner text="Loading last 5 orders..." />
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
          <span>{title} (Testing Last 5 Orders)</span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {filteredOrders.length} of {last5Orders.length} orders
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Total: {orders?.length || 0}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Debug info */}
        <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <div><strong>Debug Info:</strong></div>
          <div>• Total orders fetched: {orders?.length || 0}</div>
          <div>• Last 5 orders being tested: {last5Orders.length}</div>
          <div>• Tracking records found: {trackingData?.length || 0}</div>
          <div>• Orders matching "{status}" status: {filteredOrders.length}</div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-sm">No orders in the last 5 match the "{status}" status criteria.</p>
            {last5Orders.length > 0 && (
              <div className="mt-4 text-xs">
                <div className="font-medium mb-2">Last 5 orders being tested:</div>
                {last5Orders.map(order => {
                  const tracking = trackingData?.find(t => t.order_id === order.id);
                  return (
                    <div key={order.id} className="text-left bg-white p-2 rounded border mb-1">
                      <div className="font-mono">{order.order_number}</div>
                      <div>Status: {tracking?.status || 'No tracking'}</div>
                    </div>
                  );
                })}
              </div>
            )}
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
