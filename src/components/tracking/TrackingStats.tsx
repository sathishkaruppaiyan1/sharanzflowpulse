
import React from 'react';
import { Truck, Package, MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/database';

interface TrackingStatsProps {
  orders: Order[];
}

const TrackingStats = ({ orders }: TrackingStatsProps) => {
  const readyToShip = orders.filter(order => 
    order.order_items.every(item => item.packed) && !order.tracking_number
  );
  
  const awaitingPickup = orders.filter(order => 
    order.tracking_number && order.stage === 'tracking'
  );
  
  // Only show orders shipped today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const shippedToday = orders.filter(order => {
    if (order.stage !== 'shipped' || !order.shipped_at) return false;
    
    const shippedDate = new Date(order.shipped_at);
    return shippedDate >= today && shippedDate < tomorrow;
  });
  
  const urgentOrders = orders.filter(order => {
    const createdDate = new Date(order.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated > 72 && !order.tracking_number;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{readyToShip.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            fully packed orders
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Awaiting Pickup</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{awaitingPickup.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            with tracking numbers
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shipped Today</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{shippedToday.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            shipped today
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{urgentOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            over 72h old
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackingStats;
