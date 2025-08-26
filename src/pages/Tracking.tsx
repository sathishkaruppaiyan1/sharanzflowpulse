
import React from 'react';
import { useOrdersByStage } from '@/hooks/useOrders';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Tracking = () => {
  const { data: trackingOrders, isLoading: trackingLoading } = useOrdersByStage('tracking');
  const { data: packingOrders, isLoading: packingLoading } = useOrdersByStage('packing');

  if (trackingLoading || packingLoading) {
    return <LoadingSpinner />;
  }

  // Combine tracking orders with packing orders for stats calculation
  // This allows TrackingStats to show "ready to ship" orders from packing stage
  const allRelevantOrders = [
    ...(trackingOrders || []),
    ...(packingOrders || [])
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
      </div>
      
      <TrackingStats orders={allRelevantOrders} />
      <TrackingQueue orders={trackingOrders || []} />
    </div>
  );
};

export default Tracking;
