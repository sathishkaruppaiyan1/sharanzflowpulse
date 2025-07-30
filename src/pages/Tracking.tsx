
import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import TrackingScanner from '@/components/tracking/TrackingScanner';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Tracking = () => {
  const { data: orders = [], isLoading, error } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const trackingOrders = orders.filter(order => order.stage === 'tracking');

  const handleOrderTracked = (orderId: string) => {
    // Order tracking handled by scanner component
    console.log('Order tracked:', orderId);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading orders: {error.message}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tracking Management</h1>
      </div>

      <TrackingStats orders={trackingOrders} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Scanner</h2>
            <TrackingScanner 
              orders={trackingOrders}
              onOrderTracked={handleOrderTracked}
              onOrderSelected={setSelectedOrder}
            />
          </div>
        </div>

        <div className="space-y-6">
          <TrackingQueue 
            orders={trackingOrders} 
            selectedOrder={selectedOrder}
          />
        </div>
      </div>
    </div>
  );
};

export default Tracking;
