
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Package, 
  CheckCircle, 
  Truck, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DeliveryAnalyticsShopify: React.FC = () => {
  const { orders, loading } = useShopifyOrders();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Calculate analytics from Shopify orders
  const totalOrders = orders.length;
  const fulfilledOrders = orders.filter(order => order.fulfillment_status === 'fulfilled').length;
  const partiallyFulfilledOrders = orders.filter(order => order.fulfillment_status === 'partial').length;
  const unfulfilledOrders = orders.filter(order => order.fulfillment_status === 'unfulfilled').length;
  const paidOrders = orders.filter(order => order.financial_status === 'paid').length;
  
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fulfillmentRate = totalOrders > 0 ? ((fulfilledOrders + partiallyFulfilledOrders) / totalOrders) * 100 : 0;

  const statusData = [
    { name: 'Fulfilled', value: fulfilledOrders, color: '#10B981' },
    { name: 'Partial', value: partiallyFulfilledOrders, color: '#F59E0B' },
    { name: 'Unfulfilled', value: unfulfilledOrders, color: '#EF4444' },
  ];

  // Group orders by date for trend analysis
  const ordersByDate = orders.reduce((acc, order) => {
    const date = new Date(order.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, orders: 0, revenue: 0 };
    }
    acc[date].orders += 1;
    acc[date].revenue += parseFloat(order.total_amount || '0');
    return acc;
  }, {} as Record<string, { date: string; orders: number; revenue: number }>);

  const trendData = Object.values(ordersByDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7); // Last 7 days

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Analytics</h3>
        <Badge variant="outline" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          Based on Shopify data
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Fulfilled</p>
                <p className="text-2xl font-bold">{fulfilledOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Fulfillment Rate</p>
                <p className="text-2xl font-bold">{fulfillmentRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData.filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value: any, name: string) => [value, name === 'orders' ? 'Orders' : 'Revenue ($)']}
                  />
                  <Bar dataKey="orders" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <BarChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No trend data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                ${averageOrderValue.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Average Order Value</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {paidOrders}
              </div>
              <p className="text-sm text-gray-600">Paid Orders</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {partiallyFulfilledOrders}
              </div>
              <p className="text-sm text-gray-600">Partial Fulfillments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryAnalyticsShopify;
