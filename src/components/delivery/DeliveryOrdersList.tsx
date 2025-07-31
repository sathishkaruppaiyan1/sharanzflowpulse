
import React from 'react';
import { useOrdersByStage } from '@/hooks/useOrders';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Package, MapPin, Calendar, Truck, User, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeliveryOrdersListProps {
  stages: string[];
  title: string;
}

const DeliveryOrdersList: React.FC<DeliveryOrdersListProps> = ({ stages, title }) => {
  const { data: orders, isLoading, error } = useOrdersByStage(stages);

  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tracking': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'exception': return 'bg-red-100 text-red-800 border-red-200';
      case 'returned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
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

  const getStatusLabel = (stage: string) => {
    switch (stage) {
      case 'shipped': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'tracking': return 'Ready to Ship';
      case 'exception': return 'Exception';
      case 'returned': return 'Returned';
      case 'failed': return 'Failed';
      default: return stage;
    }
  };

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
      
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Hash className="h-3 w-3 text-gray-400" />
                        <span className="text-sm font-mono">{order.order_number}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">
                          {order.customer ? 
                            `${order.customer.first_name} ${order.customer.last_name}` : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(order.stage)}>
                        {getStatusLabel(order.stage)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {order.tracking_number ? (
                        <div className="flex items-center space-x-2">
                          <Truck className="h-3 w-3 text-gray-400" />
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {order.tracking_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No tracking</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">
                        {order.carrier || 'N/A'}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      {order.shipping_address ? (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <div className="text-sm text-gray-600">
                            {order.shipping_address.city}, {order.shipping_address.state}
                            <br />
                            <span className="text-xs">{order.shipping_address.postal_code}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No address</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-xs text-gray-500 space-y-1">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryOrdersList;
