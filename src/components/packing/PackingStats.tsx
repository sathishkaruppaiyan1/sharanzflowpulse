
import React from 'react';
import { Package, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/database';

interface PackingStatsProps {
  orders: Order[];
}

const PackingStats = ({ orders }: PackingStatsProps) => {
  console.log('PackingStats orders:', orders?.length || 0, 'orders received');
  
  const todaysOrders = orders?.filter(order => 
    new Date(order.created_at).toDateString() === new Date().toDateString()
  ) || [];
  
  const urgentOrders = orders?.filter(order => {
    const createdDate = new Date(order.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated > 48;
  }) || [];

  // Calculate total items correctly
  const totalItems = orders?.reduce((sum, order) => {
    const orderItemCount = order.order_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0;
    console.log(`Order ${order.order_number}: ${orderItemCount} total items`);
    return sum + orderItemCount;
  }, 0) || 0;

  const packedItems = orders?.reduce((sum, order) => {
    const orderPackedCount = order.order_items?.reduce((itemSum, item) => {
      const packedQty = item.packed ? (item.quantity || 0) : 0;
      return itemSum + packedQty;
    }, 0) || 0;
    console.log(`Order ${order.order_number}: ${orderPackedCount} packed items`);
    return sum + orderPackedCount;
  }, 0) || 0;

  // Calculate today's packed orders
  const todayPackedOrders = orders?.filter(order => {
    if (!order.packed_at) return false;
    return new Date(order.packed_at).toDateString() === new Date().toDateString();
  }) || [];

  // Calculate completion rate
  const completionRate = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  console.log('PackingStats calculated:', {
    totalOrders: orders?.length || 0,
    totalItems,
    packedItems,
    completionRate,
    todaysOrders: todaysOrders.length,
    urgentOrders: urgentOrders.length
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Packing Queue</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{orders?.length || 0}</div>
          <CardDescription className="text-xs text-muted-foreground">
            orders ready to pack
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todaysOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            received today
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today Packed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{todayPackedOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            completed today
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <CardDescription className="text-xs text-muted-foreground">
            {packedItems}/{totalItems} items packed
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{urgentOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            over 48h old
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackingStats;
