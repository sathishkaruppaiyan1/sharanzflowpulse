
import React from 'react';
import { useOrdersByStage } from '@/hooks/useOrders';
import DeliveryOrderCard from './DeliveryOrderCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Package } from 'lucide-react';

interface DeliveryOrdersListProps {
  stages: string[];
  title: string;
}

const DeliveryOrdersList: React.FC<DeliveryOrdersListProps> = ({ stages, title }) => {
  const { data: orders, isLoading, error } = useOrdersByStage(stages);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        Error loading orders: {error.message}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Package className="h-12 w-12 mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">No {title.toLowerCase()} orders</h3>
        <p className="text-sm">Orders will appear here once they reach this stage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {title} ({orders.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <DeliveryOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
};

export default DeliveryOrdersList;
