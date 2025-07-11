
import React from 'react';
import { Package, Phone, Truck, Hash, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Order } from '@/types/database';

interface CompletedOrdersListProps {
  orders: Order[];
}

const CompletedOrdersList = ({ orders }: CompletedOrdersListProps) => {
  const completedOrders = orders.filter(order => 
    order.stage === 'delivered' || order.stage === 'shipped'
  );

  const getCourierDisplayName = (carrier: string | null) => {
    switch (carrier) {
      case 'frenchexpress':
        return 'French Express';
      case 'delhivery':
        return 'Delhivery';
      default:
        return 'Other';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (completedOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Orders</h3>
            <p className="text-gray-500">Completed orders will appear here once they are shipped or delivered.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Completed Orders ({completedOrders.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span>{order.order_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.customer ? (
                      <div>
                        <div className="font-medium">
                          {order.customer.first_name} {order.customer.last_name}
                        </div>
                        {order.customer.email && (
                          <div className="text-sm text-gray-500">{order.customer.email}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No customer data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{order.customer?.phone || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span>{getCourierDisplayName(order.carrier)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {order.tracking_number || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={getStageColor(order.stage || '')}
                    >
                      {order.stage === 'delivered' ? 'Delivered' : 'Shipped'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">₹{order.total_amount}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompletedOrdersList;
