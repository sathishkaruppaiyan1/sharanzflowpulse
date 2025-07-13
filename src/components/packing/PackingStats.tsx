
import React from 'react';
import { Package, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/database';

interface PackingStatsProps {
  orders: Order[];
}

const PackingStats = ({ orders }: PackingStatsProps) => {
  const todaysOrders = orders.filter(order => 
    new Date(order.created_at).toDateString() === new Date().toDateString()
  );
  
  const urgentOrders = orders.filter(order => {
    const createdDate = new Date(order.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated > 48;
  });

  const totalItems = orders.reduce((sum, order) => sum + order.order_items.length, 0);
  const packedItems = orders.reduce((sum, order) => 
    sum + order.order_items.filter(item => item.packed).length, 0
  );

  // Calculate today's packed orders
  const todayPackedOrders = orders.filter(order => {
    if (!order.packed_at) return false;
    return new Date(order.packed_at).toDateString() === new Date().toDateString();
  });

  // Calculate completion rate
  const completionRate = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Packing Queue</CardTitle>
          <Package className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{orders.length}</div>
          <CardDescription className="text-xs text-gray-500 mt-1">
            orders ready to pack
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Today's Orders</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{todaysOrders.length}</div>
          <CardDescription className="text-xs text-gray-500 mt-1">
            received today
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Today Packed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{todayPackedOrders.length}</div>
          <CardDescription className="text-xs text-gray-500 mt-1">
            completed today
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Items Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-2xl font-bold text-purple-600">{completionRate}%</div>
          <CardDescription className="text-xs text-gray-500 mt-1">
            {packedItems}/{totalItems} items packed
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm col-span-2 sm:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Urgent Orders</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-2xl font-bold text-red-600">{urgentOrders.length}</div>
          <CardDescription className="text-xs text-gray-500 mt-1">
            over 48h old
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackingStats;
